'use strict';

var type = require('type')

module.exports = IO;

/** 
 * # A REST interface for models using JSON Schema hypermedia conventions.
 *
 * There are two usage forms, a _basic_ usage where links are supplied
 * externally from the models; and a _plugin_ usage, where links are
 * supplied by the model schemas themselves, and where the methods are 
 * bound to the model prototypes.
 *
 * ## Basic usage (links supplied externally):
 *
 *    var io = IO(agent).links(links);  // note links are _resolved_ links
 *
 *    io.read(rel, Builder, fn)   // using given rel(s), or by default, using rel="instances" 
 *    io.readDefault(Builder, fn) // using rel="create-form" or rel="new" or rel="default"
 *    io.refresh(model,fn)        // using rel="edit-form" or rel="self" or rel="full"
 *    io.write(rel, obj, fn)      // using given rel(s)
 *    io.create(model)            // using rel="create"
 *    io.update(model)            // using rel="edit" or rel="update"
 *    io.save(model)              // using rel="edit" or rel="update" or rel="create"
 *    io.del()                    // using rel="self" or rel="full" or rel="delete"
 *
 * ## Plugin usage (links supplied by model):
 *
 *    var io = IO(agent);
 *    Model.use(IO.plugin(io));
 *
 *    model.read(rel,fn);
 *    model.readDefault(fn);
 *    model.refresh(fn);    
 *    model.write(rel,fn);
 *    model.create();  
 *    model.update();  
 *    model.save();
 *    model.del();     
 *
 * Typically, the 'factory' methods `read` and `readDefault` (which don't need
 * reference to a particular model), would be accessed with the 'basic' usage,
 * using links from the 'factory' entity; but depending on how links are 
 * organized in your application, particular models may also have these links in
 * their schemas, so you may also be able to access them with the 'plugin' 
 * usage.
 *
 * ## Customizing link semantics
 *
 * The default link relations used for each action are listed above. They were
 * chosen on the principle of trying IANA standard link relations first
 * (cf. http://www.iana.org/assignments/link-relations/link-relations.html ).
 * However, you can easily override these with your own conventions.
 *
 *    IO.setRels('update','update');  // force update to use rel="update" 
 *
 *    IO.setRels({ 
 *      'read': ['self','full'], 
 *      'readDefault': 'new' 
 *    });                             // set multiple
 *
 *
 * @param {Agent} agent  instance of json-schema-agent or equivalent
 *
 */
function IO(agent){
  if (!(this instanceof IO)) return new IO(agent);
  this.agent = agent;
  this._links = undefined;
  return this;
}

IO._rels = {};

/**
 * Set custom link relation(s) to try for actions.
 * If one argument passed (object), sets multiple.
 * 
 * @param {String|Object} action  single action or object
 * @param {String|Array}  [rels]  link relation or array of rels
 *
 */
IO.setRel =
IO.setRels = function(action,rels){
  if (arguments.length == 1){
    for (var k in action){
      this.setRels(k,action[k]);
    }
  } else {
    rels = type(rels)=='array' ? rels : [rels];
    this._rels[action] = rels
  }
  return this;
}

IO.getRels = function(action){
  return this._rels[action];
}

  
/** 
 * links setter / parser
 * passed links can be 
 *  (1) a raw (unparsed) links array;
 *  (2) a raw links object, e.g. { links: [ ] }
 *  (3) a links node of schema (already parsed)
 *
 * @param {Array|Object|Links} links
 *
 */
IO.prototype.links = function(links){
  this._links = parseLinks(links);
  return this;
}

/**
 * Follow given link relation, or first of given link relations,
 * build and yield a new model from the fetched correlation.
 *
 * If no rel given, by default use the IO.getRels default. 
 *
 * @param {String|Array} [rel='instances']  link rel or array of rels to try
 * @param {Function}     builder            builder function for model
 * @param {Function}     fn                 callback(err,model)
 *
 */
IO.prototype.read = function(rel, builder, fn){
  if (arguments.length == 2){
    fn = builder; builder = rel; rel = IO.getRels('read');
  }
  if (type(rel) != 'array') rel = [rel];
  var link = getLinkRel.apply(this,rel);
  if (!link) 
    throw new Error('No '+ rel.join(' or ') + ' link found, unable to read');
  this.agent.follow(link, function(err,corr){
    if (err) { fn(err); return; }
    corr = corr.getRoot() || corr;
    fn(null, builder(corr.schema).build(corr.instance));
  });
}

/** 
 * Read a 'default' instance from readDefault link relation.
 *
 * @param {Function} builder
 * @param {Function} fn       callback(err,model)
 *
 */
IO.prototype.readDefault = function(builder,fn){
  this.read(IO.getRels('readDefault'), builder, fn);
}

/**
 * Read and refresh the given model from refresh link relation.
 * Note that the given model is mutated rather than
 * a new model being instanciated.
 *
 * @param {Object}   model
 * @param {Function} fn     callback(err,model)
 *
 */
IO.prototype.refresh = function(model,fn){
  this.read(IO.getRels('refresh'), model.schema.bind(model), fn);
}

