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

Local model's prediction

```js
    Model = require('./lib/Model');
    model = new Model('model/51922d0b37203f2a8c000010');
    model.predict({'petal length': 1},
                  function(prediction) {console.log(prediction)});
```
