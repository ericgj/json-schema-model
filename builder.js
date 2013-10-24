'use strict';

var type = require('type')
  , Enumerable = require('enumerable')
  , has = hasOwnProperty

module.exports = Builder;

function Builder(schema){
  if (!(this instanceof Builder)) return new Builder(schema);
  this._schema = schema;
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
  if (!coerced) return;

  var coinst = coerced.instance
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

Accessor.prototype.build = function(instance){
  this._instance = instance;
  return this;
}

Accessor.prototype.toObject = function(){
  return this._instance;
}



function Model(schema){
  if (!(this instanceof Model)) return new Model(schema);
  this._schema = schema;
  this._properties = {};
  return this;
}

Model.prototype.schema = function(){
  return this._schema;
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
  }
  return this;
}

Model.prototype.has = function(prop){
  return has.call(this._properties,prop);
}

// note: assumes coerced instance
Model.prototype.build = function(instance){
  this._properties = {};
  if (!instance) return this;
  for (var p in instance){
    this._properties[p] = builtItem.call(this,p,instance[p],instance);
  }
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
  this._items.push( 
    builtItem.call(this,this.length(),value) 
  );
  return this;
}

// note: assumed coerced instance
Collection.prototype.build = function(instance){
  this._items = [];
  if (!instance) return this;
  for (var i=0;i<instance.length;++i){
    this._items.push( 
      builtItem.call(this,i,instance[i],instance) 
    );
  }
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

