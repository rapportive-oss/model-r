/*jslint nomen: false */
/*global _: false, $: false, lib: false */

// TODO docs
lib.component = (function () {

    var last_id = 0;
    function freshId() {
        last_id += 1;
        return last_id;
    }

    // fields and component_helpers default to {}
    return function component(_public, _protected, component_type, fields, component_helpers) {
        // TODO this template is the same for every component, but we compile
        // it once for each component because compileScriptTag depends on the
        // script tags in the DOM, which may not be rendered at the time when
        // lib.component is declared.  Find a way to make this better.
        var container_template = lib.template.compileScriptTag("component-container");

        lib.hasEvent(_public, _protected, 'before_redraw', 'after_redraw', 'before_destroy');
        // nicer function names for before/after events - onAfterRedraw is yucky
        _public.beforeRedraw = _public.onBeforeRedraw;
        _public.afterRedraw = _public.onAfterRedraw;
        _public.beforeDestroy = _public.onBeforeDestroy;

        function element() {
            // XXX evil dependency on $ and window.document
            return $("#" + _public.id);
        }

        function redraw() {
            var elem = element.call(_public);
            _public.triggerBeforeRedraw(elem);
            elem.html(_public.content());
            _public.triggerAfterRedraw(elem);
        }

        if (!_public.id) {
            _public.id = 'c' + freshId();
            _public.component_type = component_type;
            _public.render = _(container_template).bind(null, _public);
            _public.element = element;
            _public.redraw = redraw;
        }

        if (_protected.fields) {
            _(_protected.fields).each(function (field) {
                field.triggerBeforeDestroy();
            });
        }

        _protected.fields = fields || {};
        _protected.component_helpers = _protected.component_helpers || component_helpers || {};

        _protected.field_helpers = {};

        // Set up field helpers in the component_helpers hash, and also
        // provide them via _protected.field_helpers in case a component
        // wrote its own content() function and wants to pass custom helpers.
        _(_protected.fields).each(function (field, name) {
            _protected.component_helpers[name + "_field"] = field.render;
            _protected.field_helpers[name + "_field"] = field.render;
        });

        // Redraw contained fields after redrawing this component
        if (!_protected.recursiveRedraw) {
            _protected.recursiveRedraw = function (elem) {
                _(_protected.fields).each(function (field) {
                    field.redraw();
                });
            };
            _public.afterRedraw(_protected.recursiveRedraw);
        }

        _public.beforeDestroy(function () {
            _(_protected.fields).each(function (field) {
                field.triggerBeforeDestroy();
            });
        });

        // Encode some conventions as utility functions, so the common case is
        // easier

        // If there's a template in a script tag whose name is equal to this
        // component's component_type, then save the component from having to
        // implement a boilerplate content() function.  (Can still override it
        // if you need to do anything clever.)
        //
        // Also provide convenient access to that template via
        // _protected.componentTemplate.
        _protected.compileComponentTemplate = function () {
            return lib.template.compileScriptTag(_public.component_type);
        };
        _protected.__defineGetter__('componentTemplate', function () {
            if (_protected._componentTemplate === undefined) {
                _protected._componentTemplate = _protected.compileComponentTemplate();
            }
            return _protected._componentTemplate;
        });
        _public.content = function content() {
            return _protected.componentTemplate(
                    _public,
                    _protected.component_helpers);
        };
    };
}());
