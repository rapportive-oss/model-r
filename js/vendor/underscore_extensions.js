/*jslint onevar: false, regexp: false, nomen: false */
/*global setTimeout, clearTimeout, _ */

(function (_) {
    _.mixin({
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
            return str
               .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
               .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
               .replace(/\-/g, '_')
               .toLowerCase();
        }
    });
}(_));
