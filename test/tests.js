'use strict';

var isBrowser = require('is-browser')
  , assert = require('assert') 
  , core  = isBrowser ? require('json-schema-core') : require('json-schema-core-component')
  , Valid  = isBrowser ? require('json-schema-valid') : require('json-schema-valid-component')
  , Hyper  = isBrowser ? require('json-schema-hyper') : require('json-schema-hyper-component')
  , Builder = isBrowser ? require('json-schema-model') : require('../index')
  , Sync = isBrowser ? require('json-schema-model/sync') : require('../sync')
  , Schema = core.Schema
  , has = hasOwnProperty

Schema.use(Valid);
Schema.use(Hyper);

var fixtures = {};


///////////////////////////////////

function buildFixture(type,schemakey,instkey){
  var schema = new Schema().parse(fixtures[type].schema[schemakey])
    , inst = fixtures[type].instance[instkey]
  return new Builder(schema).build(inst);
}

describe('json-schema-model', function(){
  describe('Builder: object schema', function(){
    
    it('should parse valid object', function(){ 
      var subject = buildFixture('obj','simple','valid')
      console.log('object parse: %o',subject);
      assert(subject);
      assert(subject.get('one'));
      assert(has.call(fixtures.obj.instance.valid,'one'));
      assert(has.call(fixtures.obj.instance.valid,'two'));
      assert(has.call(fixtures.obj.instance.valid,'three'));
      assert(subject.get('one') == fixtures.obj.instance.valid.one);
      assert(subject.get('two') == fixtures.obj.instance.valid.two);
      assert(subject.get('three') == fixtures.obj.instance.valid.three);
      assert(subject.validate() == true);
    })

    it('should parse valid object, with schema defaults', function(){
      var subject = buildFixture('obj','defaults','defaults')
      console.log('object defaults parse: %o',subject);
      assert(subject);
      assert(has.call(fixtures.obj.schema.defaults['default'],'one'));
      assert(has.call(fixtures.obj.instance.defaults,'two'));
      assert(has.call(fixtures.obj.schema.defaults['default'],'three'));
      assert(subject.get('one') == fixtures.obj.schema.defaults['default'].one);
      assert(subject.get('two') == fixtures.obj.instance.defaults.two);
      assert(subject.get('three') == fixtures.obj.schema.defaults['default'].three);
      assert(subject.validate() == true);
    })

    it('should parse if object cannot be coerced (invalid)', function(){
      var subject = buildFixture('obj','defaults','invalid')
      console.log('object invalid parse: %o',subject);
      assert(subject);
      assert(fixtures.obj.instance.invalid.two);
      assert.deepEqual(subject.get('two'), fixtures.obj.instance.invalid.two);
      assert(subject.validate() == false)
    })

  })

  describe('Builder: array schema', function(){
    
    it('should parse valid array', function(){ 
      var subject = buildFixture('array','simple','valid')
      console.log('array parse: %o',subject);
      assert(subject);
      assert(fixtures.array.instance.valid.length == 3);
      assert.deepEqual(subject.get(0), fixtures.array.instance.valid[0]);
      assert.deepEqual(subject.get(1), fixtures.array.instance.valid[1]);
      assert.deepEqual(subject.get(2), fixtures.array.instance.valid[2]);
      assert(subject.validate() == true);
    })

    it('should parse valid array, with schema defaults', function(){
      var subject = buildFixture('array','defaults','defaults')
      console.log('array defaults parse: %o',subject);
      assert(subject);
      assert(fixtures.array.instance.defaults.length == 3);
      assert(subject.length() == fixtures.array.instance.defaults.length)
      subject.each(function(item){
        assert(item.has('one'));
        assert(item.has('two'));
        assert(item.has('three'));
      })
      assert(subject.validate() == true);
    })

    it('should parse if array cannot be coerced (invalid)', function(){
      var subject = buildFixture('array','defaults','invalid')
      console.log('array invalid parse: %o',subject);
      assert(subject);
      assert(fixtures.array.instance.invalid[2]);
      assert.deepEqual(subject.get(2), fixtures.array.instance.invalid[2]);
      assert(subject.validate() == false);
    })

  })

  describe('Model#set', function(){

    it('should set new property covered by schema', function(){
      var subject = buildFixture('modelset','simple','simple')
      subject.set('three', true);
      console.log('model set new: %o', subject);
      assert(subject.get('three') == true);
    })
    
    it('should update existing property covered by schema', function(){
      var subject = buildFixture('modelset','simple','simple')
      subject.set('two', 3);
      console.log('model set existing: %o', subject);
      assert(subject.get('two') === 3);
    })

    it('should set property not covered by schema', function(){
      var subject = buildFixture('modelset','simple','simple')
      subject.set('four', 'imaginary');
      console.log('model set no subschema: %o', subject);
      assert(subject.get('four') == 'imaginary');
    })

    it('should apply default (coerce) when setting object property covered by schema', function(){
      var subject = buildFixture('modelset','defaults','simple')
      subject.set('four', {one: '11'} );
      console.log('model set apply default: %o', subject);
      assert(subject.get('four'));
    })
    
    it('should set property covered by a different combination schema', function(){
      var subject = buildFixture('modelset','combo','simple')
      subject.set('one', { some: 'object'} );
      console.log('model set combo: %o', subject);
      assert.deepEqual(subject.get('one'), { some: 'object' });
    })

    it('should allow invalid set property', function(){
      var subject = buildFixture('modelset','simple','simple')
      subject.set('one', '12345678901');  // make invalid
      console.log('model set invalid: %o', subject);
      assert(subject.get('one') == '12345678901');
      assert(subject.validate() == false);
    })

    it('should allow invalid set property, coercing type to valid', function(){
      var subject = buildFixture('modelset','simple','simple')
      subject.set('one', 11);
      console.log('model set invalid: %o', subject);
      assert(subject.get('one') == '11');
      assert(subject.validate() == true);
    })

    it('should rebuild itself if no property specified', function(){
      var subject = buildFixture('modelset','simple','simple')
      subject.set({ two: 22, three: true });
      console.log('model rebuild: %o', subject);
      assert(subject.get('two') == 22);
      assert(subject.get('three') == true);
      assert(!subject.has('one'));
    })
    
    it('should rebuild itself covered by a different combination schema', function(){
      var subject = buildFixture('modelset','combotop','combo1')
      subject.set(fixtures.modelset.instance.combo2);
      console.log('model rebuild combo: %o', subject);
      assert.deepEqual(subject.toJSON(), fixtures.modelset.instance.combo2);
      assert(subject.validate() == true);
    })

    it('should allow invalid rebuild', function(){
      var subject = buildFixture('modelset','combotop','combo1')
      subject.set(fixtures.modelset.instance.comboinvalid);
      console.log('model rebuild invalid: %o', subject);
      assert.deepEqual(subject.toJSON(), fixtures.modelset.instance.comboinvalid);
      assert(subject.validate() == false);
    })

  })

  describe('Collection#add', function(){
     it('needs some tests')
  })

  describe('Model#validate', function(){

    it('should return true when valid', function(){
      var subject = buildFixture('validate','simple','valid')
      assert(subject.validate() == true);
    })

    it('should not have errors when valid', function(){
      var subject = buildFixture('validate','simple','valid')
      subject.validate();
      assert(subject.errors().length == 0);
    })

    it('should have errors when called a second time and not valid', function(){
      var subject = buildFixture('validate','simple','valid')
      subject.validate();
      subject.set('one', '12345678901'); // make invalid
      assert(subject.validate() == false);
      assert(subject.errors().length > 0);
    })

    it('should return false when not valid', function(){
      var subject = buildFixture('validate','simple','invalid')
      assert(subject.validate() == false);
    })

    it('should have errors when not valid', function(){
      var subject = buildFixture('validate','simple','invalid')
      subject.validate();
      console.log('model validate invalid errors: %o',subject.errors());
      assert(subject.errors().length > 0);
    })
    
    it('should have property error when property not valid', function(){
      var subject = buildFixture('validate','simple','invalid')
      subject.validate();
      console.log('model validate invalid property errors: %o',subject.errors('two'));
      assert(subject.errors('two').length > 0);
    })

    it('should not have errors when called a second time and valid', function(){
      var subject = buildFixture('validate','simple','invalid')
      subject.validate();
      subject.set('two',22);  // make valid
      assert(subject.validate() == true);
      assert(subject.errors().length == 0);
    })

    it('should not have property errors when called a second time and valid', function(){
      var subject = buildFixture('validate','simple','invalid')
      subject.validate();
      subject.set(fixtures.validate.instance.valid);
      assert(subject.errors('two').length == 0);
    })

  })

  describe('Collection#validate', function(){

    it('should return true when valid', function(){
      var subject = buildFixture('validate','array','arrayvalid')
      assert(subject.validate() == true);
    })

    it('should not have errors when valid', function(){
      var subject = buildFixture('validate','array','arrayvalid')
      subject.validate();
      assert(subject.errors().length == 0);
    })

    it('should have errors when called a second time and not valid', function(){
      var subject = buildFixture('validate','array','arrayvalid')
      subject.validate();
      subject.add(fixtures.validate.instance.invalid); // make invalid
      assert(subject.validate() == false);
      assert(subject.errors().length > 0);
    })

    it('should return false when not valid', function(){
      var subject = buildFixture('validate','array','arrayinvalid')
      assert(subject.validate() == false);
    })

    it('should have errors when not valid', function(){
      var subject = buildFixture('validate','array','invalid')
      subject.validate();
      console.log('collection validate invalid errors: %o',subject.errors());
      assert(subject.errors().length > 0);
    })
    
    it('should have item error when property not valid', function(){
      var subject = buildFixture('validate','array','arrayinvalid')
      subject.validate();
      console.log('collection validate invalid item errors: %o',subject.errors(2));
      assert(subject.errors(2).length > 0);
    })

    it('should not have errors when called a second time and valid', function(){
      var subject = buildFixture('validate','array','arrayinvalid')
      subject.validate();
      subject.remove(2);  // make valid
      assert(subject.validate() == true);
      assert(subject.errors().length == 0);
    })

    it('should not have item errors when called a second time and valid', function(){
      var subject = buildFixture('validate','array','arrayinvalid')
      subject.validate();
      subject.build(fixtures.validate.instance.arrayvalid);
      assert(subject.errors(2).length == 0);
    })

   
  })
})


