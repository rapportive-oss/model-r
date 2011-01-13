/*jslint nomen: false */
/*global _: false, lib: false */

// A collection of objects that are created by the klass function.
//
//  .build, used to create new instances in the collection (using klass().attributes),
//  .empty, used to empty the collection,
//  .each, used to iterate over the collection
//  .primary, returns the primary object in the collection
//
// It may one day provide facility for deleting and reordering items.
//
lib.model_collection = function (klass) {

    var _public = {}, _protected = {};

    _public.all = [];

    _public.empty = function () {
        _public.all = [];
    };

    _public.build = function (attributes) {
        var obj = klass();
        _public.all.push(obj);
        obj.attributes(attributes);
        return obj;
    };

    _public.each = function (callback) {
        _(_public.all).each(callback);
    };

    _public.setPrimary = function (id) {
        var primary = _(_public.all).detect(function (item) {
            return item.id === id;
        });

        if (!primary) {
            throw "Tried to set a primary that was not in this collection";
        }

        _public.all = [primary].concat(_(_public.all).without(primary));
        primary.triggerChange();
    };

    _public.__defineGetter__("primary", function () {
        return _public.all[0];
    });

    _public.unbuild = function () {
        return _(_public.all).map(function (item) {
            return item.unbuild();
        });
    };

    return _public;
};

// Given either a function (assumed to be a model class),
// or a list of attributes, return a model class.
function get_model_class(class_or_attributes) {
    if (_(class_or_attributes).isFunction()) {
        return class_or_attributes;
    } else {
        return lib.model.class_from_attributes(class_or_attributes);
    }
}

// A field is a named container for a typed attribute (where "typed" in
// this case means constructed by a specific model class).
//
// The contents of the field can be replaced by assigning attributes to it
// (which delegates to the model-classes build method), and reading the
// field will return the current attribute/model-instance.
//
// The type of the field is gleaned from the field_definitions, and may be
// specified either as a function, or as a list of attributes (from which
// an anonymous function will be created).
//
lib.field = function (_public, _protected, field_definitions) {
    _(field_definitions).each(function (class_or_attributes, field_name) {

        lib.model(_public, _protected, field_name);

        var klass = get_model_class(class_or_attributes);

        // The setter of a field is an alias for the build method of the class
        // it contains.
        _public.__defineSetter__(field_name, function (new_value) {

            // Allow assignment from an array so the distinction between multifields
            // and fields can be ignored when building.
            if (_(new_value).isArray() && new_value.length === 1) {
                new_value = new_value[0];
            }
            _public.attribute(field_name, klass.build(new_value).bindTo(_public, field_name));

            // Fields are serialized to arrays so that the distinction between multifields
            // and fields can be ignored when unbuilding.
            _public.attribute(field_name).unbuild = (function (_super) {
                return function () {
                    return [_super.apply(this, arguments)];
                };
            }(_public.attribute(field_name).unbuild));
        });
    });
};

// A multifield is a container for many attributes of a specific model-class.
//
// Each one is a model_collection, see there for a detailed API.
//
// Assigning an array to a multifield will build a new instance in the
// model_collection for each set of attributes in the array.
//
// The type of the field is gleaned from the field_definitions, and may be
// specified either as a function, or as a list of attributes (from which
// an anonymous function will be created).
//
lib.multifield = function (_public, _protected, field_definitions) {
    _(field_definitions).each(function (class_or_attributes, field_name) {

        lib.model(_public, _protected, field_name);

        _public[field_name] = lib.model_collection(get_model_class(class_or_attributes));

        _public.__defineSetter__(field_name, function (new_value) {
            _public[field_name].empty();
            _(new_value).each(function (new_object) {
                _public[field_name].build(new_object).bindTo(_public, field_name);
            });
        });
    });
};

