/*global lib, JSON */
lib.saveable = function (_public, _protected, key) {
    if (!JSON) {
        throw new Error("JSON does not exist");
    }

    _public.save = function () {
        return lib.storage.setItem(key, JSON.stringify(_public.attributes()));
    };

    _public.fetch = function () {
        var data = lib.storage.getItem(key);
        if (data) {
            data = JSON.parse(data);
        }
        return data;
    };

    _public.loadWithDefaults = function (initialData) {
        var saved = _public.fetch();

        if (saved) {
            _public.attributes(saved);
        } else {
            _public.attributes(initialData);
            _public.save();
        }
    };

    // Only integrate and save the hash of 'timestampedData' if its fetched_at
    // property is a more recent (integer) timestamp than that which is already saved.
    _public.mergeNewest = function (timestampedData) {
        var saved = _public.fetch();

        if (!saved || !saved.fetched_at || saved.fetched_at < timestampedData.fetched_at) {
            _public.attributes(timestampedData);
            _public.save();
        } else {
            _public.attributes(saved);
        }
    };

    _public.clearStorage = function () {
        lib.storage.setItem(key, undefined);
    };

    return _public;
};
