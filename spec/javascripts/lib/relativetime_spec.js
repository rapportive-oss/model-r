/*global describe, it, expect, $ */

describe("parseTime", function () {

    it("should accept date objects", function () {
        var date = new Date(Date.parse("2010/08/06"));
        expect(isNaN(date)).toBeFalsy();
        expect($.parseTime(date)).toEqual(Date.parse("2010/08/06"));
    });

    it("should accept values that the date object can parse", function () {
        var parsed = $.parseTime("2011/05/22 08:03:05");
        expect(isNaN(parsed)).toBeFalsy();
        expect(parsed).toEqual(Date.parse("2011/05/22 08:03:05"));
    });

    it("should accept timestamps", function () {
        expect($.parseTime(1294883764880)).toEqual(1294883764880);
    });

    it("should accept ISO 8601 dates", function () {
        expect($.parseTime("2010-05-05Z")).toEqual(Date.parse("2010/05/05 00:00:00 UTC"));
    });

    it("should accept ISO 8601 datetimes", function () {
        expect(isNaN($.parseTime("2010-05-05 12:13:14Z"))).toBeFalsy();
        expect(isNaN($.parseTime("2010-05-05 15:16+0000"))).toBeFalsy();

        expect($.parseTime("2010-05-05 12:13:14Z")).toEqual(Date.parse("2010/05/05 12:13:14 UTC"));
        expect($.parseTime("2010-05-05 15:16+0000")).toEqual(Date.parse("2010/05/05 15:16:00 UTC"));
    });

    it("should accept ISO 8601 datetimes with timestamps", function () {
        expect(isNaN($.parseTime("2010-05-05 12:13:14+01:00"))).toBeFalsy();
        expect(isNaN($.parseTime("2010-05-05 15:16-800"))).toBeFalsy();

        expect($.parseTime("2010-05-05 12:13:14+01:00")).toEqual(Date.parse("2010/05/05 12:13:14 GMT+0100"));
        expect($.parseTime("2010-05-05 15:16-800")).toEqual(Date.parse("2010/05/05 15:16:00 GMT-0800"));
    });

});
