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

        // Define getter/setter method for the attribute. (jQuery style: getter
        // when called with no arguments, setter when called with one argument.)
        _public[name.camelize(true)] = function (new_value) {
            return _public.attribute(name, new_value);
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

    return _public;
};
