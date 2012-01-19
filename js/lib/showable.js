lib.showable = function (_public, _protected) {

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
