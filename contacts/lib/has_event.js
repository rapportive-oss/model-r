function hasEvent(_public, _protected, event_name) {
    var handlers = [];
    var capitalized = event_name.charAt(0).toUpperCase() + event_name.slice(1);

    _public['on' + capitalized] = function (handler) {
        handlers.push(handler);
    };

    _public['trigger' + capitalized] = function () {
        var args = arguments, that = this;
        _(handlers).each(function (handler) {
            handler.apply(that, args);
        });
    };
}
