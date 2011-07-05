/*jslint nomen: false, onevar: false */
/*global window: false, _: false, lib: false */

// lib.model(_public, _protected, attribute_name_one, attribute_name_two, ...)
// makes this object a model object with accessor methods for named attributes,
// events when attribute values change, etc.
//
lib.model = function (_public, _protected, declared_attributes) {
    _protected.attributes = _protected.attributes || {};

    // Event methods:
    // onChange(function () { ... }) and
    // triggerChange()
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
            _public.transactionalTrigger('change');
        });

        // Define getter/setter for the attribute.
        // See http://ejohn.org/blog/javascript-getters-and-setters/
        //
        // So you can write (e.g.):
        //     person.name = "Bob";
        //     print(person.name);

        _public.__defineGetter__(name, function () {
            return _public.attribute(name);
        });
        _public.__defineSetter__(name, function (new_value) {
            return _public.attribute(name, new_value);
        });

        // Define delayed setter for the attribute. (see setAttributeLater)
        _public['set' + _(name).camelize() + 'Later'] = function (new_value) {
            _public.setAttributeLater(name, new_value);
        };
    });

    // With one argument, returns the value of the attribute with that name.
    // With two arguments, sets the attribute with the first argument's name to the second argument.
    _public.attribute = function (name, new_value) {
        if ((typeof(new_value) !== 'undefined') && (new_value !== _protected.attributes[name])) {
            _protected.attributes[name] = new_value;
            _public.transactionalTrigger(name + '_change', new_value);
        }
        return _protected.attributes[name];
    };

    // With no arguments, returns a hash of attributes. (Please don't modify it!)
    // With one argument (a hash), bulk-assigns the attributes given in the hash, and
    // doesn't modify attributes not mentioned in the hash.
    _public.attributes = function (new_attributes) {
        return _public.transaction(function () {
            if (typeof(new_attributes) !== 'undefined') {
                for (var attribute in new_attributes) {
                    if (new_attributes.hasOwnProperty(attribute)) {
                        _public[attribute] = new_attributes[attribute];
                    }
                }
            }
            return _protected.attributes;
        });
    };

    _public.unbuild = function () {
        var obj = {};
        _(_protected.attributes).each(function (attr, name) {
            obj[name] = _(attr.unbuild).isFunction() ? attr.unbuild() : attr;
        });
        return obj;
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

    // Make modifications to the model "atomically". Any listeners will
    // not get notified until after the modifications are complete.
    //
    // This is used by .attributes(), to ensure that when callbacks get
    // fired, the model is in a consistent state on each callback.
    //
    // TODO: We could improve this mechanism to be correctly re-entrant.
    _public.transaction = function (func) {
        if (!_protected.transaction_queue) {
            _protected.transaction_queue = [];
        }
        var ret = func();

        while (_protected.transaction_queue.length) {
            // .splice(0) takes a copy of the contents of the array
            // and empties the array. If anything else does a transactionalTrigger
            // within these callbacks, it'll be added to the emptied _protected.transaction_queue.
            _(_protected.transaction_queue.splice(0)).invoke('call');
        }

        _protected.transaction_queue = null;

        // This happens outside of the transaction so that we can guarantee it happens
        // once (and only once) per transaction. (Otherwise we'd have to run this multiple
        // times in the same transaction if the onChange handlers also triggered changes).
        if (_protected.transaction_triggered_change) {
            _protected.transaction_triggered_change = false;
            _public.triggerChange();
        }
        return ret;
    };

    // Like .trigger(), but if there are transactions in process,
    // defer the triggering until after it completes.
    _public.transactionalTrigger = function () {
        var thiz =  this,
            args = arguments;

        if (_protected.transaction_queue) {
            // We want to debounce the onChange handler within a transaction, though
            // we don't want to debounce other on*Change events.
            if (args[0] === 'change') {
                _protected.transaction_triggered_change = true;
            } else {
                _protected.transaction_queue.push(function () {
                    _public.trigger.apply(thiz, args);
                });
            }
        } else {
            _public.trigger.apply(thiz, args);

        }
    };

    // If a model wants to support deep cloning, it can call cloneable, passing the
    // model's constructor function (which will be used to create cloned instances).
    // This generates a public clone() method on the model.
    _protected.cloneable = function (model_class) {

        // Keep track of original objects and their clones. Because JavaScript coerces
        // all object keys to be strings, this uses an array of [original, clone] pairs
        // which needs to be scanned linearly. Oh noes, O(n^2) badness! :(
        var clone_cache;

        function deepClone(thing) {
            if (typeof(thing) !== 'object' || thing === null) {
                return thing;
            }
            if (_(thing).isArray()) {
                return _(thing).map(deepClone);
            }

            // 'thing' is an object, but not an array. First try the cache, to resolve circular references.
            var cached = _(clone_cache).detect(function (pair) {
                return pair[0] === thing;
            });
            if (cached) {
                return cached[1];
            }

            // Nothing in the cache. Actually clone the thing.
            var clone;
            if (typeof(thing.clone) === 'function') {
                clone = thing.clone({clone_cache: clone_cache});
            } else {
                clone = {};
                clone_cache.push([thing, clone]);

                _(thing).each(function (attr, name) {
                    clone[name] = deepClone(attr);
                });
            }
            return clone;
        }

        _public.clone = function (options) {
            var clone = model_class();
            clone_cache = options && options.clone_cache || [];
            clone_cache.push([_public, clone]);
            _(_protected.attributes).each(function (attr, name) {
                clone[name] = deepClone(attr);
            });
            return clone;
        };
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
lib.model.build = function (attributes) {
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

// These are like normal fields except that object eqaulity is used instead
// of exact equality to decide whether or not to fire a change event.
lib.model.object_fields = function (_public, _protected, declared_attributes) {
    lib.model.apply(lib.model, arguments);
    if (!_(declared_attributes).isArray()) {
        declared_attributes = _(arguments).toArray().slice(2);
    }

    _public.attribute = _.wrap(_public.attribute, function (_super, name, new_value) {
        if (_.include(declared_attributes, name) && typeof(new_value) !== 'undefined' && _.isEqual(new_value, _super(name))) {
            return _super(name);
        }
        return _super(name, new_value);
    });
};
