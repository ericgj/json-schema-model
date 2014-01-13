
var Builder = require('./builder')
  , IO = require('./io')

module.exports = {
  Builder: Builder,
  IO: IO
}

Builder.addType('object', Builder.Model);
Builder.addType('array', Builder.Collection);

// sugar...
Builder.io = function(io){
  for (var t in this._types){
    var klass = this._types[t]
    if (klass.use) klass.use(IO.plugin(io));
  }
}


