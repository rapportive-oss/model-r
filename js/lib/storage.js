/*jslint nomen: false*/
/*global lib, window, fsLog, _, jQuery*/

// A wrapper around localStorage that tries to make the size limit less painful.
//
// It does this by maintaining the invariant that if you do storage.setItem()
// in one browser session, storage.getItem() is guaranteed to return that item.
//
// It does not guarantee however that if you do storage.setItem() in one session
// that that value will be available in the next session.
//
// That said, if you can access one key in the next session, you will be able to
// access all the keys set after that one.
//
lib.storage = (function () {
    var _public = {}, _protected = {},

        localStorage = window.localStorage,

        workingStorage = {};

    // localStorage is our first port of call, but if it fails to work for some
    // reason (i.e. we're out of quota, or firefox has corrupted the data file)
    // we fall back to workingStorage, which is not persistant.
    // (obviously in the case of a corrupted data file, or no local storage at
    // all, then nothing is actually persistant at all).

    function handleStorageError(name, value, e, opts) {

        opts = jQuery.extend({
            on_quota_exceeded: function () {
                // By default retry once, but if that fails, fallback to using
                // workingStorage.
                _public.setItem(name, value, {
                    on_quota_exceeded: function () {
                        fsLog("Not writing " + name + " to localStorage: this value is too big.");
                    }
                });
            }
        }, opts);

        if (e && /QUOTA/.test(e.name)) {
            // If we hit a quota error, then we're going to continue hitting quota errors
            // for all time unless we do something drastic. So we empty localStorage, giving
            // us more room to play with.
            //
            // In order to isolate the current session from this (i.e. to maintain the invariant
            // that if you've just done .setItem(), .getItem() will return the value), we copy
            // everything into workingStorage.
            _(localStorage).each(function (value, name) {
                if (!workingStorage.hasOwnProperty(name)) {
                    workingStorage[name] = value;
                }
                delete localStorage[name];
            });

            opts.on_quota_exceeded();
        } else {
            // Assume localStorage is totally brokened.
            fsLog("Failed to write " + name + " to localStorage: " + e);
        }
    }

    _public.getItem = function (name) {
        if (!workingStorage.hasOwnProperty(name)) {
            try {
                workingStorage[name] = localStorage[name];
            } catch (e) {
                fsLog("Not reading " + name + " from localStorage: " + e);
                workingStorage[name] = null;
            }
        }
        return workingStorage[name];
    };

    _public.setItem = function (name, value, opts) {
        try {
            workingStorage[name] = value;
            localStorage[name] = value;
        } catch (e) {
            handleStorageError(name, value, e, opts);
        }
    };

    // allow testing other storage backends.
    _public.use = function (storage) {
        localStorage = storage;
    };

    return _public;
}());
