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
        }
    });
}(_));
