
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

describe("relativeTime", function () {

    function from(n) {
        function date(n) {
            var obj = new Date();
            obj.setTime(obj.getTime() - n * 1000);
            return {ago: obj};
        }

        return {
            seconds: date(n),
            minutes: date(n * 60),
            hours  : date(n * 60 * 60),
            days   : date(n * 60 * 60 * 24),
            weeks  : date(n * 60 * 60 * 24 * 7),
            months : date(n * 60 * 60 * 24 * 30)
        };
    }

    it("should round things to 1 minute", function () {
        expect($.relativeTime(from(10).seconds.ago)).toEqual('1 min ago');
        expect($.relativeTime(from(80).seconds.ago)).toEqual('1 min ago');
    });

    it("should round things to integer minutes", function () {
        expect($.relativeTime(from(197).seconds.ago)).toEqual('3 mins ago');
        expect($.relativeTime(from(1877).seconds.ago)).toEqual('31 mins ago');
    });

    it("should round things to an hour", function () {
        expect($.relativeTime(from(58 * 60 + 3).seconds.ago)).toEqual('1 hour ago');
        expect($.relativeTime(from(1069).minutes.ago, from(999).minutes.ago)).toEqual('1 hour ago');
    });

    it("should round things to integer hours", function () {
        expect($.relativeTime(from(999).minutes.ago)).toEqual('17 hours ago');
    });

    it("should round numbers of datys nicely", function () {
        expect($.relativeTime(from(27).hours.ago)).toEqual('1 day ago');
        expect($.relativeTime(from(97).hours.ago)).toEqual('4 days ago');
        expect($.relativeTime(from(6).days.ago)).toEqual('1 week ago');
        expect($.relativeTime(from(8).days.ago)).toEqual('1 week ago');
        expect($.relativeTime(from(20).days.ago)).toEqual('3 weeks ago');
        expect($.relativeTime(from(27).days.ago)).toEqual('4 weeks ago');
        expect($.relativeTime(from(29).days.ago)).toEqual('1 month ago');
        expect($.relativeTime(from(48).days.ago)).toEqual('2 months ago');
        expect($.relativeTime(from(280).days.ago)).toEqual('9 months ago');
    });

    it("should round numbers of months nicely", function () {
        expect($.relativeTime(from(6).months.ago)).toEqual('6 months ago');
        expect($.relativeTime(from(12).months.ago)).toEqual('1 year ago');
        expect($.relativeTime(from(15).months.ago)).toEqual('1 year ago');
        expect($.relativeTime(from(19).months.ago)).toEqual('2 years ago');
    });

});
