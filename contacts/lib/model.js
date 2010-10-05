// lib.model(_public, _protected, attribute_name_one, attribute_name_two, ...)
// makes this object a model object with accessor methods for named attributes,
// events when attribute values change, etc.
//
// TODO: figure out how to deal with nested collections
lib.model = function (_public, _protected) {
    _protected.attributes = _protected.attributes || {};

    // Event methods:
    // onChange(function (attribute_name, new_value) { ... }) and
    // triggerChange(attribute_name, new_value)
    lib.hasEvent(_public, _protected, 'change');

    var declared_attributes = Array.prototype.slice.apply(arguments).slice(2);

    _(declared_attributes).each(function (name) {
        // If attribute foo is declared, this generates the event methods:
        // onFooChange(function (new_value) { ... }) and
        // triggerFooChange(new_value)
        lib.hasEvent(_public, _protected, name + '_change');

        // Define getter/setter for the attribute.
        // See http://ejohn.org/blog/javascript-getters-and-setters/
        //
        // So you can write (e.g.):
        //     person.name = "Bob";
        //     print(person.name);

        _public.__defineGetter__(name, function() {
            return _public.attribute(name);
        });
        _public.__defineSetter__(name, function(new_value) {
            return _public.attribute(name, new_value);
        });

        // Define delayed setter for the attribute. (see setAttributeLater)
        _public['set' + name.camelize() + 'Later'] = function (new_value) {
            _public.setAttributeLater(name, new_value);
        };
    });

    // With one argument, returns the value of the attribute with that name.
    // With two arguments, sets the attribute with the first argument's name to the second argument.
    _public.attribute = function (name, new_value) {
        if ((typeof(new_value) !== 'undefined') && (new_value !== _protected.attributes[name])) {
            _protected.attributes[name] = new_value;
            _public.trigger(name + '_change', new_value);
            _public.triggerChange(name, new_value);
        }
        return _protected.attributes[name];
    };

    // With no arguments, returns a hash of attributes. (Please don't modify it!)
    // With one argument (a hash), bulk-assigns the attributes given in the hash, and
    // doesn't modify attributes not mentioned in the hash.
    _public.attributes = function (new_attributes) {
        if (typeof(new_attributes) !== 'undefined') {
            for (var attribute in new_attributes) {
                if (new_attributes.hasOwnProperty(attribute)) {
                    _public.attribute(attribute, new_attributes[attribute]);
                }
            }
        }
        return _protected.attributes;
    };

    // Sets the attribute with the first argument's name to the second argument, but delays
    // that action until the current call stack has completed. Useful if we want to trigger
    // a change of value eventually, but don't want it affecting other handlers of the event
    // currently being handled.
    _public.setAttributeLater = function (name, new_value) {
        window.setTimeout(function () {
            _public.attribute(name, new_value);
        }, 0);
    };

    return _public;
};

// Method to build a new instance of a model from an attributes hash.
//
// To use:
//     models.animal = function(...) {
//         ...
//         lib.model(..., 'name', 'species', 'legs');
//         ...
//     };
//     models.animal.build = lib.model.build;
//
//     var fido = models.animal.build({
//         name: "Fido",
//         species: "dog",
//         legs: 4});
lib.model.build = function(attributes) {
    var obj = this();
    obj.attributes(attributes);
    return obj;
};
