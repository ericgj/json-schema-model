'use strict';

var type = require('type')
  , Enumerable = require('enumerable')
  , Emitter = require('emitter')
  , has = hasOwnProperty

module.exports = Builder;

function Builder(schema){
  if (!(this instanceof Builder)) return new Builder(schema);
  this._schema = schema || new Schema();
  return this;
}

Builder._types = {};

Builder.addType = function(type,klass){
  this._types[type] = klass;
}

Builder.getType = function(type){
  return this._types[type];
}

Builder.prototype.build = function(instance){
  var schema = this._schema
  if (!schema) return;

  var correlation = schema.bind(instance)
    , coerced = correlation.coerce()
  // if (!coerced) return;

  var coinst = (coerced && coerced.instance) || instance
    , t = type(coinst);

  var klass = Builder.getType(t) || Accessor
  return new klass(schema).build(coinst);
}


///// Exposures

Builder.Accessor = Accessor;
Builder.Model = Model;
Builder.Collection = Collection;


///// Default parser classes

function Accessor(schema){
  if (!(this instanceof Accessor)) return new Accessor(schema);
  this._schema = schema;
  this._instance = undefined;
  this._errors = [];
  return this;
}

Accessor.prototype.schema = function(schema){
  if (schema === undefined){
    return this._schema;
  } else {
    this._schema = schema;
    return this;
  }
}

Accessor.prototype.get = function(){
  return this.toJSON();  
}

Accessor.prototype.set = function(instance){
  this.build(instance);
  return this;
}

Accessor.prototype.errors = function(){
  return this._errors;
}

Accessor.prototype.addError = function(err){
  this._errors.push(err);
}

Accessor.prototype.resetErrors = function(){
  this._errors = [];
}

Accessor.prototype.validate = function(){
  return validate.call(this);
}

Accessor.prototype.build = function(instance){
  this.resetErrors();
  this._instance = instance;
  return this;
}

Accessor.prototype.toJSON = function(){
  return this._instance;
}



function Model(schema){
  if (!(this instanceof Model)) return new Model(schema);
  this._schema = schema || new Schema();
  this._properties = {};
  this._errors = [];
  return this;
}

Emitter(Model);
Model.prototype = new Emitter();

Model.use = function(plugin){
  plugin(this);
  return this;
}

Model.prototype.schema = function(schema){
  if (schema === undefined){
    return this._schema;
  } else {
    this._schema = schema;
    return this;
  }
}

Model.prototype.has = function(prop){
  return has.call(this._properties,prop);
}

Model.prototype.get = function(prop){
  if (arguments.length == 0){
    return this.toJSON();
  } else {
    var prop = this._properties[prop]
    return prop && prop.get();
  }
}

Model.prototype.set = function(prop,value){
  if (arguments.length == 1){
    value = prop; prop = undefined;
    this.build(value);
  } else {
    var prev = this._properties[prop]
    this._properties[prop] = builtItem.call(this,prop,value);
    Model.emit('change', this, prop, value, prev);
    Model.emit('change '+prop, this, value, prev);
    this.emit('change', prop, value, prev);
    this.emit('change '+prop, value, prev);
  }
  return this;
}

Model.prototype.invalidProperties = function(){
  var ret = [];
  for (var p in this._properties){
    var prop = this._properties[p]
      , errs = prop.errors()
    if (errs && errs.length > 0) ret.push(p);
  }
  return ret;
}

Model.prototype.errors = function(prop){
  if (prop === undefined){
    return this._errors;
  } else {
    var prop = this._properties[prop];
    return prop && prop.errors();
  }
}

Model.prototype.addError = function(err,prop){
  if (prop === undefined){
    this._errors.push(err);
  } else {
    var prop = this._properties[prop]
    if (prop){
      prop.addError(err);
    } else { // if for some reason error prop doesn't exist
      this.addError(err);
    }
  }
}

// note resets errors down the tree
Model.prototype.resetErrors = function(){
  this._errors = [];
  for (var p in this._properties){
    var prop = this._properties[p]
    prop.resetErrors();
  }
}

Model.prototype.validate = function(){
  return validate.call(this);
}

// note: assumes coerced instance
Model.prototype.build = function(instance){
  this._properties = {};
  this.resetErrors();
  if (!instance) return this;
  for (var p in instance){
    this._properties[p] = builtItem.call(this,p,instance[p],instance);
  }
  Model.emit('change', this);
  this.emit('change');
  return this;
}

Model.prototype.toJSON = function(){
  var ret = {};
  for (var p in this._properties) ret[p] = this.get(p);
  return ret;
}