var agent = DummyAgent();
var sync = Sync(agent);
Builder.sync(sync);

Builder.Model.on('refreshed', function(model){
  console.log('  <- model refreshed: %o', model.toJSON());
})

Builder.Model.on('refreshing', function(model){
  console.log('  -> model refreshing: %o', model.toJSON());
})

describe('json-schema-model sync unit tests', function(){

  describe('refresh', function(){
    beforeEach( function(){
      agent.reset();
    });

    it('should read edit-form link, and refresh model instance', function(done){
      var subject = buildFixture('sync','refresh-all','simple')
        , expected = subject.schema().bind(subject.toJSON())
        , expectedVal = subject.get('one')
      subject.set('one', '2');  // change
      subject.set('two', 3);    // change
      var link = expected.rel('edit-form')
      assert(link);
      agent.expect(link,null,expected);
      subject.refresh( function(err,_){
        console.log('sync refresh edit-form: %o', subject);
        assert(expectedVal == subject.get('one'));  // reverted
        assert(!subject.has('two'));  // reverted
        done();
      });
    })

    it('should read self link if edit-form link not given, and refresh model instance', function(done){
      var subject = buildFixture('sync','refresh-self','simple')
        , expected = subject.schema().bind(subject.toJSON())
        , expectedVal = subject.get('one')
      subject.set('one', '2');  // change
      subject.set('two', 3);    // change
      var link = expected.rel('self')
      assert(link);
      agent.expect(link,null,expected);
      subject.refresh( function(err,_){
        console.log('sync refresh self: %o', subject);
        assert(expectedVal == subject.get('one'));  // reverted
        assert(!subject.has('two'));  // reverted
        done();
      });
    })

    it('should read full link if self link not given, and refresh model instance', function(done){
      var subject = buildFixture('sync','refresh-full','simple')
        , expected = subject.schema().bind(subject.toJSON())
        , expectedVal = subject.get('one')
      subject.set('one', '2');  // change
      subject.set('two', 3);    // change
      var link = expected.rel('full')
      assert(link);
      agent.expect(link,null,expected);
      subject.refresh( function(err,_){
        console.log('sync refresh full: %o', subject);
        assert(expectedVal == subject.get('one'));  // reverted
        assert(!subject.has('two'));  // reverted
        done();
      });
    })

  })

  describe('create', function(){
    it('should have some integration tests');
  })

  describe('update', function(){
    it('should have some integration tests');
  })

  describe('save', function(){
    it('should have some integration tests');
  })

  describe('del', function(){
    it('should have some integration tests');
  })

})


