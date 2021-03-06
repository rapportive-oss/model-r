/*jslint nomen: false*/
/*global lib, _, jQuery*/
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
        object[(object.jquery ? event_name : 'on' + lib.camelize(event_name))](handler);
        _public.onDestroy(function () {
            object[(object.jquery ? 'unbind' : 'removeHandler')](event_name, handler);
        });
    };

    // Create a destroyable sub-component that will be destroyed when the current component
    // is destroyed.
    _public.chainedDestroyable = function (destroyable) {
        _public.onDestroy(destroyable.triggerDestroy);
        return destroyable;
    };

    // Make the deferrable fail when the destroyable is destroyed.
    _public.chainedDeferrable = function (deferrable) {
        _public.onDestroy(deferrable.reject);
        return deferrable;
    };

    // Either chain a DOM node to the current destroyable, or create a new <div> that will
    // be destroyed when this destroyable is destroyed.
    _public.destroyableDiv = function (node) {
        node = node || jQuery('<div>');
        _public.onDestroy(function () {
            node.remove();
        });
        return node;
    };

    return _public;
};
