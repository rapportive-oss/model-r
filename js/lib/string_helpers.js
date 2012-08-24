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
