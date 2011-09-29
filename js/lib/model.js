/*jslint onevar: false */
/*global window */

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
            return _protected.attributes[name];
        });
        _public.__defineSetter__(name, function (new_value) {
            return _protected.setAttribute(name, new_value, new_value !== _public[name]);
        });

        // Define delayed setter for the attribute. (see setAttributeLater)
        _public['set' + _(name).camelize() + 'Later'] = function (new_value) {
            _public.setAttributeLater(name, new_value);
        };
    });

    // Set the attribute with the given name to the given value, and trigger the change
    // event if required.
    _protected.setAttribute = function (name, new_value, trigger_change) {
        _protected.attributes[name] = new_value;
        if (trigger_change) {
            _public.transactionalTrigger(name + '_change', new_value);
        }
    };

    // With no arguments, returns a clone of the current attributes hash.
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
            return _.clone(_protected.attributes);
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
            _public[name] = new_value;
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

    // If the attribute with name `name` currently has a value of `expected_value`, calls the
    // callback immediately; otherwise waits until the attribute is set to that value, and then
    // calls the callback once. Doesn't call the callback more than once.
    _public.whenEqual = function (name, expected_value, callback) {
        if (_public[name] === expected_value) {
            callback.call(_public);
        } else {
            _protected.when_equal = _protected.when_equal || {};
            if (_protected.when_equal[name]) {
                _protected.when_equal[name].push({expected_value: expected_value, callback: callback});
            } else {
                _protected.when_equal[name] = [{expected_value: expected_value, callback: callback}];

                _public.on(name + '_change', function (new_value) {
                    _protected.when_equal[name] = _(_protected.when_equal[name]).reject(function (item) {
                        if (item.expected_value === new_value) {
                            item.callback.call(_public);
                            return true;
                        }
                    });
                });
            }
        }
        return _public;
    };

    // If the attribute with name `name` currently has a value of `expected_value`, calls the
    // callback immediately. Whenever in future the attribute is changed from something else to
    // `expected_value`, the callback is called again.
    _public.wheneverEqual = function (name, expected_value, callback) {
        return _public.nowAndOn(name + '_change', function () {
            if (_public[name] === expected_value) {
                callback.call(_public);
            }
        });
    };

    // Make modifications to the model in isolation. Any listeners will
    // not get notified until after the modifications are complete.
    //
    // On the assumption you don't raise an exception, this makes the changes
    // appear atomically and consistently (due to javascript's single-threaded-ness).
    //
    // This is used by .attributes(), to ensure that when callbacks get
    // fired, the model is in a consistent state on each callback.
    //
    _public.transaction = function (func) {
        // If we're already in a transaction, then we'll just run func()
        // straightaway, any transactionalTriggers will be fired at the
        // end of the existing transaction.
        if (_protected.transaction_queue) {
            return func();
        }

        _protected.transaction_queue = [];
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

// Override the equality checking (by default ===) that is used to decide
// whether or not to trigger a change event when a model's property is assigned to.
// This is particular useful in the case of _.isEqual, which gives you deep object
// equality, though other functions are possible (see lib.timestamps for example).
//
// NOTE: An equivalence relation should be *symmetric* *reflexive* and *transitive*,
// other kinds of function will confuse people.
lib.model.usingEquality = function (isEqual) {
    return function (_public, _protected, declared_attributes) {
        lib.model.apply(lib.model, arguments);

        if (!_(declared_attributes).isArray()) {
            declared_attributes = _(arguments).toArray().slice(2);
        }

        _(declared_attributes).each(function (name) {
            _public.__defineSetter__(name, function (new_value) {
                return _protected.setAttribute(name, new_value, !isEqual(new_value, _public[name]));
            });

            _public[_.camelize(name, true) + 'Equals'] = function (other_value) {
                return isEqual(_public[name], other_value);
            };
        });
    };
};
