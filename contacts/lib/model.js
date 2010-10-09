// lib.model(_public, _protected, attribute_name_one, attribute_name_two, ...)
// makes this object a model object with accessor methods for named attributes,
// events when attribute values change, etc.
//
lib.model = function (_public, _protected, declared_attributes) {
    _protected.attributes = _protected.attributes || {};

    // Event methods:
    // onChange(function (attribute_name, new_value) { ... }) and
    // triggerChange(attribute_name, new_value)
    lib.hasEvent(_public, _protected, 'change');

    // Allow either lib.model(_p, _p, ['a','b','c']);
    //           or lib.model(_p, _p, 'a', 'b', 'c');
    //
    // The latter is more pleasant to interact with as a human,
    // the former is better for automated interaction.
    if (!_(declared_attributes).isArray()) {
        declared_attributes = _(arguments).toArray().slice(2);
    }

    _(declared_attributes).each(function (name) {
        // If attribute foo is declared, this generates the event methods:
        // onFooChange(function (new_value) { ... }) and
        // triggerFooChange(new_value)
        var change_event_name = name + '_change';
        lib.hasEvent(_public, _protected, change_event_name);
        _public.on(change_event_name, function (new_value) {
            _public.triggerChange(name, new_value);
        });

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
                    _public[attribute] = new_attributes[attribute];
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

    // Bind this model to a particular attribute event of a container model.
    // i.e. when a change event fires on this model, a change event will fire on the container's
    // attribute.
    _public.bindTo = function (parent, attribute) {
        _public.onChange(function () {
            parent.trigger(attribute + '_change', _public);
        });
        parent.trigger(attribute + '_change', _public);
        return _public;
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

// Given a list of attributes, create a simple model that contains them.
lib.model.class_from_attributes = function (attributes) {
    var klass = function () {
        var _public = {}, _protected = {};
        lib.model(_public, _protected, attributes);
        return _public;
    };
    klass.build = lib.model.build;
    return klass;
};
