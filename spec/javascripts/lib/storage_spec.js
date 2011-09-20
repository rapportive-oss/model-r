/*jslint nomen: false*/
/*global describe, it, expect, spyOn, beforeEach, afterEach, jasmine */
/*global localStorage, console, lib */

describe("lib.storage", function () {
    it("should read from localStorage", function () {
        localStorage.foo = "bar";
        expect(lib.storage.getItem("foo")).toEqual("bar");
    });

    it("should write to localStorage", function () {
        delete localStorage.baz;
        lib.storage.setItem("baz", "bam");
        expect(localStorage.baz).toEqual("bam");
    });

    describe("with broken localStorage", function () {

        var spy;

        beforeEach(function () {
            lib.storage.use((function () {
                var fakeStorage = {};

                // N.B. localStorage.__defineSetter__ doesn't work in Chrome
                fakeStorage.__defineSetter__('beetle', function () {
                    throw new Error("NS_ERROR_FILE_CORRUPT");
                });
                fakeStorage.__defineGetter__('bug', function () {
                    throw new Error("NS_ERROR_FILE_CORRUPT");
                });

                return fakeStorage;
            }()));

            spy = spyOn(console, "log");
        });

        afterEach(function () {
            lib.storage.use(localStorage);
        });

        it("should not throw errors writing", function () {
            expect(function () {
                lib.storage.setItem('beetle', 'juice');
            }).not.toThrow();

            expect(spy).toHaveBeenCalled();
        });

        it("should not throw errors reading", function () {
            expect(function () {
                lib.storage.getItem('bug');
            }).not.toThrow();

            expect(spy).toHaveBeenCalled();
        });

        it("should remember the values", function () {
            lib.storage.setItem('beetle', 'juice');
            expect(lib.storage.getItem('beetle')).toEqual('juice');

            lib.storage.setItem('bug', 'mash');
            expect(lib.storage.getItem('bug')).toEqual('mash');
        });
    });

    describe("with full localStorage", function () {
        var fakeStorage,
            spy;

        function FullStorage() {}
        // Put this on the prototype so that clearing out localStorage
        // doesn't clear this out.
        FullStorage.prototype.__defineSetter__('beetle', function () {
            if (this.called) {
                return;
            } else {
                this.called = 1;
                throw {name: "QUOTA_EXCEEDED_ERROR"};
            }
        });

        beforeEach(function () {
            fakeStorage = new FullStorage();
            lib.storage.use(fakeStorage);
            spy = spyOn(console, "log");
        });

        afterEach(function () {
            lib.storage.use(localStorage);
        });

        it("should not throw errors writing", function () {
            expect(function () {
                lib.storage.setItem('beetle', 'juice');
            }).not.toThrow();

            expect(spy).toHaveBeenCalled();
        });

        it("should remember the new value", function () {
            lib.storage.setItem('beetle', 'juice');
            expect(lib.storage.getItem('beetle')).toEqual('juice');
        });

        it("should remember old values", function () {
            lib.storage.setItem("foo", "bar");
            lib.storage.setItem("beetle", "juice");
            expect(lib.storage.getItem("foo")).toEqual("bar");
        });

        it("should clear-out localStorage", function () {
            lib.storage.setItem("foo", "bar");
            lib.storage.setItem("beetle", "juice");
            expect(fakeStorage.foo).not.toBeDefined();
        });
    });
});
