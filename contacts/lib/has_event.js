// Mixin which gives an object event handling capabilities. Call
// lib.hasEvent(_public, _protected, 'foo') to generate two methods for this event:
// onFoo(), which takes a handler to be called when the event is triggered, and
// triggerFoo(), which triggers the event. Any arguments passed to triggerFoo()
// are passed through to the event handlers.
//
// This mixin also creates general methods on() and trigger(), which behave
// like the methods above, but take an event name as their first argument.
lib.hasEvent = function (_public, _protected, event_name) {

    _protected.event_handlers = _protected.event_handlers || {};
    _protected.event_handlers[event_name] = _protected.event_handlers[event_name] || [];

    var handlers = _protected.event_handlers[event_name];

    // Register a new event handler for an arbitrary event name.
    _public.on = _public.on || function (name, handler) {
        _protected.event_handlers[name] = _protected.event_handlers[name] || [];
        _protected.event_handlers[name].push(handler);
    };

    // Trigger the event handlers for an arbitrary event name.
    _public.trigger = _public.trigger || function (name) {
        var args = Array.prototype.slice.apply(arguments).slice(1), that = this;

        if (_protected.event_handlers.hasOwnProperty(name)) {
            _(_protected.event_handlers[name]).each(function (handler) {
                handler.apply(that, args);
            });
        }
    };

    // Register a new event handler for this specific event.
    _public['on' + event_name.camelize()] = function (handler) {
        handlers.push(handler);
    };

    // Trigger the event handlers for this specific event.
    _public['trigger' + event_name.camelize()] = function () {
        var args = arguments, that = this;
        _(handlers).each(function (handler) {
            handler.apply(that, args);
        });
    };
};
