/**
 * A fillable model is one that can fill itself from a JSON document,
 * but wants to use sub-models instead of just plain objects to store data.
 *
 * At it's simplest, it is a drop-in replacement for lib.model, but it also
 * provides a .refill method (which acts the same way as .attributes).
 *
 *    lib.fillable(_public, _protected, 'profile_url', 'site_name')({
 *        profile_url: 'http://facebook.com/',
 *        site_name: 'Facebook'
 *    });
 *
 * At the next level up, it can provide an implementation for .refill itself:
 *
 *    lib.model(_public, _protected, 'value');
 *    lib.fillable(_public, _protected, function (name) {
 *        _public.value = name;
 *    })('George');
 *
 * The most useful way of using it, is for the auto-generated .refill method:
 *
 *    lib.fillable(_public, _protected, {
 *        'memberships': [models.membership],
 *        'name': models.name
 *    })({
 *        memberships: [{site_name: 'Facebook', profile_url: 'http://facebook.com/'}],
 *        name: 'George'
 *    });
 *
 * Now, when you assign a JSON document, the properties of the objects will have been
 * coerced using the constructors you passed in the specification object.
 *
 * NOTE: When you specify that a property takes an array of objects, the .identity property
 * of those objects will be used to detect which objects have not changed during a refill.
 */

/*jslint nomen: false */
/*global lib, _ */
lib.fillable = function (_public, _protected, spec /*, arguments */) {

    var remaining_arguments = _.toArray(arguments).slice(3);

    /**
     * Given a new_array of JSON data, and an old_array of models,
     * create an array of models re-using the models from the old_array
     * where the identities match, preserving the order of the new_array,
     * and creating any missing objects using the constructor.
     */
    function mergeSetOfObjects(old_array, new_array, constructor) {
        return _(new_array).map(function (data) {
            var new_object = constructor.apply(this, remaining_arguments.concat([data])),
                existing = _(old_array || []).detect(function (old) {
                    return old.identity && old.identity === new_object.identity;
                });
            if (existing) {
                (existing.refill || existing.attributes)(data);
                return existing;
            } else {
                return new_object;
            }
        });
    }

    // If constructable is called with arguments like lib.model, then we
    // use .attributes as .refill, assuming all attributes are supposed to
    // be un-endowed objects.
    if (!spec || _.isArray(spec) || typeof(spec) === 'string') {
        lib.model.apply(this, arguments);
        _public.refill = _public.attributes;

    // If the user has provided an implementation for refill then we'll use
    // that, passing any remaining arguments on to the lib.model mixin.
    } else if (_.isFunction(spec)) {
        lib.model.apply(this, [_public, _protected].concat(remaining_arguments));
        _public.refill = spec;

    // Now we assume the user has used fillable to provide the implementation of
    // refill for them. We parse their spec, and coerce arguments appropriately.
    } else {

        lib.model(_public, _protected, _(spec).keys());

        _public.refill = function (attributes) {
            _(attributes).each(function (value, name) {

                var filler = _public[name] && (_public[name].refill || _public[name].attributes);

                // Something model-like, let's re-fill the existing object.
                if (typeof filler === 'function') {
                    filler.call(_public[name], value);

                // Nothing model-like present already, try making something new.
                } else if (_.isFunction(spec[name])) {
                    _public[name] = spec[name].apply(this, remaining_arguments.concat(value));

                // or lots of new things
                } else if (_.isArray(spec[name]) && _.isFunction(spec[name][0])) {
                    _public[name] = mergeSetOfObjects(_public[name], value, spec[name][0]);

                // Otherwise, just assign the value.
                } else if (typeof value !== 'undefined') {
                    _public[name] = value;

                }
            });

            _public.triggerChange(_public);
        };
    }

    return _public.refill;
};
