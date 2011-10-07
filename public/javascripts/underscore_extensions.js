/*jslint onevar: false, regexp: false */

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

        // chomp() similar to ruby: Returns a new String with the given record
        // separator removed from the end of input (if present). Defaults to
        // removing spaces, newlines and carriage returns.
        chomp: function (input, separator) {
            if (!separator) {
                separator = "[\r\n ]";
            }
            return input.replace(new RegExp(separator + '+$'), '');
        },

        // Returns a new string where runs of the same character that occur in
        // this set are replaced by a single character.
        squeeze: function (input, other_string) {
            if (!other_string) {
                throw "squeeze() without a specific string to squeeze, is not supported.";
            }
            return input.replace(new RegExp("(" + other_string + ")+", 'g'), other_string);
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

        // Returns a list of items such that the given function
        // returns a unique value for each of them.
        //
        // If you know in advance that all duplicate values are
        // adjacent to each other, you can pass isSorted to use
        // a much faster algorithm.
        //
        // The fourth parameter is used as the  as with _.map
        // when the provided function is called, while the
        uniqBy: function (ary, func, isSorted, context) {
            var seen = [],
                uniq = [];
            _.each(ary, function (el, i) {
                var key = func.call(context, el, i, ary);
                if (0 === i || (isSorted === true ? _.last(seen) !== key : !_.include(seen, key))) {
                    seen.push(key);
                    uniq.push(el);
                }
            });
            return uniq;
        },

        // A function that, given an element, returns a property.
        //   _([{1:2}, {1:3}]).map(_.plucker(1)) === [2, 3]
        // (Though you could use _.pluck in that case).
        //
        plucker: function (key) {
            return function (el) {
                return el[key];
            };
        },

        // Return the first truthy output of the iterator when
        // passed over the array.
        // (equivalent to .map().compact().first(), though more efficient).
        firstMap: function (obj, iterator, context) {
            var result;
            _.any(obj, function (value, index, list) {
                result = iterator.call(context, value, index, list);
                return !!result;
            });
            return result;
        },

        // Works out the first name (and returns it) if possible. If unsure, returns
        // a trimmed version of the full input.
        informalize: function (input, fallback) {
            function potentialFirst(words) {
                var blacklist = ['mr', 'mrs', 'miss', 'ms', 'lord', 'lady', 'dame', 'dr', 'doctor', 'sir', 'master'];
                words = _(words).clone();
                var first_word = words.shift();

                if (_(blacklist).indexOf(first_word.toLowerCase()) > -1) {
                    // Disregard leading titles
                    return potentialFirst(words);

                } else if ((first_word.toUpperCase() === first_word && first_word.length < 3) ||
                           first_word.charAt(first_word.length - 1) === '.') {
                    // Leading initials suggest there's no first name present
                    return null;
                }
                return first_word;
            }

            // Non-destructively capitalize a name unless it's tiny.
            function clean(name) {
                if (name.length < 3) {
                    return name;
                }
                if (name.toUpperCase() === name) {
                    name = name.toLowerCase();
                }
                // Note: this is fine for the current capitalize() implementation. Often such implementations
                // will lowercase the entire string after the first character, which wouldn't be ok in this
                // context due to names like McFoo.
                return _(name).capitalize();
            }

            if (!input || !_(input).isString()) {
                return '';
            }

            var name = _(input).squeeze(' ').trim();
            fallback = fallback || name;

            // Bail if the input doesn't look like a name
            if (!name || name.match(/[0-9"\|\*\?\,\(\)\[\]<>_\-@~&]/) || name.length > 30) {
                return fallback;
            }

            var first_name = potentialFirst(name.split(/[\s]+/));
            if (!first_name) {
                return fallback;
            }
            return clean(first_name);
        },

        // Return a clean email address or null.
        cleanEmail: function (input) {
            var match = _.isString(input) && input.match(_.RE_EMAIL);
            return match ? match[1].toLowerCase() : null;
        },

        inspect: function (obj) {
            return JSON.stringify(obj);
        }
    });

    _.RE_EMAIL = /((?:[^\s@<>:]+)@(?:[a-z0-9\-]+\.)+[a-z]{2,})/i;
}(_));
