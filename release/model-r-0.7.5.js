/*** model-r-0.7.5.js ***/
/*jslint nomen: false*/
/*global lib, _, jQuery*/
/* A wrapper for lib.hasEvent(_public, _protected, 'destroy') that
 * also provides a listenUntilDestroyed method for leak-avoiding handlers.
 */
lib.destroyable = function (_public, _protected) {
    lib.hasEvent(_public, _protected, 'destroy');

    // Listen on an event until this component is destroyed.
    // Works for both jQuery and model-R events
    //
    // This is necessary as if you don't do this, the sidebar cannot be garbage collected
    // correctly and your handlers will keep firing long after your DOM should have been
    // dismantled.
    _public.listenUntilDestroyed = function (object, event_name, handler) {
        // Use the pretty helpers so that typo-prone programmers get exceptions.
        object[(object.jquery ? event_name : 'on' + lib.camelize(event_name))](handler);
        _public.onDestroy(function () {
            object[(object.jquery ? 'unbind' : 'removeHandler')](event_name, handler);
        });
    };

    // Create a destroyable sub-component that will be destroyed when the current component
    // is destroyed.
    _public.chainedDestroyable = function (destroyable) {
        _public.onDestroy(destroyable.triggerDestroy);
        return destroyable;
    };

    // Make the deferrable fail when the destroyable is destroyed.
    _public.chainedDeferrable = function (deferrable) {
        _public.onDestroy(deferrable.reject);
        return deferrable;
    };

    // Either chain a DOM node to the current destroyable, or create a new <div> that will
    // be destroyed when this destroyable is destroyed.
    _public.destroyableDiv = function (node) {
        node = node || jQuery('<div>');
        _public.onDestroy(function () {
            node.remove();
        });
        return node;
    };

    return _public;
};
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

