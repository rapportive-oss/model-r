/*jslint nomen: false */
/*global _: false */

(function (_) {
    _.mixin({
        // andand from ruby: returns an empty object if the input is falsey,
        // otherwise returns the input (or calls the function with the input).
        andand: function (obj, func) {
            if (obj) {
                return func ? func(obj) : obj;
            }
            return {};
        },

        // Find the (asymetric) difference between the two arrays.
        // _.difference([1,2,3], [2,3]) === _.without([1,2,3], 2, 3)
        difference: function (ary1, ary2) {
            return _.without.apply(_, [ary1].concat(ary2));
        },

        // Turns the first letter of a string into uppercase.
        capitalize: function (str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },

        // Turns the first letter of a string into lowercase.
        uncapitalize: function (str) {
            return str.charAt(0).toLowerCase() + str.slice(1);
        },

        // Turns an expression_with_underscores into an ExpressionInCamelCase.
        // If the argument is truthy, makes theFirstLetterLowercase.
        camelize: function (str, first_letter_lowercase) {
            var camelized = _(str.split(/_/)).map(function (word) {
                return _.capitalize(word);
            }).join('');

            return (first_letter_lowercase ? _.uncapitalize(camelized) : _.capitalize(camelized));
        },

        // Turns a CamelCaseExpression into an underscore_expression.
        underscore: function (str) {
            return str.
                replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').
                replace(/([a-z0-9])([A-Z])/g, '$1_$2').
                replace(/\-/g, '_').
                toLowerCase();
        },

        // Escapes a string for inclusion into a regular expression.
        // cf. http://simonwillison.net/2006/Jan/20/escape/
        regexpEscape: function (str) {
            return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
        },

        // The opposite of Empty
        isPresent: function () {
            return !_.isEmpty.apply(this, arguments);
        }
    });
}(_));
