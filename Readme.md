
# json-schema-model

  **Please note this library is not ready for production use.**

  Build view models (and collections) from [JSON Schema][json-schema]
  correlations.

  Models emit `change` and other 'lifecycle' events, suitable for integration
  with reactive data-binding libraries (e.g., [component-reactive][reactive]
  or [rivets][rivets].

  (For an example use in form validation, see
  [test/integration.html][example].)

  A draft REST interface using JSON Schema hypermedia specification is 
  optionally available for fetching/refreshing/creating/updating/deleting 
  models, see [sync.js][sync].

## Features

  - object- and property- level validation for models
  - object- and items- level validation for collections
  - input coercion (data type + defaults)
  - REST interface using JSON Schema hypermedia
  - extendable with custom model classes
  - full support for any JSON Schema including combination conditions (anyOf, allOf, oneOf)
  - access to descriptive schema data (description, name, links, etc) (planned)


## Installation

    $ component install ericgj/json-schema-model

## API

Coming soon
   

## License

  MIT


[json-schema]: http://json-schema.org
[reactive]: https://github.com/component/reactive
[rivets]: https://github.com/mikeric/rivets
[example]: test/integration.html
[sync]: sync.js