lib.fillable = function (_public, _protected, spec) {

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

    // If fillable is called with arguments like lib.model, then we
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
            return _public.transaction(function () {
                _(attributes).each(function (value, name) {

                    var filler = _public[name] && (_public[name].refill || _public[name].attributes),
                        triggerer = function () {
                            _public.trigger(name + "_change", _public[name]);
                        };

                    // Something model-like, let's re-fill the existing object.
                    if (_.isFunction(filler)) {
                        _public[name].onChange(triggerer);
                        filler.call(_public[name], value);
                        _public[name].removeHandler(name + "_change", triggerer);

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
            });
        };
    }

    return _public.refill;
};
/*jslint onevar: false, nomen: false */
/*global lib, _, jQuery */

// Mixin which gives an object event handling capabilities. Call
// lib.hasEvent(_public, _protected, 'foo') to generate two methods for this event:
// onFoo(), which takes a handler to be called when the event is triggered, and
// triggerFoo(), which triggers the event. Any arguments passed to triggerFoo()
// are passed through to the event handlers.
//
// This mixin also creates general methods on() and trigger(), which behave
// like the methods above, but take an event name as their first argument.
lib.hasEvent = function (_public, _protected, event_names) {

    _protected.event_handlers = _protected.event_handlers || {};

    // Register a new event handler for an arbitrary event name.
    _public.on = _public.on || function (name, handler) {
        if (!_.isFunction(handler)) {
            throw new TypeError("Tried to bind " + name + " with non-function:" + String(handler));
        }
        _protected.event_handlers[name] = _protected.event_handlers[name] || [];
        _protected.event_handlers[name].push(handler);
        return _public;
    };

    _public.onceOn = _public.onceOn || function (name, handler) {
        if (!_.isFunction(handler)) {
            throw new TypeError("Tried to bind " + name + " with non-function:" + String(handler));
        }

        function onceHandler() {
            _public.removeHandler(name, onceHandler);
            return handler.apply(this, arguments);
        }
        return _public.on(name, onceHandler);
    };

    _public.nowAndOn = _public.nowAndOn || function (name, handler) {
        handler.apply(_public, _(arguments).toArray().slice(2));
        return _public["on" + lib.camelize(name)](handler);
    };

    _public.removeHandlers = _public.removeHandlers || function (name) {
        _protected.event_handlers[name] = [];
    };

    _public.removeHandler = _public.removeHandler || function (name, handler) {
        var handlers = _protected.event_handlers[name];
        if (!handlers) {
            return;
        }
        var index = handlers.indexOf(handler);
        if (index < 0) {
            return; // no such handler
        }
        return handlers.splice(index, 1)[0];
    };

    // Trigger the event handlers for an arbitrary event name.
    _public.trigger = _public.trigger || function (name) {
        var args = Array.prototype.slice.call(arguments, 1), that = this;

        if (_protected.event_handlers.hasOwnProperty(name)) {
            _(_protected.event_handlers[name]).chain().clone().each(function (handler) {
                handler.apply(that, args);
            });
        }

        return _public;
    };

    // Returns true if anything is currently listening for the named event, false otherwise.
    _public.hasHandlers = _public.hasHandlers || function (event_name) {
        return (_protected.event_handlers[event_name] || []).length > 0;
    };

    // Allow either lib.hasEvent(_p, _p, ['a', 'b', 'c']),
    //           or lib.hasEvent(_p, _p, 'a', 'b', 'c')
    if (!_(event_names).isArray()) {
        event_names = _(arguments).toArray().slice(2);
    }

    _(event_names).each(function (event_name) {

        _protected.event_handlers[event_name] = _protected.event_handlers[event_name] || [];

        // Register a new event handler for this specific event.
        _public['on' + lib.camelize(event_name)] = function (handler) {
            return _public.on(event_name, handler);
        };

        // Trigger the event handlers for this specific event.
        _public['trigger' + lib.camelize(event_name)] = function () {
            return _public.trigger.apply(this, [event_name].concat(_(arguments).toArray()));
        };
    });
};
/*jslint onevar: false, nomen: false */
/*global window, lib, _, jQuery */

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
            _public.transactionalTrigger('change', _public);
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
        _public['set' + lib.camelize(name) + 'Later'] = function (new_value) {
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
                var attribute;
                for (attribute in new_attributes) {
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
            _public.triggerChange(_public);
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

            _public[lib.camelize(name, true) + 'Equals'] = function (other_value) {
                return isEqual(_public[name], other_value);
            };
        });
    };
};
// Set up a bridge between Model-R and postmessage.
//
// The convention is that everything sent via post-message is a JSON-encoded object with a
// field called "action" which is used to determine which message was sent.
//
// So, if we receive '{"action":"complete","status":200}' from the iframe,
// that will get converted into _public.triggerComplete({action:"complete", // "status":200});
//
// Conversely, if you call _public.triggerSubmit({to_url:"http://rapportive.com/foo"})
// that will be sent to the iframe as // '{"action":"submit","to_url","http://rapportive.com/foo"}'
//
// opts is an object with:
// {
//   iframe|window: the iframe to send messages to and receive messages from
//   receive: [a list of actions we expect to receive],
//   send: [a list of actions we expect to send],
//   model: [a list of fields to copy around amoungst the frames]
//   remote_base_url: the url to send with postMessage to ensure it arrives at the correct domain
// }
//
// remote_base_url can be a function, in which case it is evaluated every time a message is sent.
// (useful if the destination URL cannot be determined at the time postMessageShim is declared).
lib.postMessageShim = function (_public, _protected, opts) {

    var other = opts.iframe || opts.window,
        debug = true;

    function sendMessage(msg) {
        if (debug) {
            console.log((opts.name || 'pmshim') + " SENT-->: " + JSON.stringify(msg));
        }
        $.message(other, msg, (_.isFunction(opts.remote_base_url) ? opts.remote_base_url() : opts.remote_base_url));
    }

    if (opts.model) {
        lib.model(_public, _protected, opts.model);

        opts.receive = (opts.receive || []).concat(_(opts.model).map(function (field) {
            return field + '_sync';
        }));

        _(opts.model).each(function (name) {
            var syncedValue;
            _public.on(name + '_sync', function (value) {
                syncedValue = value.value;
                _public[name] = value.value;
                syncedValue = undefined;
            });
            _public.on(name + '_change', function (value) {
                if (value !== syncedValue) {
                    sendMessage({action: name + '_sync', rapportive: true, value: value});
                }
            });
        });
    }

    if (opts.receive) {
        lib.hasEvent(_public, _protected, opts.receive);

        // TODO: make sure "rapportive:true" is being set on all messages.
        $.message(other, loggily("postmessageshim.message", function (msg, reply, e) {
            if (_(opts.receive).include(msg.action)) {
                if (debug) {
                    console.log((opts.name || 'pmshim') + " -->RECV: " + JSON.stringify(msg));
                }
                _public.trigger(msg.action, msg);
            } else if (msg.rapportive) {
                console.log((opts.name || 'pmshim') + " got unexpected postMessage: " + JSON.stringify(msg));
            }
        }));
    }

    if (opts.send) {
        lib.hasEvent(_public, _protected, opts.send);

        _(opts.send).each(function (name) {
            _public.on(name, function (msg) {
                sendMessage(jQuery.extend({action: name, rapportive: true}, msg));
            });
        });
    }

};
/*jslint onevar:false, regexp:false */
/*global components, window, document, navigator */