/**
 * Generic write method. Write the given object to the given link relation,
 * yielding the response (correlation).
 * If multiple link relations given, the first one that exists is used.
 *
 * Note that unlike `create`, `update`, and `save` methods, `write` should be 
 * given a plain object rather than a model object.
 *
 * @param {String|Array} rel          link rel or array of rels to try
 * @param {Object}       obj          object to serialize
 * @param {Function}     fn           callback(err,model)
 *
 */
IO.prototype.write = function(rel,obj,fn){
  if (type(rel) != 'array') rel = [rel];
  var link = getLinkRel.apply(this,rel);
  if (!link) 
    throw new Error('No '+ rel.join(' or ') + ' link found, unable to write');
  this.agent.follow(link, obj, fn);
}

/**
 * Write the given model to the create link relation (typically, a
 * POST). Note that a safer method is `save`, which checks first for
 * an update link relation.
 *
 * Note that application schemas should *NOT* send create link 
 * relations in schemas for existing entities.
 *
 * @param {Object}   model
 * @param {Function} fn    callback(err,correlation)
 *
 */
IO.prototype.create = function(model,fn){
  this.write(IO.getRels('create'), model.toJSON(), fn);
}

/**
 * Write the given model to the update link relation (typically, a
 * PUT). Note that if you do not know whether an entity is new or not, a safer 
 * method is `save`, which first attempts to update, then create if no 
 * or update link relation is found.
 *
 * @param {Object}   model
 * @param {Function} fn     callback(err,correlation)
 *
 */
IO.prototype.update = function(model,fn){
  this.write(IO.getRels('update'), model.toJSON(), fn);
}

/**
 * Write the given model to the update or create link relation. 
 *
 * @param {Object}   model
 * @param {Function} fn     callback(err,correlation)
 *
 */
IO.prototype.save = function(model,fn){
  var rels = []; 
  rels.push.apply(rels,IO.getRels('update'));
  rels.push.apply(rels,IO.getRels('create'));
  this.write(rels, model.toJSON(), fn);
}

/** 
 * Delete the entity at the del link relation.
 *
 * @param {Function} fn   callback(err)
 *
 */
IO.prototype.del = function(fn){
  var link = getLinkRel.call(this,IO.getRels('del'));
  if (!link) 
    throw new Error('No self or full or delete link found, unable to delete');
  this.agent.del(link, fn);
}

/**
 * Plugin methods for Model, Collection classes.
 * Pass in build IO instance, e.g. 
 *    var io = IO(agent);
 *    Model.use(IO.plugin(io));
 * See usage examples above.
 *
 */
IO.plugin = function(io){
  
  return function(target){

    target.prototype.read = function(rel,fn){
      setModelLinks.call(io,this);
      io.read(rel, target, fn);
    }

    target.prototype.readDefault = function(fn){
      setModelLinks.call(io,this);
      io.readDefault(target, fn);
    }

    target.prototype.refresh = function(fn){
      setModelLinks.call(io,this);
      io.refresh(this, wrap(target,this,'refreshing','refreshed',fn) );
    }

    target.prototype.write = function(rel,fn){
      setModelLinks.call(io,this);
      io.write(rel, this.toJSON(), fn);
    }

    target.prototype.create = function(fn){
      setModelLinks.call(io,this);
      io.create(this, wrap(target,this,'creating','created',fn) );
    }

    target.prototype.update = function(fn){
      setModelLinks.call(io,this);
      io.update(this, wrap(target,this,'updating','updated',fn) );
    }

    target.prototype.save = function(fn){
      setModelLinks.call(io,this);
      io.save(this, wrap(target,this,'saving','saved',fn) );
    }

    target.prototype.del = function(fn){
      setModelLinks.call(io,this);
      io.del( wrap(target,this,'deleting','deleted',fn) );
    }

  }

  // util

  function wrap(target,model,before,after,fn){
    if (target.emit) target.emit(before,model);
    if (model.emit) model.emit(before);
    
    return function(err){
      var args = [].slice.call(arguments,0);
      fn.apply(undefined,args);
      if (!err){
        if (target.emit) target.emit(after,model);
        if (model.emit) model.emit(after);
      }
    }
  }
  
}

// set defaults

IO.setRels( {
  'read':        ['instances'],
  'readDefault': ['create-form','new','default'],
  'refresh':     ['edit-form','self','full'],
  'create':      ['create'],
  'update':      ['edit','update'],
  'del':         ['self','full','delete']
} );


// private

function getLinkRel(){
  var links = this._links
  if (!links) return;
  var args = [].slice.call(arguments,0)
    , link
  for (var i=0;i<args.length;++i){
    link = links.rel(args[i])
    if (link) break;
  }
  return link;
}


function setModelLinks(model){
  var schema = model.schema()
    , links = schema.get('links')
  this.links(links);
}

// utils

function parseLinks(links){
  if (!links) return;
  if (links.nodeType && links.nodeType == 'Links') return links;
  if (type(links) == 'array') return parseLinks({links: links});
  var schema = new Schema().parse(links);
  return schema.get('links');
}

