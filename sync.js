'use strict';

var type = require('type')

module.exports = Sync;

/** 
 * A REST interface for models using JSON Schema hypermedia conventions.
 *
 * There are two usage forms, a _basic_ usage where links are supplied
 * externally from the models; and a _plugin_ usage, where links are
 * supplied by the model schemas themselves, and where the methods are 
 * bound to the model prototypes.
 *
 * Basic usage (links supplied externally):
 *
 *    var sync = Sync(agent).links(links);  // note links are _resolved_ links
 *
 *    sync.read(rel, Builder, fn)   // by default, using rel="instances" 
 *    sync.readDefault(Builder, fn) // using rel="create-form" or rel="new" or rel="default"
 *    sync.refresh(model,fn)        // using rel="edit-form" or rel="self" or rel="full"
 *    sync.create(model)            // using rel="create"
 *    sync.update(model)            // using rel="edit" or rel="update"
 *    sync.del()                    // using rel="self" or rel="full" or rel="delete"
 *
 * Plugin usage (links supplied by model):
 *
 *    var sync = Sync(agent);
 *    Model.use(Sync.plugin(sync));
 *
 *    model.read(rel,fn);
 *    model.readDefault(fn);
 *    model.refresh(fn);    
 *    model.create();  
 *    model.update();  
 *    model.del();     
 *
 * Typically, the 'factory' methods `read` and `readDefault` (which don't need
 * reference to a particular model), would be accessed with the 'basic' usage,
 * using links from the 'factory' entity; but depending on how links are 
 * organized in your application, particular models may also have these links in
 * their schemas, so you may also be able to access them with the 'plugin' 
 * usage.
 *
 * @param {Agent} agent  instance of json-schema-agent or equivalent
 *
 */
function Sync(agent){
  if (!(this instanceof Sync)) return new Sync(agent);
  this.agent = agent;
  this._links = undefined;
  return this;
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
Sync.prototype.links = function(links){
  this._links = parseLinks(links);
  return this;
}

/**
 * Follow given link relation, or first of given link relations,
 * build and yield a new model from the fetched correlation.
 *
 * If no rel given, by default use 'instances'.
 *
 * @param {String|Array} [rel='instances']  link rel or array of rels to try
 * @param {Function}     builder            builder function for model
 * @param {Function}     fn                 callback(err,model)
 *
 */
Sync.prototype.read = function(rel, builder, fn){
  if (arguments.length == 2){
    fn = builder; builder = rel; rel = 'instances'
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
 * Read a 'default' instance from 'create-form', 'new', or 'default' 
 * link relation.
 *
 * @param {Function} builder
 * @param {Function} fn       callback(err,model)
 *
 */
Sync.prototype.readDefault = function(builder,fn){
  this.read(['create-form','new','default'], builder, fn);
}

/**
 * Read and refresh the given model from 'edit-form', 'self', or 'full'
 * link relation. Note that the given model is mutated rather than
 * a new model being instanciated.
 *
 * @param {Object}   model
 * @param {Function} fn     callback(err,model)
 *
 */
Sync.prototype.refresh = function(model,fn){
  this.read(['edit-form','self','full'], model.schema.bind(model), fn);
}

/**
 * Write the given model to the 'create' link relation (typically, a
 * POST). Note that a safer method is `save`, which checks first for
 * an 'edit' or 'update' link relation.
 *
 * Note that application schemas should *NOT* send 'create' link 
 * relations in schemas for existing entities.
 *
 * @param {Object}   model
 * @param {Function} fn    callback(err,correlation)
 *
 */
Sync.prototype.create = function(model,fn){
  var link = getLinkRel.call(this,'create');
  if (!link) 
    throw new Error('No create link found, unable to create');
  this.agent.follow(link, model.toJSON(), fn);
}

/**
 * Write the given model to the 'edit' or 'update' link relation (typically, a
 * PUT). Note that if you do not know whether an entity is new or not, a safer 
 * method is `save`, which first attempts to update, then create if no 'edit'
 * or 'update' link relation is found.
 *
 * @param {Object}   model
 * @param {Function} fn     callback(err,correlation)
 *
 */
Sync.prototype.update = function(model,fn){
  var link = getLinkRel.call(this,'edit','update');
  if (!link) 
    throw new Error('No edit or update link found, unable to update');
  this.agent.follow(link, model.toJSON(), fn);
}

/**
 * Write the given model to the 'edit', 'update', or 'create' link relation. 
 *
 * @param {Object}   model
 * @param {Function} fn     callback(err,correlation)
 *
 */
Sync.prototype.save = function(model,fn){
  var link = getLinkRel.call(this,'edit','update','create');
  if (!link) 
    throw new Error('No edit or update or create link found, unable to save');
  this.agent.follow(link, model.toJSON(), fn);
}

/** 
 * Delete the entity at the 'self', 'full', or 'delete' link relation.
 *
 * @param {Function} fn   callback(err)
 *
 */
Sync.prototype.del = function(fn){
  var link = getLinkRel.call(this,'self','full','delete');
  if (!link) 
    throw new Error('No self or full or delete link found, unable to delete');
  this.agent.del(link, fn);
}

/**
 * Plugin methods for Model, Collection classes.
 * See usage examples above.
 *
 */
Sync.plugin = function(sync){
  
  return function(target){

    target.prototype.read = function(rel,fn){
      setModelLinks.call(sync,this);
      sync.read(rel, target, fn);
    }

    target.prototype.readDefault = function(fn){
      setModelLinks.call(sync,this);
      sync.readDefault(target, fn);
    }

    target.prototype.refresh = function(fn){
      setModelLinks.call(sync,this);
      sync.refresh(this, wrap(target,this,'refreshing','refreshed',fn) );
    }

    target.prototype.create = function(fn){
      setModelLinks.call(sync,this);
      sync.create(this, wrap(target,this,'creating','created',fn) );
    }

    target.prototype.update = function(fn){
      setModelLinks.call(sync,this);
      sync.update(this, wrap(target,this,'updating','updated',fn) );
    }

    target.prototype.save = function(fn){
      setModelLinks.call(sync,this);
      sync.save(this, wrap(target,this,'saving','saved',fn) );
    }

    target.prototype.del = function(fn){
      setModelLinks.call(sync,this);
      sync.del( wrap(target,this,'deleting','deleted',fn) );
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