function Collection(schema){
  if (!(this instanceof Collection)) return new Collection(schema);
  this._schema = schema;
  this._items = [];
  return this;
}

Collection.use = function(plugin){
  plugin(this);
  return this;
}

Emitter(Collection);
Collection.prototype = new Emitter();

Enumerable(Collection.prototype);

Collection.prototype.length = function(){ 
  return this._items.length; 
}
Collection.prototype.getModel = function(i){ 
  return this._items[i]; 
}
Collection.prototype.__iterate__ = function(){ 
  var self = this;
  return {
    length: self.length.bind(self), 
    get: self.getModel.bind(self)   // or this.get ?
  }
}

Collection.prototype.schema = function(schema){
  if (schema === undefined){
    return this._schema;
  } else {
    this._schema = schema;
    return this;
  }
}

Collection.prototype.has = function(i){
  return has.call(this._items,i);
}

Collection.prototype.get = function(i)  { 
  if (arguments == 0){
    return this.toJSON();
  } else {
    var item = this._items[i]
    return item && item.get(); 
  }
}

Collection.prototype.add =
Collection.prototype.push = function(value){
  var item = builtItem.call(this,this.length(),value) 
    , len = this._items.push(item)
  Collection.emit('add', this, len - 1, item);
  this.emit('add', len - 1, item);
  return this;
}

Collection.prototype.remove = function(i){
  var item = this._items[i];
  if (item) this._items.splice(i,1);
  Collection.emit('remove', this, i, item);
  this.emit('remove', i, item);
  return this;
}

Collection.prototype.invalidItems = function(){
  var ret = [];
  for (var i=0;i<this.length();++i){
    var item = this._items[i]
      , errs = item.errors()
    if (errs && errs.length > 0) ret.push(i);
  }
  return ret;
}

Collection.prototype.errors = function(i){
  if (arguments.length == 0){
    return this._errors;
  } else {
    var item = this._items[i];
    return item && item.errors();
  }
}

Collection.prototype.addError = function(err,i){
  if (arguments.length == 1){
    this._errors.push(err);
  } else {
    var item = this._items[i]
    if (item){
      item.addError(err);
    } else { // if for some reason error index doesn't exist
      this.addError(err);
    }
  }
}

// note resets errors down the tree
Collection.prototype.resetErrors = function(){
  this._errors = [];
  for (var i=0;i<this._items.length;++i){
    var item = this._items[i]
    item.resetErrors();
  }
}

Collection.prototype.validate = function(){
  return validate.call(this);
}

// note: assumed coerced instance
Collection.prototype.build = function(instance){
  this._items = [];
  this.resetErrors();
  if (!instance) return this;
  for (var i=0;i<instance.length;++i){
    var item = builtItem.call(this,i,instance[i],instance) 
    this._items.push(item);
    this.emit('add', item);
  }
  Collection.emit('change',this);
  this.emit('change');
  return this;
}

Collection.prototype.toJSON = function(){
  var ret = [];
  this.eachObject( function(obj){
    ret.push( obj )
  })
  return ret;
}

Collection.prototype.eachObject = function(fn){
  this.each( function(item){
    fn(item.get());
  })
}


// private 

// note used by both Model and Collection
function builtItem(prop,value,instance){
  instance = instance || this.toJSON();
  var schema = this.schema()
    , corr = schema.bind(instance).coerce()
    , instance = corr.instance || instance
    , sub = schema.bind(instance).subschema(prop)
  return Builder(sub).build(value);
}

// note returns true if validate not defined
function validate(){
  var model = this
    , corr = toCorrelation.call(this)
  this.resetErrors();
  corr.once('error', function(err){
    attachError.call(model,err);
  });
  var ret = !corr.validate || corr.validate();
  this.emit('validated', ret);
  return ret;
}

function toCorrelation(){
  var schema = this.schema()
    , instance = this.toJSON()
    , corr = schema.bind(instance)
  return corr
}

function attachError(err){
  var tree = err.tree
    , asserts = tree.assertions()
    , branches = tree.branches()
  for (var i=0;i<asserts.length;++i){
    this.addError(asserts[i]);
  }
  for (var i=0;i<branches.length;++i){
    var subtree = branches[i]
      , subasserts = subtree.assertions()
      for (var j=0;j<subasserts.length;++j){
        var path = subasserts[j].instancePath
          , prop = (path == undefined) ? undefined : path.split('/')[0]
        this.addError(subasserts[j], prop);
      }
  }
}

