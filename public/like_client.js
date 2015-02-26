var LikeClient = function() {
	var _ws;
	var _intervalId;
	var _actions = {};
	var _uidCookieName = "like_uid";
	var _uid = $.cookie(_uidCookieName) === undefined ? "0" : $.cookie(_uidCookieName);

	var _open = function() {
		_ws = new WebSocket(location.origin.replace(/^http/, 'ws'))
		_ws.onopen = _onopen;
		_ws.onmessage = _onmessage;
		_ws.onclose = _onclose;
		_ws.sendSafe = function(data) {
			try {
				this.send(data);
			} catch (e) {
				console.error(e);
			}
		};

		if (_intervalId !== undefined) {
			_intervalId = setInterval(function() {
				if (_ws.readyState !== _ws.OPEN) {
					_open();
				}
			}, 5000);
		}
	};
	var _onopen = function(event) {
		_status();
	};
	var _onmessage = function(event) {
		var message = JSON.parse(event.data);
		if (!message || !message.data || message.data.status !== "success") {
			console.error(message);
			return;
		}
		if (message.data.response && message.user && message.user.id) {
			_uid = message.user.id;
			$.cookie(_uidCookieName, _uid, { expires: 7 });
		}
		var action = message.action;
		var data = message.data;
		if (_actions[action] !== undefined && typeof _actions[action] === "function") {
			_actions[action](data);
		}
	};
	var _onclose = function(event) {
		console.log("connection closed. tring to reconnect.");
		setTimeout(_open, 5000);
	};
	var _status = function() {
		var data = {
			"action": "status",
			"user": {
				"id": _uid
			},
			"data": { }
		};
		_ws.sendSafe(JSON.stringify(data));
	};
	var _detail = function() {
		var data = {
			"action": "detail",
			"user": {
				"id": _uid
			},
			"data": { }
		};
		_ws.sendSafe(JSON.stringify(data));
	};
	var _like = function() {
		var data = {
			"action": "like",
			"user": {
				"id": _uid
			},
			"data": {}
		};
		_ws.sendSafe(JSON.stringify(data));
	}
	var _reset = function(pw) {
		var data = {
			"action": "reset",
			"user": {
				"id": _uid,
				"pw": pw
			},
			"data": {}
		};
		_ws.sendSafe(JSON.stringify(data));
	}
	var _setConfig = function(pw, config) {
		var data = {
			"action": "set_config",
			"user": {
				"id": _uid,
				"pw": pw
			},
			"data": JSON.parse(config)
		};
		_ws.sendSafe(JSON.stringify(data));
	}
	var _isSupport = function() {
		return typeof window.WebSocket !== "undefined"
	}

	return {
		"open": _open,
		"like": _like,
		"detail": _detail,
		"reset": _reset,
		"setConfig": _setConfig,
		"isSupport": _isSupport,
		"actions": _actions
	};
};
