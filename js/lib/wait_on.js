/*jslint nomen: false, onevar: false */
/*global _: false, lib: false */

// Provides functionality to wait on a given property having a given value.
// This can be used for basic concurrency control. It guarantees that when
// a callback is called, the property has the expected value, but not that
// the callbacks will be called in the order they were queued.
//
lib.wait_on = function (_public, _protected) {

    if (_public.wait_on && _protected.waiting_on)  {
        return _public.wait_on;
    }

    _protected.waiting_on = _protected.waiting_on || {};
    var waiting_on = _protected.waiting_on;

    function wait_on(property, should_be, callback) {

        if (_public[property] === should_be) {
            callback();

        } else if (waiting_on[property]) {
            waiting_on[property][should_be] = waiting_on[property][should_be] || [];
            waiting_on[property][should_be].push(callback);

        } else {
            waiting_on[property] = {};
            waiting_on[property][should_be] = [callback];

            _public.on(property + '_change', function (new_value) {
                var todo = _(waiting_on[property]).andand()[new_value];
                if (todo) {
                    waiting_on[property][new_value] = [];
                    _(todo).each(function (callback) {
                        wait_on(property, new_value, callback);
                    });
                }
            });
        }
    }

    _public.wait_on = wait_on;
    return wait_on;
};
