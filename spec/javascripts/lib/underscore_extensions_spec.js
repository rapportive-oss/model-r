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

    describe("squeeze", function () {
        it("should remove multiple consecutive instances of the specified string", function () {
            expect(_("foobarfoo").squeeze('o')).toBe("fobarfo");
            expect(_("hello  world").squeeze(' ')).toBe('hello world');
            expect(_("hell o  world").squeeze(' ')).toBe('hell o world');
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

    describe("informalize", function () {
        it("should return an empty string on bogus inputs", function () {
            expect(_(null).informalize()).toBe('');
            expect(_('  ').informalize()).toBe('');
            expect(_(45678).informalize()).toBe('');
        });

        it("should use the first name where detectable, main string otherwise", function () {
            var friendlified_names = {
                "Lee Mallabone": "Lee",
                'Rahul V.': 'Rahul',
                'TA': 'TA',
                'Bosworth-Farthing': 'Bosworth-Farthing',
                'lee': 'Lee',
                'foobarjim': 'Foobarjim',
                'Bradley "Alex"': 'Bradley "Alex"',
                'BRANKO': 'Branko',
                'Alan & Lynn': 'Alan & Lynn',
                'Pittsburgh Wedding Photographer, Mary': 'Pittsburgh Wedding Photographer, Mary',
                'даниил': 'Даниил',
                '赵': '赵',
                'Василевский': 'Василевский'
            };

            _(_(friendlified_names).keys()).each(function (key) {
                expect(_(key).informalize()).toBe(friendlified_names[key]);
            });
        });
    });
});
