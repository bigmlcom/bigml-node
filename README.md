BigML Node.js Bindings
======================

[BigML](https://bigml.com) makes machine learning easy by taking care
of the details required to add data-driven decisions and predictive
power to your company. Unlike other machine learning services, BigML
creates
[beautiful predictive models](https://bigml.com/gallery/models) that
can be easily understood and interacted with.

These BigML Node.js bindings allow you to interact with BigML.io, the API
for BigML. You can use it to easily create, retrieve, list, update, and
delete BigML resources (i.e., sources, datasets, models and
predictions).

This module is licensed under the [Apache License, Version
2.0](http://www.apache.org/licenses/LICENSE-2.0.html).

Support
-------

Please report problems and bugs to our [BigML.io issue
tracker](https://github.com/bigmlcom/io/issues).

Discussions about the different bindings take place in the general
[BigML mailing list](http://groups.google.com/group/bigml). Or join us
in our [Campfire chatroom](https://bigmlinc.campfirenow.com/f20a0).

Requirements
------------

Node 0.10 and later are currently supported by these bindings.

The mandatory third-party dependencies are the
[request](https://github.com/mikeal/request.git),
[winston](https://github.com/flatiron/winston.git),
[form-data](https://github.com/felixge/node-form-data.git),
[mersenne-twister](https://www.npmjs.com/package/mersennetwister),
[snowball](https://www.npmjs.com/browse/keyword/snowball),
[combined-stream](https://www.npmjs.com/package/combined-stream),
[mime](https://www.npmjs.com/package/mime),
[async](https://www.npmjs.com/package/async),
[jStat](https://www.npmjs.com/package/jStat) and
[fast-csv](https://www.npmjs.com/package/fast-csv) libraries.

The testing environment requires the additional
[mocha](https://github.com/visionmedia/mocha) package that can be installed
with the following command:

    $ sudo npm install -g mocha

Installation
------------

To install the latest stable release with
[npm](https://npmjs.org/):

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

    - bigml.constants                   common constants
    - bigml.BigML                       connection object
    - bigml.Resource                    common API methods
    - bigml.Source                      Source API methods
    - bigml.Dataset                     Dataset API methods
    - bigml.Model                       Model API methods
    - bigml.Ensemble                    Ensemble API methods
    - bigml.Prediction                  Prediction API methods
    - bigml.BatchPrediction             BatchPrediction API methods
    - bigml.Evaluation                  Evaluation API methods
    - bigml.Cluster                     Cluster API methods
    - bigml.Centroid                    Centroid API methods
    - bigml.BatchCentroid               BatchCentroid API methods
    - bigml.Anomaly                     Anomaly detector API methods
    - bigml.AnomalyScore                Anomaly score API methods
    - bigml.BatchAnomalyScore           BatchAnomalyScore API methods
    - bigml.Project                     Project API methods
    - bigml.Sample                      Sample API methods
    - bigml.Correlation                 Correlation API methods
    - bigml.StatisticalTests            StatisticalTest API methods
    - bigml.LogisticRegression          LogisticRegression API methods
    - bigml.Association                 Association API methods
    - bigml.AssociationSet              Associationset API methods
    - bigml.TopicModel                  Topic Model API methods
    - bigml.TopicDistribution           Topic Distribution API methods
    - bigml.BatchTopicDistribution      Batch Topic Distribution API methods
    - bigml.Deepnet                     Deepnet API methods
    - bigml.Fusion                      Fusion API methods
    - bigml.PCA                         PCA API methods
    - bigml.Projection                  Projection API methods
    - bigml.BatchProjection             Batch Projection API methods
    - bigml.LinearRegression            Linear Regression API methods
    - bigml.Script                      Script API methods
    - bigml.Execution                   Execution API methods
    - bigml.Library                     Library API methods
    - bigml.LocalModel                  Model for local predictions
    - bigml.LocalEnsemble               Ensemble for local predictions
    - bigml.LocalCluster                Cluster for local centroids
    - bigml.LocalAnomaly                Anomaly detector for local anomaly scores
    - bigml.LocalLogisticRegression     Logistic regression model for local predictions
    - bigml.LocalAssociation            Association model for associaton rules
    - bigml.LocalTopicModel             Topic Model for local predictions
    - bigml.LocalTimeSeries             Time Series for local forecasts
    - bigml.LocalDeepnet                Deepnets for local predictions
    - bigml.LocalFusion                 Fusions for local predictions
    - bigml.LocalPCA                    PCA for local projections
    - bigml.LocalLinearRegression       Linear Regression for local predictions


Authentication
--------------

All the requests to BigML.io must be authenticated using your username
and [API key](https://bigml.com/account/apikey) and are always
transmitted over HTTPS.

This module will look for your username and API key in the environment
variables `BIGML_USERNAME` and `BIGML_API_KEY` respectively. You can
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

Let's see the steps that will lead you from [this csv
file](https://static.bigml.com/csv/iris.csv) containing the [Iris
flower dataset](http://en.wikipedia.org/wiki/Iris_flower_data_set) to
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

The steps required to generate a prediction are creating a set of
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
printing the resulting resource or the error. For the `create` method:

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

Additional Information
----------------------

We've just drawn a first sketch. For additional information, see
the files included in the [docs folder](./docs/index.md).

How to Contribute
-----------------

Please follow these steps:

  1. Fork the project on github.com.
  2. Create a new branch.
  3. Commit changes to the new branch.
  4. Send a [pull request](https://github.com/bigmlcom/bigml-node/pulls).


For details on the underlying API, see the
[BigML API documentation](https://bigml.com/developers).