// An extraction/port of Backbone.Router & Backbone.history to components.router and components.history, respectively.
// Backbone.Router
// -------------------

// Routers map faux-URLs to actions, and fire events when routes are
// matched. Creating a new one sets its `routes` hash, if not set statically.
components.RapportiveRouter = function (options) {
    options = options || {};
    if (options.routes) {
        this.routes = options.routes;
    }
    this._bindRoutes();
};

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
var namedParam    = /:\w+/g;
var splatParam    = /\*\w+/g;
var escapeRegExp  = /[\-\[\]{}()+?.,\\\^$|#\s]/g;

// Set up all inheritable **Backbone.Router** properties and methods.
_.extend(components.RapportiveRouter.prototype, /*Events, */ {

    // Instead of #route(path, name, callback), we take name and callbacks in the 'options'
    reversible_route: function (route, options) {
        if (!_.isRegExp(route)) {
            route = this._routeToRegExp(route);
        }
        if (!options.enter) {
            throw "using reversible routing but no 'enter' function was specified.";
        }

        components.history.route(route, {
            enter: _.bind(function (fragment) {
                var args = this._extractParameters(route, fragment);
                options.enter.apply(this, args);
            }, this),

            exit: _.bind(function (exiting_from_fragment) {
                var args = this._extractParameters(route, exiting_from_fragment);
                options.exit.apply(this, args);
            }, this)
        });
        return this;
    },

    // Give us better flexibility on URL parts - URI decode values and allow
    // an underscore character to be used in lieu of a null/empty string.
    sanitizeUrlBit: function (bit) {
        if (!bit) {
            return bit;
        }
        bit = bit.trim();
        if (bit.length === 0 || bit === '_' || bit === encodeURIComponent('_')) {
            return null;
        }

        return decodeURIComponent(bit).replace(/\+/g, ' ');
    },

    routes_by_name: {},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function (route, name, callback) {
        this.routes_by_name[name] = route;

        if (!_.isRegExp(route)) {
            route = this._routeToRegExp(route);
        }

        if (!callback) {
            callback = this[name];
        }
        components.history.route(route, _.bind(function (fragment) {
            var args = this._extractParameters(route, fragment);
            var that = this;
            args = _(args).map(function (param) {
                return that.sanitizeUrlBit(param);
            });
            if (callback) {
                callback.apply(this, args);
            }
        }, this));
        return this;
    },

    // Simple proxy to `components.history` to save a fragment into the history.
    navigate: function (fragment, options) {
        components.history.navigate(fragment, options);
    },

    // Bind all defined routes to `components.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function () {
        if (!this.routes) {
            return;
        }
        var routes = [];
        for (var route in this.routes) {
            if (this.routes.hasOwnProperty(route)) {
                routes.unshift([route, this.routes[route]]);
            }
        }
        for (var i = 0, l = routes.length; i < l; i += 1) {
            this.route(routes[i][0], routes[i][1], this[routes[i][1]]);
        }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function (route) {
        route = route.replace(escapeRegExp, '\\$&')
            .replace(namedParam, '([^\/]+)')
            .replace(splatParam, '(.*?)');
        return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted parameters.
    _extractParameters: function (route, fragment) {
        return route.exec(fragment.toLowerCase()).slice(1);
    }

});


    // New routing functions that let us have an enter/exit pair of functions when setting
    // up Backbone routes.
    //
    // Requires a tiny monkey-patch to Backbone: the checkUrl function needs to save this._priorUrl



// Backbone.History
// ----------------

// Handles cross-browser history management, based on URL fragments. If the
// browser does not support `onhashchange`, falls back to polling.
var History = function () {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');
};

// Cached regex for cleaning leading hashes and slashes .
var routeStripper = /^[#\/]/;

// Cached regex for detecting MSIE.
var isExplorer = /msie [\w.]+/;

// Has the history handling already been started?
History.started = false;

// Set up all inheritable **Backbone.History** properties and methods.
_.extend(History.prototype, /*Events,*/ {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function (windowOverride) {
        var loc = windowOverride ? windowOverride.location : window.location;
        var match = loc.href.match(/#(.*)$/);
        return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function (fragment, forcePushState) {
        if (!fragment) {
            if (this._hasPushState || forcePushState) {
                fragment = window.location.pathname;
                var search = window.location.search;
                if (search) {
                    fragment += search;
                }
            } else {
                fragment = this.getHash();
            }
        }
        if (!fragment.indexOf(this.options.root)) {
            fragment = fragment.substr(this.options.root.length);
        }
        return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function (options) {
        if (History.started) {
            throw new Error("History has already been started");
        }
        History.started = true;

        // Figure out the initial configuration. Do we need an iframe?
        // Is pushState desired ... is it available?
        this.options          = _.extend({}, {root: '/'}, this.options, options);
        this._wantsHashChange = this.options.hashChange !== false;
        this._wantsPushState  = !!this.options.pushState;
        this._hasPushState    = !!(this.options.pushState && window.history && window.history.pushState);
        var fragment          = this.getFragment();
        var docMode           = document.documentMode;

        // Depending on whether we're using pushState or hashes, and whether
        // 'onhashchange' is supported, determine how we check the URL state.
        if (this._hasPushState) {
            $(window).bind('popstate', this.checkUrl);
        } else if (this._wantsHashChange && ('onhashchange' in window)) {
            $(window).bind('hashchange', this.checkUrl);
        } else if (this._wantsHashChange) {
            this._checkUrlInterval = window.setInterval(this.checkUrl, this.interval);
        }

        // Determine if we need to change the base url, for a pushState link
        // opened by a non-pushState browser.
        this.fragment = fragment;
        var loc = window.location;
        var atRoot = (loc.pathname + loc.search) === this.options.root;

        // If we've started off with a route from a `pushState`-enabled browser,
        // but we're currently in a browser that doesn't support it...
        if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
            this.fragment = this.getFragment(null, true);
            window.location.replace(this.options.root + '#' + this.fragment);
            // Return immediately as browser will do redirect to new url
            return true;

            // Or if we've started out with a hash-based route, but we're currently
            // in a browser where it could be `pushState`-based instead...
        } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
            this.fragment = this.getHash().replace(routeStripper, '');
            window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + this.fragment);
        }

        // Workaround the root having a trailing slash when the visited URL is misisng it.
        if (this._wantsPushState && this._hasPushState && this.options.root === (loc.pathname + '/')) {
            window.history.replaceState({}, document.title, loc.protocol + '//' + loc.host + this.options.root + loc.search);
        }

        if (!this.options.silent) {
            return this.loadUrl();
        }
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function () {
        $(window).unbind('popstate', this.checkUrl).unbind('hashchange', this.checkUrl);
        window.clearInterval(this._checkUrlInterval);
        History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function (route, callback_or_options) {
        if (_.isFunction(callback_or_options)) {
            this.handlers.unshift({route: route, callback: callback_or_options});
        } else {
            this.handlers.unshift(_.extend({route: route}, callback_or_options));
        }
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function (e) {
        var current = this.getFragment();
        if (current === this.fragment && this.iframe) {
            current = this.getFragment(this.getHash(this.iframe));
        }
        if (current === this.fragment) {
            return false;
        }

        // NOTE: Monkeypatch! -Lee
        this._priorUrl = this._currentUrl;

        if (this.iframe) {
            this.navigate(current);
        }
        return this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function (fragmentOverride) {
        var that = this;
        _.each(this.handlers, function (handler) {
            if (handler.exit && handler.route.test(that._priorUrl)) {
                handler.exit(that._priorUrl);
            }
        });

        var fragment = this.fragment = this.getFragment(fragmentOverride);
        var matched = _.any(this.handlers, function (handler) {
            if (handler.route.test(fragment.toLowerCase())) {
                that._currentUrl = fragment;
                (handler.enter || handler.callback)(fragment);
                return true;
            }
        });
        return matched;
    },


    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function (fragment, options) {
        if (!History.started) {
            return false;
        }
        if (!options || options === true) {
            options = {trigger: options};
        }
        var frag = (fragment || '').replace(routeStripper, '');
        if (this.fragment === frag) {
            return;
        }

        // If pushState is available, we use it to set the fragment as a real URL.
        if (this._hasPushState) {
            if (frag.indexOf(this.options.root) !== 0) {
                frag = this.options.root + frag;
            }
            this.fragment = frag;
            window.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, frag);

        // If hash changes haven't been explicitly disabled, update the hash
        // fragment to store history.
        } else if (this._wantsHashChange) {
            this.fragment = frag;
            this._updateHash(window.location, frag, options.replace);
            if (this.iframe && (frag !== this.getFragment(this.getHash(this.iframe)))) {
                // Opening and closing the iframe tricks IE7 and earlier to push a history entry on hash-tag change.
                // When replace is true, we don't want this.
                if (!options.replace) {
                    this.iframe.document.open().close();
                }
                this._updateHash(this.iframe.location, frag, options.replace);
            }

          // If you've told us that you explicitly don't want fallback hashchange-
          // based history, then `navigate` becomes a page refresh.
        } else {
            window.location.assign(this.options.root + fragment);
        }
        if (options.trigger) {
            this.loadUrl(fragment);
        }
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function (location, fragment, replace) {
        if (replace) {
            location.replace(location.toString().replace(/(javascript:|#).*$/, '') + '#' + fragment);
        } else {
            location.hash = fragment;
        }
    }
});

components.history = new History();

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
lib.showable = function (_public, _protected, manager) {

    lib.model(_public, _protected, 'visible');
    lib.destroyable(_public, _protected);

    _public.visible = false;

    _public.show = function () {
        _public.visible = true;
        return _public;
    };

    _public.hide = function () {
        _public.visible = false;
        return _public;
    };

    _public.toggle = function () {
        _public.visible = arguments.length ? arguments[0] : !_public.visible;
        return _public;
    };

    _public.onDestroy(_public.hide);

    return _public;
};

// If you have a collection of mutually exclusive showables, this function will
// ensure that the correct ones are hidden when the correct others are shown.
// (aka. lib.thereShouldOnlyBeOne)
lib.showable.manager = function () {

    var _public = {}, visible = null;

    _public.manage = function (showable) {
        showable.wheneverEqual('visible', true, function () {
            if (visible && visible !== showable) {
                visible.hide();
            }
            visible = showable;
        });

        showable.wheneverEqual('visible', false, function () {
            if (showable === visible) {
                visible = null;
            }
        });
    };

    _(arguments).chain().flatten().each(_public.manage);

    return _public;
};
/*global window */

// A wrapper around localStorage that tries to make the size limit less painful.
//
// It does this by maintaining the invariant that if you do storage.setItem()
// in one browser session, storage.getItem() is guaranteed to return that item.
//
// It does not guarantee however that if you do storage.setItem() in one session
// that that value will be available in the next session.
//
// That said, if you can access one key in the next session, you will be able to
// access all the keys set after that one.
//
lib.storage = (function () {
    var _public = {}, _protected = {},

        localStorage = window.localStorage,

        workingStorage = {};

    // localStorage is our first port of call, but if it fails to work for some
    // reason (i.e. we're out of quota, or firefox has corrupted the data file)
    // we fall back to workingStorage, which is not persistant.
    // (obviously in the case of a corrupted data file, or no local storage at
    // all, then nothing is actually persistant at all).

    function handleStorageError(name, value, e, opts) {

        opts = jQuery.extend({
            on_quota_exceeded: function () {
                // By default retry once, but if that fails, fallback to using
                // workingStorage.
                _public.setItem(name, value, {
                    on_quota_exceeded: function () {
                        console.log("Not writing " + name + " to localStorage: this value is too big.");
                    }
                });
            }
        }, opts);

        if (e && /QUOTA/.test(e.name)) {
            // If we hit a quota error, then we're going to continue hitting quota errors
            // for all time unless we do something drastic. So we empty localStorage, giving
            // us more room to play with.
            //
            // In order to isolate the current session from this (i.e. to maintain the invariant
            // that if you've just done .setItem(), .getItem() will return the value), we copy
            // everything into workingStorage.
            _(localStorage).each(function (value, name) {
                if (!workingStorage.hasOwnProperty(name)) {
                    workingStorage[name] = value;
                }
                delete localStorage[name];
            });

            opts.on_quota_exceeded();
        } else {
            // Assume localStorage is totally brokened.
            console.log("Failed to write " + name + " to localStorage: " + e);
        }
    }

    _public.getItem = function (name) {
        if (!workingStorage.hasOwnProperty(name)) {
            try {
                workingStorage[name] = localStorage[name];
            } catch (e) {
                console.log("Not reading " + name + " from localStorage: " + e);
                workingStorage[name] = null;
            }
        }
        return workingStorage[name];
    };

    _public.setItem = function (name, value, opts) {
        try {
            workingStorage[name] = value;
            localStorage[name] = value;
        } catch (e) {
            handleStorageError(name, value, e, opts);
        }
    };

    // allow testing other storage backends.
    _public.use = function (storage) {
        localStorage = storage;
    };

    return _public;
}());
/*jslint nomen: false*/
/*global lib, _*/

(function () {

    // Turns the first letter of a string into uppercase.
    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Turns the first letter of a string into lowercase.
    function uncapitalize(str) {
        return str.charAt(0).toLowerCase() + str.slice(1);
    }

    // Turns an expression_with_underscores into an ExpressionInCamelCase.
    // If the argument is truthy, makes theFirstLetterLowercase.
    lib.camelize = function (str, first_letter_lowercase) {
        var camelized = _(str.split(/_/)).map(function (word) {
            return capitalize(word);
        }).join('');

        return (first_letter_lowercase ? uncapitalize(camelized) : capitalize(camelized));
    };

    // Turns a CamelCaseExpression into an underscore_expression.
    lib.underscore = function (str) {
        return str
           .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
           .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
           .replace(/\-/g, '_')
           .toLowerCase();
    };
}());
lib.view = function (_public, _protected, element_type) {
    _public.remove = function () {
        _public.$el.remove();
    };
};
