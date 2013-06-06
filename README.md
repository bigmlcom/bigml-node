BigML Node.js Bindings
======================

[BigML](<https://bigml.com>) makes machine learning easy by taking care
of the details required to add data-driven decisions and predictive
power to your company. Unlike other machine learning services, BigML
creates
[beautiful predictive models](<https://bigml.com/gallery/models>) that
can be easily understood and interacted with.

These BigML Node.js bindings allow you to interact with BigML.io, the API
for BigML. You can use it to easily create, retrieve, list, update, and
delete BigML resources (i.e., sources, datasets, models and
predictions).

This module is licensed under the [Apache License, Version
2.0](<http://www.apache.org/licenses/LICENSE-2.0.html>).

Support
-------

Please report problems and bugs to our [BigML.io issue
tracker](<https://github.com/bigmlcom/io/issues>).

Discussions about the different bindings take place in the general
[BigML mailing list](<http://groups.google.com/group/bigml>). Or join us
in our [Campfire chatroom](<https://bigmlinc.campfirenow.com/f20a0>).

Requirements
------------

Node 0.10 is currently supported by these bindings.

The only mandatory third-party dependencies are the
[request](<https://github.com/mikeal/request.git<),
[winston](<https://github.com/flatiron/winston.git>) and
[form-data](<https://github.com/felixge/node-form-data.git>) libraries.

The testing environment requires the additional 
[mocha](<https://github.com/visionmedia/mocha>) package that can be installed
with the following command:

    $ nmp install mocha -g

Installation
------------

To install the latest stable release with
[npm](<https://npmjs.org/>):

    $ npm install bigml

You can also install the development version of the bindings by cloning the
Git repository to your local computer and issuing:

    $ npm install .

Testing
-------

The test suite is run automatically using `mocha` as test framework. As all the
tested api objects perform one or more connections to the remote resources in
bigml.com, you may have to enlarge the default timeout used by `mocha` in
each test. For instance:

    $ mocha -t 10000

will set the timeout limit to 10 seconds. This limit should typically be
enough, but you can change it to fit the latencies of your connection.

Importing the modules
---------------------

To use the library, import it with `require`:

    $ node
    > bigml = require('bigml');

this will give you access to the following library structure:


    - bigml.constants       common constants
    - bigml.BigML           connection object
    - bigml.BigMLResource   common API methods
    - bigml.BigMLSource     Source API methods
    - bigml.BigMLDataset    Dataset API methods
    - bigml.BigMLModel      Model API methods
    - bigml.BigMLEnsemble   Ensemble API methods
    - bigml.BigMLPrediction Prediction API methods
    - bigml.BigMLEvaluation Evaluation API methods
    - bigml.Model           Model for local predictions
    - bigml.Ensemble        Ensemble for local predictions

Authentication
--------------

All the requests to BigML.io must be authenticated using your username
and [API key](<https://bigml.com/account/apikey>) and are always
transmitted over HTTPS.

This module will look for your username and API key in the environment
variables `BIGML_USERNAME` and `BIGML_API_KEY` respectively. You canhe 
add the following lines to your `.bashrc` or `.bash_profile` to set
those variables automatically when you log in::

    export BIGML_USERNAME=myusername
    export BIGML_API_KEY=ae579e7e53fb9abd646a6ff8aa99d4afe83ac291

With that environment set up, connecting to BigML is a breeze::

    connection = new bigml.BigML();

Otherwise, you can initialize directly when instantiating the BigML
class as follows::

    connection = new bigml.BigML('myusername',
                                 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291')

Also, you can initialize the library to work in the Sandbox environment by
setting the third parameter `devMode` to `true`::

    connection = new bigml.BigML('myusername',
                                 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291',
                                 true)



Usage
-----

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
                  function(error, prediction) {console.log(prediction)});
```

Local ensemble's prediction

```js
    Ensemble = require('./lib/Ensemble');
    ensemble = new Ensemble('ensemble/51901f4337203f3a9a000215');
    ensemble.predict({'petal length': 1}, 0, 
                     function(error, prediction) {console.log(prediction)});
```
