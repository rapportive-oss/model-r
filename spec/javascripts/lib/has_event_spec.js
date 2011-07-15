/*jslint nomen: false*/
/*global describe,it,expect,beforeEach,jasmine,lib*/
describe("lib.hasEvent", function () {
    describe("mixin constructor", function () {
        it("should accept a list of event names", function () {
            function obj() {
                var _public = {}, _protected = {};
                lib.hasEvent(_public, _protected, ['foo', 'bar']);
                return _public;
            }
            expect(obj().onFoo).toBeDefined();
            expect(obj().onBar).toBeDefined();
        });

        it("should accept vararg event names", function () {
            function obj() {
                var _public = {}, _protected = {};
                lib.hasEvent(_public, _protected, 'foo', 'bar');
                return _public;
            }
            expect(obj().onFoo).toBeDefined();
            expect(obj().onBar).toBeDefined();
        });

        it("should be ok to call several times", function () {
            function obj() {
                var _public = {}, _protected = {};
                lib.hasEvent(_public, _protected, 'foo');
                lib.hasEvent(_public, _protected, 'bar');
                return _public;
            }
            expect(obj().onFoo).toBeDefined();
            expect(obj().onBar).toBeDefined();
        });
    });


    describe("event triggering", function () {
        var obj;

        beforeEach(function () {
            obj = (function () {
                var _public = {}, _protected = {};
                lib.hasEvent(_public, _protected, 'foo');
                return _public;
            }());
        });

        it("should do nothing if no handlers are registered", function () {
            obj.triggerFoo();
        });

        it("should call the handler if one is registered", function () {
            var handler = jasmine.createSpy('event handler');
            obj.onFoo(handler);
            expect(handler).not.toHaveBeenCalled();
            obj.triggerFoo();
            expect(handler).toHaveBeenCalled();
        });

        it("should call multiple handlers in the order they were registered", function () {
            var count = 0, last = 0;
            obj.onFoo(function () {
                count += 1;
                last = 1;
            });
            obj.onFoo(function () {
                count += 1;
                last = 2;
            });
            obj.triggerFoo();
            expect(count).toEqual(2);
            expect(last).toEqual(2);
        });

        it("should pass the trigger call arguments to the handlers", function () {
            var handler = jasmine.createSpy('event handler');
            obj.onFoo(handler);
            obj.triggerFoo('hello', 123, {foo: 'bar'});
            expect(handler).toHaveBeenCalledWith('hello', 123, {foo: 'bar'});
        });

        it("should call the handlers in the context of the current object", function () {
            obj.onFoo(function () {
                expect(this).toBe(obj);
            });
            obj.triggerFoo();
        });

        it("should still ping all event handlers if one is removed", function () {
            var foo_handler_1 = jasmine.createSpy('foo handler 1'),
                foo_handler_2 = jasmine.createSpy('foo handler 2');

            obj.onceOn('foo', foo_handler_1);
            obj.on('foo', foo_handler_2);
            obj.triggerFoo();
            expect(foo_handler_1).toHaveBeenCalled();
            expect(foo_handler_2).toHaveBeenCalled();
        });
    });


    describe("removing handlers", function () {
        var obj, foo_handler_1, foo_handler_2, bar_handler;

        beforeEach(function () {
            obj = (function () {
                var _public = {}, _protected = {};
                lib.hasEvent(_public, _protected, 'foo', 'bar');
                return _public;
            }());
            foo_handler_1 = jasmine.createSpy('foo handler 1');
            foo_handler_2 = jasmine.createSpy('foo handler 2');
            bar_handler = jasmine.createSpy('bar handler');
            obj.onFoo(foo_handler_1);
            obj.onFoo(foo_handler_2);
            obj.onBar(bar_handler);
        });

        describe("removeHandlers(name)", function () {
            it("should remove all handlers for the given event name", function () {
                obj.removeHandlers("foo");
                obj.triggerFoo();
                expect(foo_handler_1).not.toHaveBeenCalled();
                expect(foo_handler_2).not.toHaveBeenCalled();
            });

            it("should not affect handlers for other events", function () {
                obj.removeHandlers("foo");
                obj.triggerBar();
                expect(bar_handler).toHaveBeenCalled();
            });
        });

        describe("removeHandler(name, handler)", function () {
            it("should remove the handler with the given name and function object", function () {
                obj.removeHandler("foo", foo_handler_1);
                obj.triggerFoo();
                expect(foo_handler_1).not.toHaveBeenCalled();
            });

            it("should not remove other handlers on the same event", function () {
                obj.removeHandler("foo", foo_handler_1);
                obj.triggerFoo();
                expect(foo_handler_2).toHaveBeenCalled();
            });

            it("should not remove the same function object from other events", function () {
                obj.onBar(foo_handler_1);
                obj.removeHandler("foo", foo_handler_1);
                obj.triggerBar();
                expect(foo_handler_1).toHaveBeenCalled();
            });

            // TODO: not sure if this is desirable! If the function isn't an existing handler,
            // that's probably a bug, so we should probably throw an exception instead?
            it("should do nothing if the function object unknown", function () {
                obj.removeHandler("foo", bar_handler);
                obj.triggerFoo();
                expect(foo_handler_1).toHaveBeenCalled();
            });
        });

        describe("onceOn", function () {
            it("should be triggered", function () {
                foo_handler_1 = jasmine.createSpy('foo handler 1');
                obj.onceOn('foo', foo_handler_1);
                obj.triggerFoo(1);
                expect(foo_handler_1).toHaveBeenCalledWith(1);
            });
            it("should not be triggered twice", function () {
                foo_handler_1 = jasmine.createSpy('foo handler 1');
                obj.onceOn('foo', foo_handler_1);
                obj.triggerFoo(1);
                obj.triggerFoo(2);
                expect(foo_handler_1).toHaveBeenCalledWith(1);
                expect(foo_handler_1).not.toHaveBeenCalledWith(2);
            });
        });
    });
});
