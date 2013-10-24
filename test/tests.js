'use strict';

var isBrowser = require('is-browser')
  , assert = require('assert') 
  , core  = isBrowser ? require('json-schema-core') : require('json-schema-core-component')
  , Valid  = isBrowser ? require('json-schema-valid') : require('json-schema-valid-component')
  , Builder = isBrowser ? require('json-schema-model') : require('json-schema-model-component')
  , Schema = core.Schema
  , has = hasOwnProperty

Schema.use(Valid);

var fixtures = {};


///////////////////////////////////

describe('json-schema-model', function(){
  describe('Builder: object schema', function(){
    
    function buildFixture(schemakey,instkey){
      var schema = new Schema().parse(fixtures.obj.schema[schemakey])
        , inst = fixtures.obj.instance[instkey]
      return new Builder(schema).build(inst);
    }

    it('should parse valid object', function(){ 
      var subject = buildFixture('simple','valid')
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
      var subject = buildFixture('defaults','defaults')
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
      var subject = buildFixture('defaults','invalid')
      console.log('object invalid parse: %o',subject);
      assert(subject);
      assert(fixtures.obj.instance.invalid.two);
      assert.deepEqual(subject.get('two'), fixtures.obj.instance.invalid.two);
      assert(subject.validate() == false)
    })

  })

  describe('Builder: array schema', function(){
    
    function buildFixture(schemakey,instkey){
      var schema = new Schema().parse(fixtures.array.schema[schemakey])
        , inst = fixtures.array.instance[instkey]
      return new Builder(schema).build(inst);
    }

    it('should parse valid array', function(){ 
      var subject = buildFixture('simple','valid')
      console.log('array parse: %o',subject);
      assert(subject);
      assert(fixtures.array.instance.valid.length == 3);
      assert.deepEqual(subject.get(0), fixtures.array.instance.valid[0]);
      assert.deepEqual(subject.get(1), fixtures.array.instance.valid[1]);
      assert.deepEqual(subject.get(2), fixtures.array.instance.valid[2]);
      assert(subject.validate() == true);
    })

    it('should parse valid array, with schema defaults', function(){
      var subject = buildFixture('defaults','defaults')
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
      var subject = buildFixture('defaults','invalid')
      console.log('array invalid parse: %o',subject);
      assert(subject);
      assert(fixtures.array.instance.invalid[2]);
      assert.deepEqual(subject.get(2), fixtures.array.instance.invalid[2]);
      assert(subject.validate() == false);
    })

  })

  describe('Model#set', function(){

    function buildFixture(schemakey,instkey){
      var schema = new Schema().parse(fixtures.modelset.schema[schemakey])
        , inst = fixtures.modelset.instance[instkey]
      return new Builder(schema).build(inst);
    }

    it('should set new property covered by schema', function(){
      var subject = buildFixture('simple','simple')
      subject.set('three', true);
      console.log('model set new: %o', subject);
      assert(subject.get('three') == true);
    })
    
    it('should update existing property covered by schema', function(){
      var subject = buildFixture('simple','simple')
      subject.set('two', 3);
      console.log('model set existing: %o', subject);
      assert(subject.get('two') === 3);
    })

    it('should set property not covered by schema', function(){
      var subject = buildFixture('simple','simple')
      subject.set('four', 'imaginary');
      console.log('model set no subschema: %o', subject);
      assert(subject.get('four') == 'imaginary');
    })

    it('should apply default (coerce) when setting object property covered by schema', function(){
      var subject = buildFixture('defaults','simple')
      subject.set('four', {one: '11'} );
      console.log('model set apply default: %o', subject);
      assert(subject.get('four'));
    })
    
    it('should set property covered by a different combination schema', function(){
      var subject = buildFixture('combo','simple')
      subject.set('one', { some: 'object'} );
      console.log('model set combo: %o', subject);
      assert.deepEqual(subject.get('one'), { some: 'object' });
    })

    it('should allow invalid set property', function(){
      var subject = buildFixture('simple','simple')
      subject.set('one', 11);
      console.log('model set invalid: %o', subject);
      assert(subject.get('one') == 11);
      assert(subject.validate() == false);
    })

    it('should rebuild itself if no property specified', function(){
      var subject = buildFixture('simple','simple')
      subject.set({ two: 22, three: true });
      console.log('model rebuild: %o', subject);
      assert(subject.get('two') == 22);
      assert(subject.get('three') == true);
      assert(!subject.has('one'));
    })
    
    it('should rebuild itself covered by a different combination schema', function(){
      var subject = buildFixture('combotop','combo1')
      subject.set(fixtures.modelset.instance.combo2);
      console.log('model rebuild combo: %o', subject);
      assert.deepEqual(subject.toObject(), fixtures.modelset.instance.combo2);
      assert(subject.validate() == true);
    })

    it('should allow invalid rebuild', function(){
      var subject = buildFixture('combotop','combo1')
      subject.set(fixtures.modelset.instance.comboinvalid);
      console.log('model rebuild invalid: %o', subject);
      assert.deepEqual(subject.toObject(), fixtures.modelset.instance.comboinvalid);
      assert(subject.validate() == false);
    })

  })

})


fixtures.obj = {};
fixtures.obj.schema = {};
fixtures.obj.schema.simple = {
  type: 'object',
  properties: {
    one: { type: 'string' },
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


