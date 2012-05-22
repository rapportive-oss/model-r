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
    this.initialize.apply(this, arguments);
};

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
var namedParam    = /:\w+/g;
var splatParam    = /\*\w+/g;
var escapeRegExp  = /[\-\[\]{}()+?.,\\\^$|#\s]/g;

// Set up all inheritable **Backbone.Router** properties and methods.
_.extend(components.RapportiveRouter.prototype, /*Events, */ {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function () {},

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

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function (route, name, callback) {
        if (!_.isRegExp(route)) {
            route = this._routeToRegExp(route);
        }
        if (!callback) {
            callback = this[name];
        }
        components.history.route(route, _.bind(function (fragment) {
            var args = this._extractParameters(route, fragment);
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
        return route.exec(fragment).slice(1);
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
        } else if (this._wantsHashChange && ('onhashchange' in window) ) {
            $(window).bind('hashchange', this.checkUrl);
        } else if (this._wantsHashChange) {
            this._checkUrlInterval = window.setInterval(this.checkUrl, this.interval);
        }

        // Determine if we need to change the base url, for a pushState link
        // opened by a non-pushState browser.
        this.fragment = fragment;
        var loc = window.location;
        var atRoot  = loc.pathname === this.options.root;

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
            if (handler.route.test(fragment)) {
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

