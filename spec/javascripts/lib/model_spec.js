/*jslint nomen: false, onevar: false */
/*global describe, it, expect, beforeEach, lib, _, jQuery, jasmine */
describe("lib.model", function () {
    describe("attributes", function () {
        function consistentModel() {
            var _public = {}, _protected = {};
            lib.model(_public, _protected, "number", "string");
            return _public;
        }

        it("should update all attributes", function () {
            var a = consistentModel();
            a.attributes({number: 1, string: '1'});
            expect(a.number).toEqual(1);
            expect(a.string).toEqual('1');
        });

        it("should fire change events for all attributes", function () {
            var a = consistentModel(), number, string;
            a.onNumberChange(function (n) {
                number = n;
            });
            a.onStringChange(function (s) {
                string = s;
            });
            a.attributes({number: 1, string: '1'});
            expect(number).toEqual(1);
            expect(string).toEqual('1');
        });

        it("should wait until all attributes have been updated before firing events", function () {
            var a = consistentModel(), number, string;
            a.onNumberChange(function () {
                expect(a.number.toString()).toEqual(a.string);
            });

            a.onStringChange(function () {
                expect(a.number.toString()).toEqual(a.string);
            });

            a.onChange(function () {
                expect(a.number.toString()).toEqual(a.string);
            });

            a.attributes({number: 1, string: '1'});
        });

        it("should fire events for changes that happen in change handlers of transactions", function () {
            var a = consistentModel(), number, string;
            a.onStringChange(function (s) {
                a.number = parseInt(s, 10);
            });
            a.onNumberChange(function (n) {
                number = n;
            });

            a.attributes({string: '42'});
            expect(number).toEqual(42);
        });

        it("may call onAttributeChange more than once per transaction if necesssary", function () {
            var a = consistentModel(), numbers = [];
            a.onStringChange(function (s) {
                a.number = parseInt(s, 10);
            });
            a.onNumberChange(function (n) {
                numbers.push(n);
            });

            a.attributes({number: 8, string: '42'});
            expect(numbers).toEqual([8, 42]);

        });

        it("should trigger onChange once per transaction", function () {
            var a = consistentModel(), callcount = 0;
            a.onStringChange(function (s) {
                a.number = parseInt(s, 10);
            });
            a.onChange(function (s) {
                callcount += 1;
            });

            a.attributes({string: '42', number: 8});
            expect(callcount).toEqual(1);
        });

        it("should allow setting things to undefined", function () {
            var a = consistentModel();
            var spy = jasmine.createSpy();

            a.string = "1";
            a.onStringChange(spy);
            a.string = undefined;

            expect(a.string).not.toBeDefined();
            expect(spy).toHaveBeenCalled();
        });
    });


    describe("whenEqual", function () {
        function lunch(what_to_eat) {
            var _public = {}, _protected = {};
            lib.model(_public, _protected, "noms");
            _public.noms = what_to_eat;
            return _public;
        }

        it("should call the callback immediately if the attribute currently has the right value", function () {
            var happy_me = jasmine.createSpy();
            var today = lunch("bagels");
            today.whenEqual("noms", "bagels", happy_me);
            expect(happy_me.callCount).toEqual(1);
        });

        it("should not call the callback twice if the value is unset and set again", function () {
            var happy_me = jasmine.createSpy();
            var today = lunch("bagels");
            today.whenEqual("noms", "bagels", happy_me);
            today.noms = "petit fours";
            today.noms = "bagels";
            expect(happy_me.callCount).toEqual(1);
        });

        it("should delay the callback until the right value is set", function () {
            var happy_me = jasmine.createSpy();
            var today = lunch("pizza");
            today.whenEqual("noms", "bagels", happy_me);
            expect(happy_me.callCount).toEqual(0);
            today.noms = "bagels";
            expect(happy_me.callCount).toEqual(1);
        });

        it("should not call the callback multiple times on repeated assignment", function () {
            var happy_me = jasmine.createSpy();
            var today = lunch("pizza");
            today.whenEqual("noms", "bagels", happy_me);
            today.noms = "bagels";
            today.noms = "tequila";
            today.noms = "bagels";
            today.noms = "concrete slabs";
            expect(happy_me.callCount).toEqual(1);
        });

        it("should let me register multiple callbacks on the same property", function () {
            var happy_me = jasmine.createSpy();
            var less_happy = jasmine.createSpy();
            var today = lunch("sandwich");
            today.whenEqual("noms", "bagels", happy_me);
            today.whenEqual("noms", "cake", happy_me);
            today.whenEqual("noms", "sandwich", less_happy);
            expect(less_happy.callCount).toEqual(1); // I'm less happy because it was sandwiches today
            expect(happy_me.callCount).toEqual(0);
            today.noms = "bagels"; // w00t!
            expect(less_happy.callCount).toEqual(1);
            expect(happy_me.callCount).toEqual(1); // nomnom
            today.noms = "cake";
            expect(less_happy.callCount).toEqual(1);
            expect(happy_me.callCount).toEqual(2); // epic noms
            today.noms = "sandwich"; // shouldn't change anything
            expect(less_happy.callCount).toEqual(1);
            expect(happy_me.callCount).toEqual(2);
        });

        it("should let me have multiple callbacks on same property value", function () {
            var happy_me = jasmine.createSpy();
            var sad_me = jasmine.createSpy();
            var schizophrenia = lunch("everything");
            schizophrenia.whenEqual("noms", "everything", happy_me);
            schizophrenia.whenEqual("noms", "everything", sad_me);
            schizophrenia.whenEqual("noms", "bagels", happy_me);
            expect(happy_me.callCount).toEqual(1);
            expect(sad_me.callCount).toEqual(1);
        });

        it("should call the callbacks with this set correctly", function () {
            var today = lunch("burittos");
            today.whenEqual("noms", "burittos", function () {
                expect(this).toBe(today);
            });
            today.wheneverEqual("noms", "burittos", function () {
                expect(this).toBe(today);
            });
            today.whenEqual("noms", "tortillas", function () {
                expect(this).toBe(today);
            });
            today.wheneverEqual("noms", "tortillas", function () {
                expect(this).toBe(today);
            });
            today.noms = "tortillas";
            today.noms = "burrittos";
        });
    });


    describe("wheneverEqual", function () {
        function weather(sun) {
            var _public = {}, _protected = {};
            lib.model(_public, _protected, "sun");
            _public.sun = sun;
            return _public;
        }

        it("should call the callback immediately when the attribute currently has the right value", function () {
            var happy_me = jasmine.createSpy();
            var today = weather("shining");
            today.wheneverEqual("sun", "shining", happy_me);
            expect(happy_me.callCount).toEqual(1);
        });

        it("should call the callback whenever the right value is assigned", function () {
            var happy_me = jasmine.createSpy();
            var today = weather("clouded up");
            today.wheneverEqual("sun", "shining", happy_me);
            expect(happy_me.callCount).toEqual(0);
            today.sun = "shining";
            expect(happy_me.callCount).toEqual(1);
            today.sun = "eclipse";
            expect(happy_me.callCount).toEqual(1);
            today.sun = "shining";
            expect(happy_me.callCount).toEqual(2);
            today.sun = "behind a concrete wall";
            expect(happy_me.callCount).toEqual(2);
        });
    });

    describe("cloneable", function () {

        var instance_number, example_model;

        function superModel() {
            var _public = {}, _protected = {};
            lib.model(_public, _protected, "number_attr", "string_attr", "model_attr", "array_attr", "object_attr");
            _protected.cloneable(superModel);
            return _public;
        }

        function subModel(id, value) {
            var _public = {}, _protected = {};
            lib.model(_public, _protected, "id", "value");
            _protected.cloneable(subModel);
            _public.id = id;
            _public.value = value;
            _public.instance_number = instance_number;
            instance_number += 1;
            return _public;
        }

        function uncloneable(value1, value2) {
            var _public = {}, _protected = {};
            lib.model(_public, _protected, "values");
            _public.values = [value1, value2];
            return _public;
        }

        beforeEach(function () {
            instance_number = 0;
            example_model = superModel();
            example_model.number_attr = 42;
            example_model.string_attr = "hello";
            example_model.model_attr = uncloneable(1, "a");
            example_model.array_attr = ["abc", [subModel(2, "b")], {obj: subModel(3, "c")}];
            example_model.object_attr = {number: 123, string: "string", model: subModel(4, "d")};
        });

        it("should create a public clone() method", function () {
            expect(typeof(example_model.clone)).toEqual("function");
        });

        it("should clone model attribute values", function () {
            var clone = example_model.clone();
            expect(clone.number_attr).toEqual(42);
            expect(clone.string_attr).toEqual("hello");
            expect(clone.model_attr.values).toEqual([1, "a"]);
            expect(clone.array_attr.length).toEqual(3);
            expect(_(clone.array_attr).isArray()).toBeTruthy();
            expect(clone.array_attr[0]).toEqual("abc");
            expect(clone.array_attr[1].length).toEqual(1);
            expect(clone.array_attr[1][0].id).toEqual(2);
            expect(_(clone.object_attr).isArray()).toBeFalsy();
            expect(clone.object_attr.number).toEqual(123);
            expect(clone.object_attr.string).toEqual("string");
            expect(clone.object_attr.model.id).toEqual(4);
        });

        it("should cope with null values", function () {
            example_model.object_attr = null;
            var clone = example_model.clone();
            expect(clone.number_attr).toEqual(42);
            expect(clone.object_attr).toEqual(null);
        });

        it("should make the original and the clone independent of each other", function () {
            var clone = example_model.clone();
            example_model.string_attr = "asdf";
            expect(clone.string_attr).toEqual("hello");
            clone.string_attr = "foo";
            expect(example_model.string_attr).toEqual("asdf");
        });

        it("should deep clone attributes that are arrays", function () {
            var clone = example_model.clone();
            clone.array_attr[0] = "xyz";
            clone.array_attr.push(subModel(9999, "lol"));
            expect(example_model.array_attr[0]).toEqual("abc");
            expect(example_model.array_attr[1].length).toEqual(1);
        });

        it("should deep clone attributes that are objects", function () {
            var clone = example_model.clone();
            clone.object_attr.number = 321;
            clone.object_attr.foo = "bar";
            expect(example_model.object_attr.number).toEqual(123);
            expect(example_model.object_attr.foo).not.toBeDefined();
        });

        it("should deep clone cloneable model objects", function () {
            var clone = example_model.clone();
            expect(example_model.object_attr.model.instance_number).toEqual(2);
            expect(clone.object_attr.model.instance_number).toBeOneOf(3, 4, 5);
            clone.array_attr[2].obj.value = "ccc";
            clone.object_attr.model.value = "ddd";
            expect(example_model.array_attr[2].obj.value).toEqual("c");
            expect(example_model.object_attr.model.value).toEqual("d");
        });

        it("should cope with circular references", function () {
            example_model.model_attr.values = [example_model];
            example_model.object_attr.model.value = example_model;
            var clone = example_model.clone(),
                other_clone = example_model.object_attr.model.clone();
            expect(clone.model_attr.values[0]).toBe(clone);
            expect(clone.object_attr.model.value).toBe(clone);
            expect(other_clone.value.object_attr.model).toBe(other_clone);
        });

        it("should cope with tight-loops of circular references", function () {
            example_model.object_attr.loop = example_model.object_attr;
            var clone = example_model.clone();
            expect(clone.object_attr).toNotBe(example_model.object_attr);
            expect(clone.object_attr).toBe(clone.object_attr.loop);
        });

        it("should not fire the original's event handlers when the clone is modified", function () {
            var changes = 0, clone;
            example_model.onNumberAttrChange(function () {
                changes += 1;
            });
            clone = example_model.clone();
            clone.number_attr = 12345678;
            expect(changes).toEqual(0);
            example_model.number_attr = 12345678;
            expect(changes).toEqual(1);
        });

        it("should not fire the clone's event handlers when the original is modified", function () {
            var clone = example_model.clone(), changes = 0;
            clone.onNumberAttrChange(function () {
                changes += 1;
            });
            example_model.number_attr = 12345678;
            expect(changes).toEqual(0);
            clone.number_attr = 12345678;
            expect(changes).toEqual(1);
        });
    });

    describe("lib.model.object_fields", function () {
        function objectModel() {
            var _public = {}, _protected = {};
            lib.model.object_fields(_public, _protected, "numbers");
            return _public;
        }
        it("should fire event handlers when a value is replaced by another", function () {
            var ns = [],
                model = objectModel();
        
            model.onNumbersChange(function (new_ns) {
                ns.push(new_ns);
            });

            model.numbers = [1, 2];
            model.numbers = [1, 2, 3];
            expect(ns).toEqual([[1, 2], [1, 2, 3]]);
        });

        it("should not fire event handlers when an object is replaced by a similar one", function () {
            var ns = [],
                model = objectModel();
            model.onNumbersChange(function (new_ns) {
                ns.push(new_ns);
            });
            model.numbers = [1, 2, 3];
            model.numbers = [1, 2, 3];
            expect(ns).toEqual([[1, 2, 3]]);
        });

        it("should debounce similar jQuery objects", function () {
            var ns = [],
                model = objectModel(),
                init = jQuery("p");
            model.onNumbersChange(function (new_ns) {
                ns.push(new_ns);
            });
            model.numbers = init;
            model.numbers = jQuery("p");
            expect(ns).toEqual([init]);
        });

        it("should not debounce different jQuery objects", function () {
            var ns = [],
                model = objectModel(),
                before, after;

            model.onNumbersChange(function (new_ns) {
                ns.push(new_ns);
            });
            model.numbers = before = jQuery("p");
            jQuery("body").append("<p>");
            model.numbers = after = jQuery("p");
            expect(ns).toEqual([before, after]);
        });
    });
});
