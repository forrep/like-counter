var NumberAnimatedEffect = function(container, containerTrans, changeDelay, animationInterval) {
	var _container = container;
	var _containerTrans = containerTrans;
	var _startTime = 0;
	var _startCount = 0;
	var _endCount = 0;
	var _changeDelay = changeDelay;
	var _animationInterval = animationInterval;
	var _removeTimeout = 1500;
	var _active = 0;
	var _change = function(count) {
		if ((_container.text() - 0) === count) {
			return;
		}
		var trans = $('<div class="counter counter_trans">' + count + '</div>')
		_containerTrans.append(trans);
		_container.text(count);
		setTimeout(function() {
			trans.remove();
		}, _removeTimeout);
	}
	var _animate = function() {
		var currentTime = (new Date()).getTime();
		var currentCount = _container.text() - 0;
		var progress = currentTime - _startTime;
		if (progress < _changeDelay) {
			_change(_startCount + Math.ceil((_endCount - _startCount) * progress / _changeDelay));
			_active = 1;
			setTimeout(_animate, _animationInterval);
			return;
		}
		else {
			_active = 0;
		}
		_change(_endCount);
	}

	return function(count, noDelay) {
		if (noDelay) {
			_startTime = 0;
			_startCount = _endCount = count;
			_change(count);
			return;
		}
		_startTime = (new Date()).getTime();
		_startCount = _container.text() - 0;
		_endCount = count;
		if (_active === 0) {
			_animate();
		}
	};
};


var ViewManager = (function() {
	var _like;

	var _disableLike = function() {
		_like.attr("disabled", "true");
		_like.addClass("like_button_face_active");
		_like.children("span").css("display", "none");
		_like.find("div").css("display", "");
	};
	var _enableLike = function() {
		_like.removeAttr("disabled");
		_like.removeClass("like_button_face_active");
		_like.children("span").css("display", "");
		_like.find("div").css("display", "none");
	};
	return function(like) {
		_like = like;
		return {
			"disableLike": _disableLike,
			"enableLike": _enableLike
		};
	};
})();
