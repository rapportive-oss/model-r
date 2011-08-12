/*jslint nomen: false*/
/*global lib*/
lib.showable = function (_public, _protected) {

    lib.model(_public, _protected, 'visible');
    lib.destroyable(_public, _protected);

    _public.visible = false;

    _public.show = function () {
        _public.visible = true;
    };

    _public.hide = function () {
        _public.visible = false;
    };

    _public.onDestroy(_public.hide);

    return _public;
};
