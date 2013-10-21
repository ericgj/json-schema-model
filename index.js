
var Builder = require('./builder')

module.exports = Builder;

Builder.addType('object', Builder.Model);
Builder.addType('array', Builder.Collection);


