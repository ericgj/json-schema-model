
# json-schema-model

  Build view models (and collections) from [JSON Schema][json-schema] correlations.
  
  Models emit `change` and other 'lifecycle' events, suitable for integration with reactive data-binding libraries (e.g., 
  [component-reactive][reactive] or [rivets][rivets].

  (For an example use in form validation, see [test/integration.html][example].)
  
## Features

  - object- and property- level validation for models
  - object- and items- level validation for collections
  - input coercion (data type + defaults)
  - extendable with custom model classes
  - full support for any JSON Schema including combination conditions (anyOf, allOf, oneOf)
  - access to descriptive schema data (description, name, links, etc) (planned)
  - interface for persistence layer (planned)


## Installation

    $ component install ericgj/json-schema-model

## API

   

## License

  MIT


[json-schema]: http://json-schema.org
[reactive]: https://github.com/component/reactive
[rivets]: https://github.com/mikeric/rivets
[example]: test/integration.html

