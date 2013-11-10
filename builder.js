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
Builder.Errors = Errors;

///// Default parser classes

function Accessor(schema){
  if (!(this instanceof Accessor)) return new Accessor(schema);
  this._schema = schema;
  this._instance = undefined;
  return this;
}

Accessor.prototype.schema = function(){
  return this._schema;
}

Accessor.prototype.get = function(){
  return this.toObject();  
}

Accessor.prototype.set = function(instance){
  this.build(instance);
  return this;
}

Accessor.prototype.validate = function(){
  return validate.call(this);
}

Accessor.prototype.build = function(instance){
  this._instance = instance;
  return this;
}

Accessor.prototype.toObject = function(){
  return this._instance;
}



function Model(schema){
  if (!(this instanceof Model)) return new Model(schema);
  this._schema = schema || new Schema();
  this._properties = {};
  this._errors = new Errors();
  return this;
}

Emitter(Model);
Model.prototype = new Emitter();

Model.prototype.schema = function(){
  return this._schema;
}

Model.prototype.save = function(){
  if (this.validate()) this.emit('save');
}

Model.prototype.get = function(prop){
  if (arguments.length == 0){
    return this.toObject();
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

Model.prototype.errors = function(){
  return this._errors;
}

Model.prototype.addError = function(err,prop){
  this._errors.add(err,prop);
}

Model.prototype.resetErrors = function(){
  this._errors.reset();
}

Model.prototype.has = function(prop){
  return has.call(this._properties,prop);
}

Model.prototype.validate = function(){
  return validate.call(this);
}

// note: assumes coerced instance
Model.prototype.build = function(instance){
  this._properties = {};
  if (!instance) return this;
  for (var p in instance){
    this._properties[p] = builtItem.call(this,p,instance[p],instance);
  }
  Model.emit('change', this);
  this.emit('change');
  return this;
}

Model.prototype.toObject = function(){
  var ret = {};
  for (var p in this._properties) ret[p] = this.get(p);
  return ret;
}



function Collection(schema){
  if (!(this instanceof Collection)) return new Collection(schema);
  this._schema = schema || new Schema();
  this._items = [];
  this._errors = new Errors();
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

Collection.prototype.schema = function(){
  return this._schema;
}

Collection.prototype.has = function(i){
  return has.call(this._items,i);
}

Collection.prototype.get = function(i)  { 
  if (arguments == 0){
    return this.toObject();
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

Collection.prototype.errors = function(){
  return this._errors;
}

Collection.prototype.addError = function(err,i){
  this._errors.add(err,i);
}

Collection.prototype.resetErrors = function(){
  this._errors.reset();
}

Collection.prototype.validate = function(){
  return validate.call(this);
}

// note: assumed coerced instance
Collection.prototype.build = function(instance){
  this._items = [];
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

Collection.prototype.toObject = function(){
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


function Errors(){
  if (!(this instanceof Errors)) return new Errors();
  this._errs = [];
  this._properrs = {};
  this.reset();
  return this;
}

Emitter(Errors);
Errors.prototype = new Emitter();

Errors.prototype.set =
Errors.prototype.add = function(err,prop){
  if (prop === undefined){
    this._errs.push(err);
    this.length++;
  } else {
    (this._properrs[prop] = this._properrs[prop] || []).push(err);
    this.length++;
  }
  Errors.emit('change', this, prop);
  this.emit('change',prop);
  if (prop !== undefined) {
    Errors.emit('change '+prop, this);
    this.emit('change '+prop);
  }
}

Errors.prototype.get = function(prop){
  if (prop === undefined){
    return this._errs;
  } else {
    return (this._properrs[prop] || []);
  }
}

Errors.prototype.remove = function(prop){
  delete this._properrs[prop];
  this.length--;
  Errors.emit('change '+prop, this);
  this.emit('change '+prop);
}

Errors.prototype.reset = function(){
  for (var prop in this._properrs){
    this.remove(prop);
  }
  this._errs = [];
  this._properrs = {};
  this.length = 0;
  Errors.emit('change', this);
  this.emit('change');
}


// private 

// note used by both Model and Collection
function builtItem(prop,value,instance){
  instance = instance || this.toObject();
  var schema = this.schema()
    , corr = schema.bind(instance)
    , sub = corr.subschema(prop)
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
  return !corr.validate || corr.validate();
}

function toCorrelation(){
  var schema = this.schema()
    , instance = this.toObject()
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

