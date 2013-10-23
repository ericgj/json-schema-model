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
    
    function buildFixtureCorr(schemakey,instkey){
      var schema = new Schema().parse(fixtures.obj.schema[schemakey])
        , inst = fixtures.obj.instance[instkey]
      return schema.bind(inst);
    }

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
    })

    /* Note: I'm not sure about this, but parsing uncoerced instances
       seems fraught with complications, so making it impossible for now
    */
    it('should not parse if object cannot be coerced (invalid)', function(){
      var subject = buildFixture('defaults','invalid')
      console.log('object invalid parse: %o',subject);
      assert(!subject);
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


