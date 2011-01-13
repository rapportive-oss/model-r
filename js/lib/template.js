/*global $: false, lib: false, Handlebars: false */

lib.template = {};
lib.template.compileScriptTag = function (name) {
    var templateElement = $("script[name=" + name + "]");
    if (templateElement.length < 1) {
        throw new Error("Missing template: " + name);
    }
    return Handlebars.compile(templateElement.html());
};
lib.template.compile = Handlebars.compile;
