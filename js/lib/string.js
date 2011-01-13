/*jslint nomen: false */
/*global _: false */

// A few extra methods on strings, mostly mirroring ActiveSupport's behaviour.

// Turns the first letter of a string into uppercase.
String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

// Turns the first letter of a string into lowercase.
String.prototype.uncapitalize = function () {
    return this.charAt(0).toLowerCase() + this.slice(1);
};

// Turns an expression_with_underscores into an ExpressionInCamelCase.
// If the argument is truthy, makes theFirstLetterLowercase.
String.prototype.camelize = function (first_letter_lowercase) {
    var camelized = _(this.split(/_/)).map(function (word) {
        return word.capitalize();
    }).join('');

    return (first_letter_lowercase ? camelized.uncapitalize() : camelized.capitalize());
};

// Turns a CamelCaseExpression into an underscore_expression.
String.prototype.underscore = function () {
    return this.
        replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').
        replace(/([a-z0-9])([A-Z])/g, '$1_$2').
        replace(/\-/g, '_').
        toLowerCase();
};

// Escapes special characters for safe concatenation with HTML.
String.prototype.escapeHTML = function () {
    return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

// Escapes special characters for safe use as a literal in a regular expression.
String.prototype.escapeRegExp = function () {
    return this.replace(/([.*+?|()\[\]{}])/g, "\\$1");
};


// British spellings and aliases
String.prototype.capitalise   = String.prototype.capitalize;
String.prototype.uncapitalise = String.prototype.uncapitalize;
String.prototype.camelise     = String.prototype.camelize;
String.prototype.camelcase    = String.prototype.camelize;
