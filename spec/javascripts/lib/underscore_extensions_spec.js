/*global window */
describe("_.", function () {

    describe("andand", function () {
        it("should return the property when the subject is truthy", function () {
            var obj = {hello: 'world'};
            expect(_(obj).andand().hello).toEqual('world');
            expect(_(obj).andand().fnar).toBeFalsy();
        });

        it("should return null when the subject is falsy", function () {
            expect(_(null).andand().hello).toBeFalsy();
            expect(_(undefined).andand().hello).toBeFalsy();
        });

        // NOTE: the first of these commented-out tests works, but because the 2nd does not,
        // that style of use would be very unwise: the whole point of writing like that would
        // be to rely on the missing behaviour.
        // Tests left for posterity as we should be able to implement this when __noSuchMethod__
        // (or equivalent) is implemented in WebKit.

        // it("should return a function result when the subject is truthy", function () {
        //     var obj = {
        //         hello: function () {
        //             return 'world';
        //         }
        //     };
        //     expect(_(obj).andand().hello()).toEqual('world');
        // });
        // it("should return falsy when calling function on a falsy object");
        //     var nl = null;
        //     var undef = undefined;
        //     expect(_(nl).andand().hello()).toBeFalsy();
        //     expect(_(undef).andand().hello()).toBeFalsy();
        // });
    });

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

        // TODO: This will remove comments from within strings
        function parseJsonWithComments(str) {
            // "." doesn't match newline chars (\r or \n) but $ and  [^*] do.
            return JSON.parse(str.replace(new RegExp("//.*$|/\\*([^*]+|\\*[^/])*\\**/", "gm"), ''));
        }

        it("should use the first name where detectable, main string otherwise", function () {
            var friendlified_names = parseJsonWithComments(jasmine.getFixtures().read("detergent_names.json")).for_send_and_remind;

            _(_(friendlified_names).keys()).each(function (key) {
                expect(_(key).informalize()).toBe(friendlified_names[key]);
            });
        });
    });

    describe("nameFromEmail", function () {
        it("should return a name from a name-email address string", function () {
            expect(_('Lee Mallabone <lee@rapportive.com>').nameFromEmail()).toBe('Lee Mallabone');
        });

        it("should handle quotes", function () {
            expect(_('"Lee Mallabone" <foo@bar.com>').nameFromEmail()).toBe('Lee Mallabone');
        });

        it("should sanitize in the face of dubious punctuation", function () {
            expect(_(' "Lee" - <foo@bar.com>, ').nameFromEmail()).toBe('Lee');
        });

        it("should return null if a name can't be determined", function () {
            var cases = [
                'foo@bar.com',
                '"" <foo@rapportive.com>',
                '<foo@gmail.com>',
                'foo@bar.com <foo@bar.com>',
                'lee@rapportive.com <lee.mallabone@gmail.com>',
                '"lee@localhost" <lee@rapportive.com>'
            ];

            _(cases).each(function (email) {
                expect(_(email).nameFromEmail()).toBeNull();
            });
        });
    });

    describe("deferInSequence", function () {
        var a;
        beforeEach(function () {
            a = 0;
        });

        function first() {
            a += 10;
        }
        function second() {
            a *= 5;
        }
        function third() {
            a += 10;
        }
        it("should run all functions", function () {
            expect(a).toBe(0);
            _.deferInSequence([first, second, third]);
            expect(a).toBe(0); // they should run deferred

            window.setTimeout(function () {
                expect(a).toBe(60);
            }, 10); // arbitrary longish delay
        });

        it("should run the sequence in the correct order", function () {
            _.deferInSequence([second, first, third]);
            window.setTimeout(function () {
                expect(a).toBe(20);
            }, 10); // arbitrary longish delay
        });
    });
});
