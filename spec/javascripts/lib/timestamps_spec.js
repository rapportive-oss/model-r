/*jslint onevar: false*/
describe("lib.timestamps", function () {
    describe("property helpers", function () {
        function consistentModel() {
            var _public = {}, _protected = {};
            lib.model(_public, _protected, "color", "created_at");
            lib.timestamps(_public, _protected, "created_at");
            return _public;
        }

        it("should add helpers for the specified attributes", function () {
            var model = consistentModel();
            var frozen_date = new Date(2011, 0, 8, 12, 32);
            var frozen_timestamp = parseInt(frozen_date.getTime() / 1000, 10); // unix timestamp
            model.created_at = frozen_date;
            
            expect(model.created_at_seconds).toEqual(frozen_timestamp);
        });

        it("should return latest value after an update", function () {
            var model = consistentModel();
            var frozen_date = new Date("2011/1/8 12:32 UTC");
            var frozen_timestamp = parseInt(frozen_date.getTime() / 1000, 10); // unix timestamp
            model.created_at = frozen_date;

            expect(model.created_at_seconds).toEqual(frozen_timestamp);
            expect(model.created_at_millis).toEqual(frozen_timestamp * 1000);
            expect(model.created_at).toEqual(frozen_date);
            expect(model.created_at_iso8601).toEqual('2011-01-08T1232');

            var second_date = new Date("2012/2/2 12:32 UTC"); // months are zero-based
            var second_stamp = parseInt(second_date.getTime() / 1000, 10);
            model.created_at = second_date;

            expect(model.created_at_seconds).toEqual(second_stamp);
            expect(model.created_at_millis).toEqual(second_stamp * 1000);
            expect(model.created_at).toEqual(second_date);
            expect(model.created_at_iso8601).toEqual('2012-02-02T1232');
        });

        it("should not add helpers for other attributes", function () {
            var model = consistentModel();
            model.color = 'blue';
            expect(model.color).toEqual('blue');
            expect(model.color_date).toBeUndefined();
        });

        describe("change events", function () {

            var model, spy;

            beforeEach(function () {
                model = (function () {
                    var _public = {}, _protected = {};
                    lib.model(_public, _protected, "color", "created_at");
                    lib.timestamps(_public, _protected, "created_at", {granularity: 'minute'});
                    return _public;
                }());
                spy = jasmine.createSpy();
            });

            it("should fire when changing form nothing to somethign", function () {
                model.created_at = null;
                model.onCreatedAtChange(spy);
                model.created_at = new Date();
                expect(spy).toHaveBeenCalled();
            });

            it("should fire when changing form something to nothing", function () {
                model.created_at = new Date();
                model.onCreatedAtChange(spy);
                model.created_at = null;
                expect(spy).toHaveBeenCalled();
            });

            it("should fire when the granularity is exceded in the forward direction", function () {
                model.created_at = new Date("2011/01/01 01:01");
                model.onCreatedAtChange(spy);
                model.created_at = new Date("2011/01/01 01:03");
                expect(spy).toHaveBeenCalled();
            });

            it("should fire when the granularity is exceded in the backward direction", function () {
                model.created_at = new Date("2011/01/01 01:01");
                model.onCreatedAtChange(spy);
                model.created_at = new Date("2011/01/01 01:00:59");
                expect(spy).toHaveBeenCalled();
            });

            it("should not fire when the granularity is not exceded", function () {
                model.created_at = new Date("2011/01/01 01:01:00");
                model.onCreatedAtChange(spy);
                model.created_at = new Date("2011/01/01 01:01:01");
                expect(spy).not.toHaveBeenCalled();
            });
        });
    });
});
