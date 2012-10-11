Modelr is a minimal model layer for javascript, with the design goal of optimizing for
developer productivity on modern browsers. (sorry, no IE support yet!).

Key points
==========

* Pure mixin-based inheritance.
* Real properties for syntactically awesome getters and setters.
* Closure based models with public, protected and private variables.
* No reliance on `this`, or new. Everything is just functions and objects.
* Powers the 70k lines of javascript in (Rapportive)[http://rapportive.com/].

Examples
========
Creating a user model that can authenticate:
```javascript
models.user = function () {

    // This boilerplate creates a new model.
    // anything that's on _public can be called by any part of your program
    // (that's why it's returned at the end)
    // anything that's on _protected can be accessed by this object and
    // its mixins.
    var _public = {},
        _protected = {};

    // any other local variables are private, and cannot be accessed from
    // outside this closure.
    var password;

    // Model attributes are special, whenever you assign to them, two change
    // events are fired: onNameChange() and onChange().
    lib.model(_public, _protected, 'name', 'email', 'authenticated');

    // Events can be used standalone, this adds two functions to _public.
    // onLogin() to register event handlers,
    // triggerLogin() to call event handlers.
    lib.hasEvent(_public, _protected, 'logout');

    // When the user logs in, we want them to become authenticated.
    _public.login = function (password_attempt) {
        if (password === password_attempt) {
            _public.authenticated = true;
        }
    });

    // When the user logs out, we need to deauthenticate them:
    _public.onLogout(function () {
        _public.authenticated = false;
    });

    // When the user's name changes, tell them what it is.
    _public.onNameChange(function (name) {
        alert("Hello, " + name);
    });

    return _public;
};


var fred = models.user();

fred.name = 'Fred';
fred.login('test');

// The first time Fred logs in, redirect to welcome screen.
fred.whenEqual('authenticated', true, function () {
    window.location = "/welcome";
});

```

Encapsulating some functionality in a custom mixin:
```javascript

lib.remoteLoggable = function (_public, _protected) {
    _protected.log = function (message) {
        return $.ajax({            // requires jQuery/Zepto
            url: '/client/logger', // server must implement this endpoint 
            data: {message: message},
            type: 'POST',
            dataType: 'json',
            error: function (error) {
                console.log("Failed with error (" + error + ") trying to log: ", message);
            }
        });
    };

    return _public;
};

models.user = function (first_name) {
    var _public = {}, _protected = {};

    lib.remoteLoggable(_public, _protected);

    _public.greet = function () {
        _protected.log("We totally said hello to " + first_name);
        return "Hello world, and hello " + first_name + "!";
    };

    return _public;
};

var lee = models.user("Lee");
lee.greet(); // a message also gets POSTed to our server.

```

TODO
====

* Write documentation!
