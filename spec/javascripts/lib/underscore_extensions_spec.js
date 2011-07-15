/*jslint nomen: false */
/*global describe, it, expect, _ */
describe("_.", function () {

    describe("plucker", function () {
        it("should act like _.pluck", function () {
            var a = [{1: 2}, {1: 3}, {1: 4}];
            expect(_.map(a, _.plucker(1))).toEqual(_.pluck(a, 1));
        });
    });

    describe("chomp", function () {
        it("should work without specifying a separator", function () {
            expect(_("foo").chomp()).toBe("foo");
            expect(_("foo ").chomp()).toBe("foo");
            expect(_("foo\r").chomp()).toBe("foo");
            expect(_("foo\r\n").chomp()).toBe("foo");
            expect(_("foo   ").chomp()).toBe("foo");
            expect(_("  foobar! ").chomp()).toBe("  foobar!");
        });

        it("should work with a custom separator", function () {
            expect(_("whatever.com>").chomp('>')).toBe('whatever.com');
        });
    });

    describe("uniqBy", function () {

        it("should make things uniq", function () {
            expect(_([1, 2, 3, 4, 5]).uniqBy(function (el) {
                return el % 2;
            })).toEqual([1, 2]);
        });

        it("should not make things unique if the function says they differ", function () {
            expect(_([1, 1, 1, 1, 1]).uniqBy(Math.random)).toEqual([1, 1, 1, 1, 1]);
        });
    });
});
