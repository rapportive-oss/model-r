function hasEvent(_public, _protected, event_name) {
    var handlers = [];

    _public['on' + event_name.camelize()] = function (handler) {
        handlers.push(handler);
    };

    _public['trigger' + event_name.camelize()] = function () {
        var args = arguments, that = this;
        _(handlers).each(function (handler) {
            handler.apply(that, args);
        });
    };
}
