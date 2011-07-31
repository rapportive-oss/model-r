/*jslint nomen: false, onevar: false */
/*global lib, _ */

// Augments _public to add date & timestamp helper getter properties for the specified declared_attributes.
// NOTE: Those attributes must be unix timestamps for the getters to function.
//
// For example, calling:
// lib.times(_public, _protected, 'due_at')
// adds these properties to _public:
// due_at                 - returns a Javascript date object
// due_at_millis          - returns Javascript-friendly milliseconds-since-the-epoch
// due_at_seconds         - returns Ruby-friedly seconds-since-the-epoch
// due_at_iso8601         - an ISO8601-complaint string, eg. 2011-04-23T0623
//
// TODO: should this be automatic for any model attributes with a key ending in _at?
lib.timestamps = function (_public, _protected, declared_attributes) {

    var options = {};

    // Allow either lib.times(_p, _p, ['a','b','c']);
    //           or lib.times(_p, _p, 'a', 'b', 'c');
    //
    // The latter is more pleasant to interact with as a human,
    // the former is better for automated interaction.
    if (!_(declared_attributes).isArray()) {
        declared_attributes = _(arguments).toArray().slice(2);
    }

    if (!_.isString(_(declared_attributes).last())) {
        options = declared_attributes.pop();
    }

    function valueWithGranularity(date) {
        return date.getTime() - date.getTime() % (options.granularity || 1);
    }

    // Add helper getters for each attribute, they chain off each other
    _(declared_attributes).each(function (key) {

        _public.__defineSetter__(key, function (value) {
            var old_value = _public[key];

            if (value && !value.getTime) {
                throw "Tried to assign a non-date to a date field! maybe you meant " + key + "_seconds, or " + key + "_millis=";
            }

            // Ensure that setting a similar timestamp doesn't trigger change-handlers.
            if (value && old_value) {

                if (valueWithGranularity(old_value) !== valueWithGranularity(value)) {
                    _public.attribute(key, value);
                } else {
                    old_value.setTime(value);
                }

            } else {
                _public.attribute(key, value);
            }
        });

        _public.__defineGetter__(key + "_millis", function () {
            return _public[key] && _public[key].getTime();
        });

        _public.__defineSetter__(key + "_millis", function (value) {
            _public[key] = value ? new Date(value) : undefined;
        });

        _public.__defineGetter__(key + "_seconds", function () {
            return _public[key + "_millis"] && parseInt(_public[key + "_millis"] / 1000, 10);
        });

        _public.__defineSetter__(key + "_seconds", function (value) {
            _public[key + "_millis"] = value ? value * 1000 : undefined;
        });

        _public.__defineGetter__(key + "_iso8601", function () {
            var date = _public[key];
            if (date) {
                return date.toISOString().replace(/:\d\d\.\d\d\dZ/, "")
                                         .replace(/:/g, ""); // HACK, emails can haz no colons. still valid iso.
            } else {
                return null;
            }
        });
    });

};
