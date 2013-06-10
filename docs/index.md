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

    $ mocha -t 20000

will set the timeout limit to 20 seconds. This limit should typically be
enough, but you can change it to fit the latencies of your connection.

Importing the modules
---------------------

To use the library, import it with `require`:

    $ node
    > bigml = require('bigml');

this will give you access to the following library structure:

    - bigml.constants       common constants
    - bigml.BigML           connection object
    - bigml.Resource        common API methods
    - bigml.Source          Source API methods
    - bigml.Dataset         Dataset API methods
    - bigml.Model           Model API methods
    - bigml.Ensemble        Ensemble API methods
    - bigml.Prediction      Prediction API methods
    - bigml.Evaluation      Evaluation API methods
    - bigml.LocalModel      Model for local predictions
    - bigml.LocalEnsemble   Ensemble for local predictions


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

Quick Start
-----------

Let's see the steps that will lead you to [this csv
file](<https://static.bigml.com/csv/iris.csv>) containing the [Iris
flower dataset](<http://en.wikipedia.org/wiki/Iris_flower_data_set>) to
predicting the species of a flower whose `sepal length` is `5` and
whose `sepal width` is `2.5`. By default, BigML considers the last field
(`species`) in the row as the
objective field (i.e., the field that you want to generate predictions
for). The csv structure is::

    sepal length,sepal width,petal length,petal width,species
    5.1,3.5,1.4,0.2,Iris-setosa
    4.9,3.0,1.4,0.2,Iris-setosa
    4.7,3.2,1.3,0.2,Iris-setosa
    ...

The previous required steps to generate a prediction are creating a set of
source, dataset and model objects::

```js
    var bigml = require('bigml');
    var source = new bigml.Source();
    source.create('./data/iris.csv', function(error, sourceInfo) {
      if (!error && sourceInfo) {
        var dataset = new bigml.Dataset();
        dataset.create(sourceInfo, function(error, datasetInfo) {
          if (!error && datasetInfo) {
            var model = new bigml.Model();
            model.create(datasetInfo, function (error, modelInfo) {
              if (!error && modelInfo) {
                var prediction = new bigml.Prediction();
                prediction.create(modelInfo, {'petal length': 1})
              }
            });
          }
        });
      }
    });
```

Note that in our example the `prediction.create` call has no associated
callback. All the CRUD methods of any resource allow assigning a callback as
the last parameter,
but if you don't the default action will be
printing the results of the `create` method.

    > result: 
    { code: 201,
      object: 
       { category: 0,
         code: 201,
         content_type: 'text/csv',
         created: '2013-06-08T15:22:36.834797',
         credits: 0,
         description: '',
         fields_meta: { count: 0, limit: 1000, offset: 0, total: 0 },
         file_name: 'iris.csv',
         md5: 'd1175c032e1042bec7f974c91e4a65ae',
         name: 'iris.csv',
         number_of_datasets: 0,
         number_of_ensembles: 0,
         number_of_models: 0,
         number_of_predictions: 0,
         private: true,
         resource: 'source/51b34c3c37203f4678000020',
         size: 4608,
         source_parser: {},
         status: 
          { code: 1,
            message: 'The request has been queued and will be processed soon' },
         subscription: false,
         tags: [],
         type: 0,
         updated: '2013-06-08T15:22:36.834844' },
      resource: 'source/51b34c3c37203f4678000020',
      location: 'https://localhost:1026/andromeda/source/51b34c3c37203f4678000020',
      error: null }


The generated objects can be retrieved, updated and deleted through the
corresponding REST methods. For instance, in the previous example you would
use:

```js
    bigml = require('bigml');
    var source = new bigml.Source();
    source.get('source/51b25fb237203f4410000010', function (error, resource) {
        if (!error && resource) {
          console.log(resource);
        }
      })
```
to recover and show the source information.

You can also generate local predictions using the information of your
models::

```js
    bigml = require('bigml');
    var localModel = new bigml.LocalModel('model/51922d0b37203f2a8c000010');
    localModel.predict({'petal length': 1},
                       function(error, prediction) {console.log(prediction)});
```

And similarly, for your ensembles

```js
    bigml = require('bigml');
    var localEnsemble = new bigml.LocalEnsemble('ensemble/51901f4337203f3a9a000215');
    localEnsemble.predict({'petal length': 1}, 0, 
                          function(error, prediction) {console.log(prediction)});
```

will generate a prediction by combining the predictions of each of the models
they enclose. The example uses the `plurality` combination method (whose code
is `0`. Check the docs for more information about the available combination
methods).

Types of resources
------------------

Currently there are six types of resources in bigml.com:

- **sources** Contain the data uploaded from your local data file after
processing (interpreting field types or missing characters, for instance).
You can set its locale settings or its field names or types.

- **datasets** Contain the information of the source in a structured summarized
way according to its file types (numeric, categorical or text).

- **models** It's a tree-like structure extracted from a dataset in order to
predict one field, the objective field, according to the values of other
fields, the input fields.

- **prediction** Is the representation of the predicted value for the
objective field obtained by applying the model to an input data set.

- **ensemble** Is a group of models extracted from a single dataset to be
used together in order to predict the objective field.

- **evaluation** Is a set of measures of performance defined on your model
or ensemble by checking predictions for the objective field of
a test dataset with its provided values.

Creating resources
------------------

As you've seen in the quick start section, each resource has its own creation
method. Sources are created by uploading a local csv file:

```js
    var bigml = require('bigml');
    var source = new bigml.Source();
    source.create('./data/iris.csv', {name: 'my source'},
      function(error, sourceInfo) {
          if (!error && sourceInfo) {
            console.log(sourceInfo);
          }
      });
```
The first argument in the `create` method is the csv file, the next one is
an object to set some of the source properties, in this case its name,
and finally the chosen callback. These last two arguments are optional (for 
this method and all
the `create` methods of the rest of resources).

For datasets to be created you need a source object or id or another dataset
object or id as first argument in the `create` method. In the first case, it
generates a dataset using the data of the source and in the second,
the method is used to generate new datasets by splitting the original one.
For instance,

```js
    var bigml = require('bigml');
    var dataset = new bigml.Dataset();
    dataset.create('source/51b25fb237203f4410000010',
      {name: 'my dataset', size: 1024},
      function(error, datasetInfo) {
          if (!error && datasetInfo) {
            console.log(datasetInfo);
          }
      });
```

will create a dataset named `my dataset` with the first 1024
bytes of the source. And

```js
    dataset.create('dataset/51b3c4c737203f16230000d1',
      {name: 'split dataset', sample_rate: 0.8},
      function(error, datasetInfo) {
          if (!error && datasetInfo) {
            console.log(datasetInfo);
          }
      });
```

will create a new dataset by sampling 80% of the data in the original dataset.

Similarly, for models and ensembles you will need a dataset as first argument,
evaluations will need a model as first argument and a dataset as second one and
predictions need a model as first argument too:

```js
    var bigml = require('bigml');
    var evaluation = new bigml.Evaluation();
    evaluation.create('model/51922d0b37203f2a8c000010',
                      'dataset/51b3c4c737203f16230000d1',
                      {'name': 'my dataset'},
      function(error, datasetInfo) {
          if (!error && datasetInfo) {
            console.log(datasetInfo);
          }
      });
```

Newly-created resources are returned in an object with the following
keys:

-  **code**: If the request is successful you will get a
   `constants.HTTP_CREATED` (201) status code. Otherwise, it will be
   one of the standard HTTP error codes [detailed in the
   documentation](<https://bigml.com/developers/status_codes>).
-  **resource**: The identifier of the new resource.
-  **location**: The location of the new resource.
-  **object**: The resource itself, as computed by BigML.
-  **error**: If an error occurs and the resource cannot be created, it
   will contain an additional code and a description of the error. In
   this case, **location**, and **resource** will be `undefined`.

Bigml.com will answer your `create` call immediately, even if the resource
is not finished yet (see the
[documentation on status
codes](<https://bigml.com/developers/status_codes>) for the listing of
potential states and their semantics). To retrieve a finished resource,
you'll need to use the `get` method described in next section.

Getting resources
-----------------

Whenever you have to retrieve an existing resource you can use the `get`
method of the corresponding class. Let's see an example of model retrieval:

```js
    bigml = require('bigml');
    var model = new bigml.Model();
    model.get('model/51b3c45a37203f16230000b5',
              true,
              'limit=-1',
              function (error, resource) {
        if (!error && resource) {
          console.log(resource);
        }
      })
```

The first parameter is, obviously, the model id, and the rest of parameters are
optional. The second parameter in the example will force the `get` method to
retrieve a finished model. In the previous section we saw that, right after
creation, resources evolve
through a series states until they end up in a `FINISHED` (or `FAULTY`) state.
Setting this boolean to `true` will force the `get` method to wait for
the resource to be finished before
executing the corresponding callback (default is set to `false`).
The third parameter is a query string
that can be used to filter the fields returned. In the example we set the
number of fields to be retrieved to `-1`, which will cause all the fields to
be retrieved (default is an empty string). The callback parameter is set to
a default printing function if absent.


Updating Resources
------------------

Each type of resource has a set of properties whose values can be updated.
Check the properties subsection of each resource in the [developers
documentation](<https://bigml.com/developers>) to see which are marked as
updatable. The `update` method of each resource class will let you update
such properties. For instance,

```js
    bigml = require('bigml');
    var ensemble = new bigml.Ensemble();
    ensemble.update('ensemble/51901f4337203f3a9a000215',
      {name: 'my name', tags: 'code example'},
      function (error, resource) {
        if (!error && resource) {
          console.log(resource);
        }
      })
```

will set the name `my name` to your ensemble and add the
tags `code` and `example`. The callback function is optional and a default
printing function will be used if absent.

If you have a look at the returned resource
you will see that its status will
be `constants.HTTP_ACCEPTED` if the resource can be updated without
problems or one of the HTTP standard error codes otherwise.

Deleting Resources
------------------

Resources can be deleted individually using the `delete` method of the
corresponding class.

```js
    bigml = require('bigml');
    var source = new bigml.source();
    source.delete('source/51b25fb237203f4410000010',
      function (error, result) {
        if (!error && result) {
          console.log(result);
        }
      })
```

The call will return an object with the following keys:

-  **code** If the request is successful, the code will be a
   `constants.HTTP_NO_CONTENT` (204) status code. Otherwise, it wil be
   one of the standard HTTP error codes. See the [documentation on
   status codes](<https://bigml.com/developers/status_codes>) for more
   info.
-  **error** If the request does not succeed, it will contain an
   object with an error code and a message. It will be `null`
   otherwise.

The callback parameter is optional and a printing function is used as default.



