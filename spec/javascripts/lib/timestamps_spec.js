/*jslint nomen: false, onevar: false */
/*global describe, it, expect, beforeEach, lib, _, jQuery, jasmine */

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
            var frozen_date = new Date(2011, 0, 8, 12, 32); // months are zero-based
            var frozen_timestamp = parseInt(frozen_date.getTime() / 1000, 10); // unix timestamp
            model.created_at = frozen_date;
            
            expect(model.created_at_seconds).toEqual(frozen_timestamp);
        });

        it("should return latest value after an update", function () {
            var model = consistentModel();
            var frozen_date = new Date(2011, 0, 8, 12, 32); // months are zero-based
            var frozen_timestamp = parseInt(frozen_date.getTime() / 1000, 10); // unix timestamp
            model.created_at = frozen_date;

            expect(model.created_at_seconds).toEqual(frozen_timestamp);
            expect(model.created_at_millis).toEqual(frozen_timestamp * 1000);
            expect(model.created_at).toEqual(frozen_date);
            expect(model.created_at_iso8601).toEqual('2011-01-08T1232');

            var second_date = new Date(2012, 1, 2, 12, 32); // months are zero-based
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

    });
});
