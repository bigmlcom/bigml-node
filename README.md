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
    source.get('source/519feaf337203f3b2d000000')
```

Local model's prediction

```js
    Model = require('./lib/Model');
    model = new Model('model/51922d0b37203f2a8c000010');
    model.predict({'petal length': 1},
                  function(prediction) {console.log(prediction)});
```

Local ensemble's prediction

```js
    Ensemble = require('./lib/Ensemble');
    ensemble = new Ensemble('ensemble/51901f4337203f3a9a000215');
    ensemble.predict({'petal length': 1}, 0, 
                     function(prediction) {console.log(prediction)});
```
