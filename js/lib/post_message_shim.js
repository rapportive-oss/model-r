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
                sendMessage(_.extend({action: name, rapportive: true}, msg));
            });
        });
    }

};
