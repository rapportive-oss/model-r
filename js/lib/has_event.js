/*jslint onevar: false, nomen: false */
/*global lib, _ */

// Mixin which gives an object event handling capabilities. Call
// lib.hasEvent(_public, _protected, 'foo') to generate two methods for this event:
// onFoo(), which takes a handler to be called when the event is triggered, and
// triggerFoo(), which triggers the event. Any arguments passed to triggerFoo()
// are passed through to the event handlers.
//
// This mixin also creates general methods on() and trigger(), which behave
// like the methods above, but take an event name as their first argument.
lib.hasEvent = function (_public, _protected, event_names) {

    _protected.event_handlers = _protected.event_handlers || {};

    // Register a new event handler for an arbitrary event name.
    _public.on = _public.on || function (name, handler) {
        if (!_.isFunction(handler)) {
            throw new TypeError("Tried to bind " + name + " with non-function:" + String(handler));
        }
        _protected.event_handlers[name] = _protected.event_handlers[name] || [];
        _protected.event_handlers[name].push(handler);
        return _public;
    };

    _public.onceOn = _public.onceOn || function (name, handler) {
        if (!_.isFunction(handler)) {
            throw new TypeError("Tried to bind " + name + " with non-function:" + String(handler));
        }

        function onceHandler() {
            _public.removeHandler(name, onceHandler);
            return handler.apply(this, arguments);
        }
        return _public.on(name, onceHandler);
    };

    _public.nowAndOn = _public.nowAndOn || function (name, handler) {
        handler.apply(_public, _(arguments).toArray().slice(2));
        return _public["on" + lib.camelize(name)](handler);
    };

    _public.removeHandlers = _public.removeHandlers || function (name) {
        _protected.event_handlers[name] = [];
    };

    _public.removeHandler = _public.removeHandler || function (name, handler) {
        var handlers = _protected.event_handlers[name];
        if (!handlers) {
            return;
        }
        var index = handlers.indexOf(handler);
        if (index < 0) {
            return; // no such handler
        }
        return handlers.splice(index, 1)[0];
    };

    // Trigger the event handlers for an arbitrary event name.
    _public.trigger = _public.trigger || function (name) {
        var args = Array.prototype.slice.call(arguments, 1), that = this;

        if (_protected.event_handlers.hasOwnProperty(name)) {
            _(_protected.event_handlers[name]).chain().clone().each(function (handler) {
                handler.apply(that, args);
            });
        }

        return _public;
    };

    // Returns true if anything is currently listening for the named event, false otherwise.
    _public.hasHandlers = _public.hasHandlers || function (event_name) {
        return (_protected.event_handlers[event_name] || []).length > 0;
    };

    // Allow either lib.hasEvent(_p, _p, ['a', 'b', 'c']),
    //           or lib.hasEvent(_p, _p, 'a', 'b', 'c')
    if (!_(event_names).isArray()) {
        event_names = _(arguments).toArray().slice(2);
    }

    _(event_names).each(function (event_name) {

        _protected.event_handlers[event_name] = _protected.event_handlers[event_name] || [];

        // Register a new event handler for this specific event.
        _public['on' + lib.camelize(event_name)] = function (handler) {
            return _public.on(event_name, handler);
        };

        // Trigger the event handlers for this specific event.
        _public['trigger' + lib.camelize(event_name)] = function () {
            return _public.trigger.apply(this, [event_name].concat(_(arguments).toArray()));
        };
    });
};
