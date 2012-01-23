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
//   iframe: the iframe to send messages to and receive messages from
//   receive: [a list of actions we expect to receive],
//   send: [a list of actions we expect to send],
//   remote_base_url: the url to send with postMessage to ensure it arrives at the correct domain
// }
//
// Alternatively, if you're listening and sending to different objects, you can specify them
// explicitly instead of the 'iframe' property, eg:
// {
//   listener: $(window),
//   recipient: $(window.parent),
//   receive: [a list of actions we expect to receive],
//   send: [a list of actions we expect to send],
//   remote_base_url: the url to send with postMessage to ensure it arrives at the correct domain
// }
//
// remote_base_url can be a function, in which case it is evaluated every time a message is sent.
// (useful if the destination URL cannot be determined at the time postMessageShim is declared).
lib.postMessageShim = function (_public, _protected, opts) {

    lib.hasEvent(_public, _protected, opts.send);
    lib.hasEvent(_public, _protected, opts.receive);

    var listener = opts.iframe || opts.listener,
        recipient = opts.iframe || opts.recipient;

    // TODO: make sure "rapportive:true" is being set on all messages.
    listener.message(function (msg, reply, e) {
        if (_(opts.receive).include(msg.action)) {
            _public.trigger(msg.action, msg);
        } else if (msg.rapportive) {
            fsLog("Got unexpected postMessage: " + JSON.stringify(msg));
        }
    });

    _(opts.send).each(function (name) {
        _public.on(name, function (msg) {
            if (recipient.jquery) {
                recipient = recipient[0];
            }
            $.message(recipient, jQuery.extend({action: name, rapportive: true}, msg),
                      (_.isFunction(opts.remote_base_url) ? opts.remote_base_url() : opts.remote_base_url));
        });
    });
};
