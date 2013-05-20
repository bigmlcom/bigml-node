nodejs
======

BigML nodejs bindings

Usage

nodejs

Retrieve source

```js
    BigMLSource = require('./lib/source');
    source = new BigMLSource();
    source.get('source/515a1c200c0b5e5b20000000')
```

Model's local prediction

```js
    BigMLResource = require('./lib/resource');
    resource = new BigMLResource();
    Model = require('./lib/Model');
    resource.get('model/51922d0b37203f2a8c000010', true, function(error, resource) {
        var localModel = new Model(resource);
        console.log(localModel.predict({'petal length': 1}))
    })
```
