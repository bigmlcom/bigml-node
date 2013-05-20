nodejs
======

BigML nodejs bindings

Usage

nodejs
Create source 
```js
    var BigMLSource = require('./lib/BigMLSource');
    var source = new BigMLSource();
    source.create('./data/iris.csv')
```

Retrieve source

```js
    var BigMLSource = require('./lib/BigMLSource');
    var source = new BigMLSource();
    source.get('source/515a1c200c0b5e5b20000000')
```

Model's local prediction

```js
    var BigMLModel = require('./lib/BigMLModel');
    var model = new BigMLModel();
    var Model = require('./lib/Model');
    model.get('model/51922d0b37203f2a8c000010', true, function(error, resource) {
        var localModel = new Model(resource);
        console.log(localModel.predict({'petal length': 1}))
    })
```
