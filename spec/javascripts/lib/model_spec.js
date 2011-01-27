describe("lib.model", function () {
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
            example_model.array_attr = ["abc", [subModel(2, "b")], {obj: subModel(3, "c")}]
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

        it("should not fire the original's event handlers when the clone is modified", function () {
            var changes = 0;
            example_model.onNumberAttrChange(function () {
                changes += 1;
            });
            var clone = example_model.clone();
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
});
