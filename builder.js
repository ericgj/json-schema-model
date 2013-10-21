

module.exports = Builder;

function Builder(schema){
  if (!(this instanceof Builder)) return new Builder(schema);
  this._schema = schema;
  return this;
}

Builder._types = {};

Builder.addType(type,klass){
  this._types[type] = klass;
}

Builder.getType(type){
  return this._types[type];
}


Builder.prototype.schema = function(){
  return this._schema;
}

Builder.prototype.build = function(instance){
  var schema = this.schema()
    , correlation = schema.bind(instance)
    , t = correlation.type()
  
  if (!t) return new Accessor(schema).build(instance);
  
  var klass = Builder.getType(t)

  if (!klass) return new Accessor(schema).build(instance);

  return new klass(schema).build(instance);
}


// exposures

Builder.Accessor = Accessor;
Builder.Model = Model;
Builder.Collection = Collection;


//

function Accessor(schema){

}

Accessor.prototype.schema = Builder.prototype.schema;

Accessor.prototype.build = function(instance){

}



function Model(schema){
  if (!(this instanceof Model)) return new Model(schema);
  this._schema = schema;
  this._properties = {};
  return this;
}

Model.prototype.schema = Builder.prototype.schema;

Model.prototype.get = function(prop){
  return this._properties[prop];
}

Model.prototype.build = function(instance){
  var schema = this.schema()
  if (type(instance) !== 'object') return new Accessor(schema).build(instance);

  var correlation = schema.bind(instance)
    , default = correlation.default()

  this._properties = default ? default : {};

  for (var prop in instance){
    var val = instance[prop]
      , subschema = correlation.subschema(prop)
    this._properties[prop] = subschema ? new Builder(subschema).build(val)
                                       : new Accessor().build(val);
  }

  return this;
}



function Collection(schema){
  if (!(this instanceof Collection)) return new Collection(schema);
  this._schema = schema;
  this._items = [];
  return this;
}

Collection.prototype.schema = Builder.prototype.schema;

Collection.prototype.get = function(i){
  return this._items[i];
}

Collection.prototype.build = function(instance){
  var schema = this.schema()
  if (type(instance) !== 'array') return new Accessor(schema).build(instance);

  var correlation = schema.bind(instance)

  this._items = [];

  for (var i=0;i<instance.length;++i){
    var val = instance[i]
      , subschema = correlation.subschema(i)
    if (!subschema) return new Accessor().build(val);
    
    var subcorr = subschema.bind(val)
      , item = subcorr.default()

    if (type(item) == 'object' || type(item) == 'array'){
      for (var prop in val) item[prop] = val[prop];
    } else {
      item = val || item;
    }

    this._items.push( new Builder(subschema).build(item) );
  }

  return this;
}

