/*jslint nomen: false */
/*global lib, _ */

/* A wrapper for lib.hasEvent(_public, _protected, 'destroy') that
 * also provides a listenUntilDestroyed method for leak-avoiding handlers.
 */
lib.destroyable = function (_public, _protected) {
    lib.hasEvent(_public, _protected, 'destroy');

    // Listen on an event until this component is destroyed.
    // Works for both jQuery and model-R events
    //
    // This is necessary as if you don't do this, the sidebar cannot be garbage collected
    // correctly and your handlers will keep firing long after your DOM should have been
    // dismantled.
    _public.listenUntilDestroyed = function (object, event_name, handler) {
        // Use the pretty helpers so that typo-prone programmers get exceptions.
        object[(object.jquery ? event_name : 'on' + _.camelize(event_name))](handler);
        _public.onDestroy(function () {
            object[(object.jquery ? 'unbind' : 'removeHandler')](event_name, handler);
        });
    };
};