function DummyAgent(){
  if (!(this instanceof DummyAgent)) return new DummyAgent;
  this._expects = [];
  return this;
}

DummyAgent.prototype.expect = function(link,err,result){
  err = err || null;
  result = result || new Schema().bind({});
  this._expects.push([link,err,result]);
}

DummyAgent.prototype.reset = function(){
  this._expects = [];
}

DummyAgent.prototype.follow = function(link, fn){
  console.log(link.attribute('method') + ' ' + link.attribute('href'));
  var nxt = this._expects[0];
  assert(nxt[0].attribute('href') == link.attribute('href'));
  assert(nxt[0].attribute('method') == link.attribute('method'));
  this._expects.shift();
  fn(nxt[1],nxt[2]);
}


fixtures.obj = {};
fixtures.obj.schema = {};
fixtures.obj.schema.simple = {
  type: 'object',
  properties: {
    one: { type: 'string', maxLength: 10 },
    two: { type: 'number' },
    three: { type: 'boolean' }
  }
}

fixtures.obj.schema.defaults = {
  type: 'object',
  default: { one: "default", three: true },
  properties: {
    one: { type: 'string' },
    two: { type: 'number' },
    three: { type: 'boolean' }
  }
}

fixtures.obj.instance = {};
fixtures.obj.instance.valid = {
  one: "1",
  two: 2,
  three: false
}

