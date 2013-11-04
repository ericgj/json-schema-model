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

Accessor.prototype.errors = function(){
  return this._errors;
}

Accessor.prototype.addError = function(msg){
  this._errors.push(msg);
}

Accessor.prototype.resetErrors = function(){
  this._errors = [];
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
  this._errors = [];
  return this;
}

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
    this._properties[prop] = builtItem.call(this,prop,value);
    this.emit('change '+prop);
  }
  return this;
}

Model.prototype.errors = function(prop){
  if (arguments.length == 0){
    return this._errors;
  } else {
    var prop = this._properties[prop];
    return prop && prop.errors();
  }
}

Model.prototype.addError = function(msg,prop){
  if (arguments.length == 1){
    this._errors.push(msg);
  } else {
    var prop = this._properties[prop]
    if (prop){
      prop.addError(msg);
    } else { // if for some reason error prop doesn't exist
      this.addError(msg);
    }
  }
  this.emit('change errors');
}

// note resets errors down the tree
Model.prototype.resetErrors = function(){
  this._errors = [];
  for (var p in this._properties){
    var prop = this._properties[p]
    prop.resetErrors();
  }
  this.emit('change errors');
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
  this._schema = schema;
  this._items = [];
  return this;
}

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
  this._items.push(item);
  this.emit('add',item);
  return this;
}

Collection.prototype.errors = function(i){
  if (arguments.length == 0){
    return this._errors;
  } else {
    var item = this._items[i];
    return item && item.errors();
  }
}

Collection.prototype.addError = function(msg,i){
  if (arguments.length == 1){
    this._errors.push(msg);
  } else {
    var item = this._items[i]
    if (item){
      item.addError(msg);
    } else { // if for some reason error index doesn't exist
      this.addError(msg);
    }
  }
  this.emit('change errors');
}

// note resets errors down the tree
Collection.prototype.resetErrors = function(){
  this._errors = [];
  for (var i=0;i<this._items.length;++i){
    var item = this._items[i]
    item.resetErrors();
  }
  this.emit('change errors');
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
    this.addError(asserts[i].message);
  }
  for (var i=0;i<branches.length;++i){
    var subtree = branches[i]
      , subasserts = subtree.assertions()
      for (var j=0;j<subasserts.length;++j){
        var path = subasserts[j].instancePath
          , prop = (path == undefined) ? undefined : path.split('/')[0]
        this.addError(subasserts[j].message, prop);
      }
  }
}

