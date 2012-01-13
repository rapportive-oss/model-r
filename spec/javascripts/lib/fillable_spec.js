describe('fillable', function () {

    function name (context, value) {
        var _public = {}, _protected = {};

        lib.fillable(_public, _protected, function (value) {
            _public.value = value;
        }, 'value')(value);

        _public.context = context;

        return _public;
    }

    function membership(context, data) {
        var _public = {}, _protected = {};

        lib.model(_public, _protected, 'profile_url', 'username');
        _public.attributes(data);
        _public.context = context;

        _public.__defineGetter__('identity', function () {
            return _public.profile_url;
        });

        return _public;
    }

    function plan_model(context, data) {
        var _public = {}, _protected = {};

        lib.model(_public, _protected, 'key', 'value');

        return _public;
    }

    function profile (context, data) {
        var _public = {}, _protected = {};

        lib.fillable(_public, _protected, {
            'memberships': [membership],
            'name': name,
            'plan': plan_model
        }, context)(data);

        return _public;
    }

    describe('when creating a new model', function () {

        it('should call the constructor function, if passed', function () {
            expect(name({}, 'Fred').value).toEqual('Fred');
        });

        it('should call attributes if a list of attributes is passed', function () {
            expect(membership({}, {profile_url: 'http://a.com/'}).profile_url).toEqual('http://a.com/');
        });

        it('should pass the context through', function () {
            expect(profile({test: 'context'}, {name: 'Fred'}).name.context.test).toEqual('context');
            expect(profile({test: 'context'}, {memberships: [{}]}).memberships[0].context.test).toEqual('context');
        });

        it('should pass single values through', function () {
            expect(profile({}, {name: 'Fred'}).name.value).toEqual('Fred');
        });

        it('should pass multiple values through', function () {
            var myprofile = profile({}, {memberships: [
                {profile_url: 'http://fb.com/a', site_name: 'Facebook'},
                {profile_url: 'http://twitter.com/b', site_name: 'Twitter'}
            ]});

            expect(myprofile.memberships[0].profile_url).toEqual('http://fb.com/a');
            expect(myprofile.memberships[1].site_name).toEqual('Twitter');
        });

        it('should simply assign unknown things', function () {
            expect(profile({}, {fridge: 'freezer'}).fridge).toEqual('freezer');
        });
    });

    describe('when re-filling a model', function () {
        var myprofile;

        beforeEach(function () {
            myprofile = profile({test: 'context'}, {
                name: 'Fred',
                memberships: [
                    {profile_url: 'http://fb.com/a', username: 'conrad.irwin'},
                    {profile_url: 'http://twitter.com/b', username: 'ConradIrwin'}
                ],
            });
        });

        it('should re-use the existing single objects', function () {
            var name = myprofile.name;
            expect(name.value).toEqual('Fred');
            myprofile.refill({name: 'George'});
            expect(myprofile.name).toBe(name);
            expect(name.value).toEqual('George');
        });

        it('should re-use the relevant array objects', function () {
            var facebook = myprofile.memberships[0],
                twitter  = myprofile.memberships[1];

            expect(facebook.username).toEqual('conrad.irwin');
            expect(twitter.username).toEqual('ConradIrwin');

            myprofile.refill({memberships: [
                {profile_url: 'http://fb.com/a', username: 'darnoc.niwri'},
                {profile_url: 'http://twitter.com/b', username: 'ConradIrwin'}
            ]});

            expect(myprofile.memberships[0]).toBe(facebook);
            expect(myprofile.memberships[1]).toBe(twitter);

            expect(facebook.username).toEqual('darnoc.niwri');
            expect(twitter.username).toEqual('ConradIrwin');
        });

        it('should use the new order', function () {
            var facebook = myprofile.memberships[0],
                twitter  = myprofile.memberships[1];

            myprofile.refill({memberships: [
                {profile_url: 'http://twitter.com/b', username: 'ConradIrwin'},
                {profile_url: 'http://fb.com/a', username: 'conrad.irwin'}
            ]});

            expect(myprofile.memberships[1]).toBe(facebook);
            expect(myprofile.memberships[0]).toBe(twitter);
        });

        it('should create new object if necessary', function () {
            var facebook = myprofile.memberships[0],
                twitter  = myprofile.memberships[1];

            myprofile.refill({memberships: [
                {profile_url: 'http://linkedin.com/a', username: 'ConradIrwin'}
            ]});

            expect([facebook, twitter]).not.toContain(myprofile.memberships[0]);
        });

        it('should remove old objects', function () {
            var facebook = myprofile.memberships[0],
                twitter  = myprofile.memberships[1];

            myprofile.refill({memberships: [
                {profile_url: 'http://linkedin.com/a', username: 'ConradIrwin'}
            ]});

            expect(myprofile.memberships).not.toContain(twitter);
            expect(myprofile.memberships).not.toContain(facebook);
        });

        it("should fire a change event for a property when that property's values are changed", function () {
            var changeDetected = false;

            myprofile.refill({plan: {key: 'first', value: 'plan'}});
            myprofile.onPlanChange(function () {
                changeDetected = true;
            });
            expect(changeDetected).toBe(false);
            myprofile.refill({plan: {key: 'hello', value: 'world'}});
            expect(changeDetected).toBe(true);
        });
    });
});