fixtures.obj.instance.invalid = {
  two: { bug: "happy" }
}

fixtures.obj.instance.defaults = {
  two: 2
}


fixtures.array = {};
fixtures.array.schema = {};
fixtures.array.schema.simple = {
  type: 'array',
  items: fixtures.obj.schema.simple
}

fixtures.array.schema.defaults = {
  type: 'array',
  items: fixtures.obj.schema.defaults
}

fixtures.array.instance = {};
fixtures.array.instance.valid = [
  { one: "1", two: 2, three: false },
  { one: "11", two: 22, three: true },
  { one: "111", two: 222 }
]

fixtures.array.instance.defaults = [
  { two: 2 },
  { one: "11", two: 22 },
  { two: 222, three: false }
]

fixtures.array.instance.invalid = [
  { one: "1", two: 2, three: false },
  { one: "11", two: 22, three: true },
  { one: 111, two: 222 }
]


fixtures.modelset = {};
fixtures.modelset.schema = {};
fixtures.modelset.schema.simple = fixtures.obj.schema.simple;

fixtures.modelset.schema.defaults = {
  type: 'object',
  properties: {
    one: { type: 'string' },
    two: { type: 'number' },
    three: { type: 'boolean' },
    four: fixtures.obj.schema.defaults
  }
}

fixtures.modelset.schema.combo = {
  type: 'object',
  properties: {
    one: { 
      oneOf: [
        { type: 'string' },
        { type: 'object' }
      ]
    }
  }
}

fixtures.modelset.schema.combotop = {
  type: 'object',
  properties: fixtures.obj.schema.simple,
  maxProperties: 1,
  anyOf: [
    { 
      required: ["one"]
    },
    { 
      required: ["two"]
    }
  ]
}

fixtures.modelset.instance = {};
fixtures.modelset.instance.simple = {
  "one": "1",
  "two": 2
}

fixtures.modelset.instance.combo1 = {
  "two": 2
}

fixtures.modelset.instance.combo2 = {
  "one": "1"
}

fixtures.modelset.instance.comboinvalid = {
  "one": "1",
  "two": 2
}



fixtures.validate = {};
fixtures.validate.schema = {};
fixtures.validate.schema.simple = fixtures.obj.schema.simple;

fixtures.validate.instance = {};
fixtures.validate.instance.valid = fixtures.obj.instance.valid;
fixtures.validate.instance.invalid = fixtures.obj.instance.invalid;

fixtures.validate.schema.array = fixtures.array.schema.simple;
fixtures.validate.instance.arrayvalid = fixtures.array.instance.valid ;
fixtures.validate.instance.arrayinvalid = fixtures.array.instance.invalid ;


fixtures.sync = {};
fixtures.sync.schema = {};
fixtures.sync.schema['refresh-all'] = {
  links: [
    { rel: 'full', href: 'http://full' },
    { rel: 'self', href: 'http://self' },
    { rel: 'edit-form', href: 'http://edit-form' }
  ],
  properties: fixtures.obj.schema.simple.properties
}
fixtures.sync.schema['refresh-self'] = {
  links: [
    { rel: 'self', href: 'http://self' }
  ],
  properties: fixtures.obj.schema.simple.properties
}
fixtures.sync.schema['refresh-full'] = {
  links: [
    { rel: 'full', href: 'http://full' }
  ],
  properties: fixtures.obj.schema.simple.properties
}

fixtures.sync.instance = {};
fixtures.sync.instance.simple = {
  one: '1'
}


