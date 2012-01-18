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
//   iframe: the iframe to send messages to
//   receive: [a list of actions we expect to receive],
//   send: [a list of actions we expect to send],
//   remote_base_url: the url to send with postMessage to ensure it arrives at the correct domain
// }
lib.postMessageShim = function (_public, _protected, opts) {

    lib.hasEvent(_public, _protected, opts.send);
    lib.hasEvent(_public, _protected, opts.receive);

    opts.iframe.message(function (msg) {
        if (_(opts.receive).include(msg.action)) {
            _public.trigger(msg.action, msg);
        } else {
            fsLog("Got unexpected postMessage: " + JSON.stringify(msg));
        }
    });

    _(opts.send).each(function (name) {
        _public.on(name, function (msg) {
            $.message(opts.iframe[0], jQuery.extend({action: name}, msg), opts.remote_base_url);
        });
    });
};
