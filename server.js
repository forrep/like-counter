LikeApp = (function(){
	var _idPrefix = "" + (new Date()).getTime() + "-";
	var _currentUid = 0;
	var _actions = {};
	var _likeUser = {};
	var _likeUserMap = {};
	var _likeTotal = 0;
	var _config = {
		"store_interval": 5000,
		"broadcast_timeout": 1200,
		"response_wait": 400
	};
	var _dbClient;
	var _dbInitiazlied = 0;

	var _initialize = function(chain) {
		var pg = require('pg');
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) {
				console.error("Cannot connect to database. Run without database mode.");
				console.error(err);
				chain();
				return;
			}
			_dbClient = client;
			_dbClient.query('select value from storage where key = \'like_user\'', function(err, result) {
				if (err) {
					console.error("Cannot retrieve data from database. Run without database mode.");
					console.error(err);
					chain();
					return;
				}
				if (result.rows.length <= 0) {
					console.error("Cannot retrieve data from database. Run without database mode.");
					chain();
					return;
				}
				var storedData = JSON.parse(result.rows[0].value);
				if (storedData) {
					_likeUser = storedData;
					Object.keys(storedData).forEach(function(key){
						_likeTotal += storedData[key];
					});
				}
				_dbInitiazlied = 1;
				chain();
			});
		});

	};
	var _storedTotal = -1;
	var _store = function() {
		if (_dbInitiazlied !== 1) {
			return;
		}
		if (_storedTotal === _likeTotal) {
			setTimeout(_store, _config.store_interval);
			return;
		}
		var storeData = {};
		Object.keys(_likeUser).forEach(function(key){
			if (_likeUser[key] > 0) {
				storeData[key] = _likeUser[key];
			}
		});
		_dbClient.query('update storage set value = $1 where key = \'like_user\'', [JSON.stringify(storeData)],function(err, result) {
			if (err) {
				console.error(err);
				return;
			}
			_storedTotal = _likeTotal;
			setTimeout(_store, _config.store_interval);
		});
	};

	var _decodeData = function(data) {
		var decodedData = JSON.parse(data);
		if (!decodedData || !decodedData.action || !decodedData.user || !decodedData.data) {
			return false;
		}
		return decodedData;
	};

	var _authorize = function(user) {
		if (user === undefined || typeof user.id !== "string" || user.id === "0" || user.id.indexOf(_idPrefix) !== 0) {
			var prevUser = user;
			user = {};
			user.id = _idPrefix + (++_currentUid);
			if (prevUser !== undefined && typeof prevUser.id === "string") {
				if (_likeUserMap.hasOwnProperty(prevUser.id)) {
					user.id = _likeUserMap[prevUser.id];
				}
				else if (prevUser.id.indexOf(_idPrefix) !== 0 && _likeUser.hasOwnProperty(prevUser.id)) {
					_likeUser[user.id] = _likeUser[prevUser.id];
					delete _likeUser[prevUser.id];
					_likeUserMap[prevUser.id] = user.id;
					_storedTotal = -1;
				}
			}
		}
		user.admin = (user.pw === process.env.ADMIN_PW) ? 1 : 0;
		if (!_likeUser.hasOwnProperty(user.id)) {
			_likeUser[user.id] = 0;
		}
		return user;
	};

	_actions.status = function(user, data, response, ws) {
		response.data.status = "success"
		response.data.total = _likeTotal;
		response.data.user = _likeUser[user.id];
	};
	_actions.detail = function(user, data, response, ws) {
		response.data.status = "success"
		response.data.total = _likeTotal;
		response.data.user = _likeUser[user.id];
		var users = 0;
		Object.keys(_likeUser).forEach(function(key){
			if (_likeUser[key] > 0) {
				++users;
			}
		});
		response.data.users = users;
		response.data.average = users <= 0 ? 0 : Math.floor(_likeTotal / users);
	};
	_actions.like = function(user, data, response, ws) {
		response.data.status = "success"
		response.data.total = ++_likeTotal;
		response.data.user = ++_likeUser[user.id];
		ws.broadcast(JSON.stringify({
			"action": "total_update",
			"data": {
				"status": "success",
				"total": _likeTotal
			}
		}));
	};
	_actions.reset = function(user, data, response, ws) {
		if (user.admin !== 1) {
			return;
		}
		response.data.status = "success"
		_likeUser = {};
		_likeTotal = 0;
		console.log("reset successful.");
		ws.broadcast(JSON.stringify({
			"action": "reset",
			"data": {
				"status": "success"
			}
		}));
	};
	_actions.set_config = function(user, data, response, ws) {
		if (user.admin !== 1) {
			return;
		}
		response.data.status = "success"
		console.log("set confi successful.");
		if (data.store_interval !== undefined) {
			_config.store_interval = data.store_interval;
		}
		if (data.broadcast_timeout !== undefined) {
			_config.broadcast_timeout = data.broadcast_timeout;
		}
		if (data.response_wait !== undefined) {
			_config.response_wait = data.response_wait;
		}
	};

	var _start = function(){
		_initialize(function() {
			var express = require('express');
			var _app = express();
			var http = require('http');
			_app.use(express.static(__dirname + '/public'));
			var _server = http.createServer(_app);
			_server.listen(process.env.PORT || 5000);
			console.log("http server running on %d", process.env.PORT || 5000);

			var WebSocketServer = require('ws').Server;
			var wss = new WebSocketServer({server: _server});
			var _broadcast = (function() {
				var sendStatus = 0; // 0:waiting 1:pendding
				var latestData;
				return (function(data) {
					latestData = data;
					if (sendStatus === 1) {
						return;
					}
					sendStatus = 1;
					setTimeout(function() {
						var clients = 0;
						var allClients = 0;
						wss.clients.forEach(function(client){
							allClients++;
							if (client) {
								clients++;
								try {
									client.send(latestData);
								} catch (e) {
									console.error(e);
								}
							}
						});
						sendStatus = 0;
						console.log("clients: " + clients + "/" + allClients);
					}, _config.broadcast_timeout);
				});
			})();
			wss.on('connection', function(ws) {
				ws.broadcast = _broadcast;
				ws.on('message', function(message) {
					var decodedData = _decodeData(message);
					if (!decodedData || !_actions[decodedData.action]) {
						return;
					}
					var user = _authorize(decodedData.user);
					var response = {
						"action": decodedData.action,
						"user": user,
						"data": {
							"status": "failed",
							"response": 1
						}
					};
					_actions[decodedData.action](user, decodedData.data, response, ws);
					setTimeout(function() {
						try {
							ws.send(JSON.stringify(response));
						} catch (e) {
							console.error(e)
						}
					}, _config.response_wait);
				});
			});

			_store();
		});
	};

	return {
		start : _start
	};
})();

LikeApp.start();
