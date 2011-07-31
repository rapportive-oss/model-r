/*jslint nomen: false, onevar: false */
/*global lib, _ */

// Augments _public to add date & timestamp helper getter properties for the specified declared_attributes.
// NOTE: Those attributes must be unix timestamps for the getters to function.
//
// For example, calling:
// lib.times(_public, _protected, 'due_at')
// adds these properties to _public:
// due_at                 - returns the original (unix seconds timestamp) as an integer
// due_at_timestamp_milli - returns Javascript-friendly milliseconds-since-the-epoch
// due_at_date            - returns a Javascript date object
// due_at_iso8601         - an ISO8601-complaint string, eg. 2011-04-23T0623
//
// TODO: should this be automatic for any model attributes with a key ending in _at?
lib.timestamps = function (_public, _protected, declared_attributes) {

    // Allow either lib.times(_p, _p, ['a','b','c']);
    //           or lib.times(_p, _p, 'a', 'b', 'c');
    //
    // The latter is more pleasant to interact with as a human,
    // the former is better for automated interaction.
    if (!_(declared_attributes).isArray()) {
        declared_attributes = _(arguments).toArray().slice(2);
    }

    // Add helper getters for each attribute, they chain off each other
    _(declared_attributes).each(function (key) {
        var timestamp_method = key + "_timestamp";
        _public.__defineGetter__(timestamp_method, function () {
            return parseInt(_public[key], 10);
        });
        
        var timestamp_milli_method = key + "_millis";
        _public.__defineGetter__(timestamp_milli_method, function () {
            var timestamp = _public[timestamp_method];
            if (timestamp) {
                return timestamp * 1000;
            } else {
                return null; 
            }
        });

        var date_method = key + "_date";
        _public.__defineGetter__(date_method, function () {
            var stamp = _public[timestamp_milli_method];
            if (stamp) {
                return new Date(stamp);
            } else {
                return null;
            }
        });

        _public.__defineGetter__(key + "_iso8601", function () {
            var date = _public[date_method];
            if (date) {
                return date.toISOString().replace(/:\d\d\.\d\d\dZ/, "")
                                         .replace(/:/g, ""); // HACK, emails can haz no colons. still valid iso.
            } else {
                return null;
            }
        });
    });

};
