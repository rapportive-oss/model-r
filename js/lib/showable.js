lib.showable = function (_public, _protected, manager) {

    lib.model(_public, _protected, 'visible');
    lib.destroyable(_public, _protected);

    _public.visible = false;

    _public.show = function () {
        _public.visible = true;
        return _public;
    };

    _public.hide = function () {
        _public.visible = false;
        return _public;
    };

    _public.toggle = function () {
        _public.visible = arguments.length ? arguments[0] : !_public.visible;
        return _public;
    };

    _public.onDestroy(_public.hide);

    return _public;
};

// If you have a collection of mutually exclusive showables, this function will
// ensure that the correct ones are hidden when the correct others are shown.
// (aka. lib.thereShouldOnlyBeOne)
lib.showable.manager = function () {

    var _public = {}, visible = null;

    _public.manage = function (showable) {
        showable.wheneverEqual('visible', true, function () {
            if (visible && visible !== showable) {
                visible.hide();
            }
            visible = showable;
        });

        showable.wheneverEqual('visible', false, function () {
            if (showable === visible) {
                visible = null;
            }
        });
    };

    _(arguments).chain().flatten().each(_public.manage);

    return _public;
};
