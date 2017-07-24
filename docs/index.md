BigML Node.js Bindings
======================

[BigML](https://bigml.com) makes machine learning easy by taking care
of the details required to add data-driven decisions and predictive
power to your company.
Unlike other machine learning services, BigML
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

Node 0.10 is currently supported by these bindings.

The only mandatory third-party dependencies are the
[request](https://github.com/mikeal/request.git),
[winston](https://github.com/flatiron/winston.git) and
[form-data](https://github.com/felixge/node-form-data.git) libraries.

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

will set the timeout limit to 20 seconds.
This limit should typically be enough, but you can change it to fit
the latencies of your connection. You can also add the `-R spec` flag to see
the definition of each step as they go.

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
    - bigml.LocalTimeSeries             Time Sereis for local forecasts


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
                                 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291');

Also, you can initialize the library to work in the Sandbox environment by
setting the third parameter `devMode` to `true`::

    connection = new bigml.BigML('myusername',
                                 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291',
                                 true);

If your BigML installation is not in `bigml.io` you can adapt your connection
to point to your customized domain. For instance, if your user is in the
australian site, your domain should point to `au.bigml.io`. This can be
achieved by adding the::

    export BIGML_DOMAIN=au.bigml.io

environment variable and your connection object will take its value and
create the convenient urls. You can also set this value dinamically (together
with the protocol used, if you need to change it)::

    connection = new bigml.BigML('myusername',
                                 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291',
                                 true, {domain: 'au.bigml.io',
                                        protocol: 'https'});

The default if no domain or protocol information is provided, the connection
is uses `bigml.io` and `https` as default.

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
    source.get('source/51b25fb237203f4410000010' function (error, resource) {
        if (!error && resource) {
          console.log(resource);
        }
      })
```
to recover and show the source information.

You can work with different credentials by setting them in the connection
object, as explained in the Authentication section.

```js
    bigml = require('bigml');
    var connection = new bigml.BigML('myusername',
                                     'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291')
    // the new Source object will use the connection credentials for remote
    // authentication.
    var source = new bigml.Source(connection);
    source.get('source/51b25fb237203f4410000010' function (error, resource) {
        if (!error && resource) {
          console.log(resource);
        }
      })
```

You can also generate local predictions using the information of your
models:

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

will generate a prediction for a `Decision Forest` ensemble
by combining the predictions of each of the models
they enclose. The example uses the `plurality` combination method (whose code
is `0`. Check the docs for more information about the available combination
methods). All the three kinds of ensembles available in BigML
(`Decision Forest`,
`Random Decision Forest` and `Boosting Trees`) can be used to predict locally
through this `LocalEnsemble` object.

Types of resources
------------------

Currently there are six types of resources in bigml.com:

- **sources** Contain the data uploaded from your local data file after
processing (interpreting field types or missing characters, for instance).
You can set their locale settings or their field names or types. These resources
are handled through `bigml.Source`.

- **datasets** Contain the information of the source in a structured summarized
way according to their file types (numeric, categorical, text or datetime).
These resources are handled through `bigml.Dataset`.

- **models** They are tree-like structures extracted from a dataset in order to
predict one field, the objective field, according to the values of other
fields, the input fields. These resources
are handled through `bigml.Model`.

- **predictions** Are the representation of the predicted value for the
objective field obtained by applying the model to an input data set. These
resources are handled through `bigml.Prediction`.

- **ensembles** Are a group of models extracted from a single dataset to be
used together in order to predict the objective field. BigML offers three
kinds of ensembles:
`Decision Forests`, `Random Decision Forests` and `Boosting Trees`.
All these resources are handled through `bigml.Ensemble`.

- **evaluations** Are a set of measures of performance defined on your model
or ensemble by checking predictions for the objective field of
a test dataset with its provided values. These resources
are handled through `bigml.Evaluation`.

- **batch predictions** Are groups of predictions for the objective field
obtained by applying the model or ensemble to a dataset resource. These
resources are handled through `bigml.BatchPredictions`.

- **clusters** They are unsupervised learning models that define groups of
instances in the training dataset according to the similarity of their
features. Each group has a central instance, named Centroid, and all
instances in the group form a new dataset. These resources are handled
through `bigml.Cluster`.

- **centroids** Are the central instances of the groups defined in a cluster.
They are the values predicted by the cluster when new input data is given.
These resources are handled through `bigml.Centroid`

- **batch centroids** Are lists of centroids obtained by using the cluster to
classify a dataset of input data. They are analogous to the batch
predictions generated from models, but for clusters. These resources
are handled through `bigml.BatchCentroid`.

- **anomaly detectors** They are unsupervised learning models
that detect instances in the training dataset that are anomalous.
The information it returns encloses a `top_anomalies` block
that contains a list of the most anomalous
points. For each instance, a `score` from 0 to 1 is computed.  The closer to 1,
the more anomalous. These resources are handled
through `bigml.Anomaly`.

- **anomaly scores** Are scores computed for any user-given input data using
an anomaly detector. These resources are handled through `bigml.AnomalyScore`

- **batch anomaly scores** Are lists of anomaly scores obtained by using
the anomaly detector to
classify a dataset of input data. They are analogous to the batch
predictions generated from models, but for anomalies. These resources
are handled through `bigml.BatchAnomalyScore`.

- **projects** These resources are meant for organizational purposes only.
The rest of resources can be related to one `project` that groups them.
Only sources can be assigned to a `project`, the rest of resources inherit
the `project` reference from its originating source. Projects are handled
through `bigml.Project`.

- **samples** These resources provide quick access to your raw data. They are
objects cached in-memory by the server that can be queried for subsets
of data by limiting
their size, the fields or the rows returned. Samples are handled
through `bigml.Sample`.

- **correlations** These resources contain a series of computations that
reflect the
degree of dependence between the field set as objective for your predictions
and the rest of fields in your dataset. The dependence degree is obtained by
comparing the distributions in every objective and non-objective field pair,
as independent fields should have probabilistic
independent distributions. Depending on the types of the fields to compare,
the metrics used to compute the correlation degree will change. Check the
[developers documentation](https://bigml.com/api/correlations#retrieving-correlation)
for a detailed description. Correlations are handled
through `bigml.Correlation`.

- **statistical tests** These resources contain a series of statistical tests
that compare the
distribution of data in each numeric field to certain canonical distributions,
such as the
[normal distribution](https://en.wikipedia.org/wiki/Normal_distribution)
or [Benford's law](https://en.wikipedia.org/wiki/Benford%27s_law)
distribution. Statistical tests are handled
through `bigml.StatisticalTest`.

- **logistic regressions** These resources are models to solve classification
problems by predicting one field of the dataset, the objective field,
based on the values of the other fields, the input fields. The prediction
is made using a logistic function whose argument is a linear combination
of the predictor's values. Check the
[developers documentation](https://bigml.com/api/logisticregressions)
for a detailed description. These resources
are handled through `bigml.LogisticRegression`.

- **associations** These resources are models to discover the existing
associations between the field values in your dataset. Check the
[developers documentation](https://bigml.com/api/associations)
for a detailed description. These resources
are handled through `bigml.Association`.

- **association sets** These resources are the sets of items associated to
the ones in your input data and their score. Check the
[developers documentation](https://bigml.com/api/associationsets)
for a detailed description. These resources
are handled through `bigml.AssociationSet`.

- **topic models** These resources are models to discover topics underlying a
collection of documents. Check the
[developers documentation](https://bigml.com/api/topicmodels)
for a detailed description. These resources
are handled through `bigml.TopicModel`.

- **topic distributions** These resources contain the
probabilites
for a document to belong to each one of the topics in a `topic model`.
Check the
[developers documentation](https://bigml.com/api/topicdistributions)
for a detailed description. These resources
are handled through `bigml.TopicDistribution`.

- **batch topic distributions** These resources contain a list of
the probabilites
for a collection of documents to belong to each one of the topics in
a `topic model`. Check the
[developers documentation](https://bigml.com/api/batchtopicdistributions)
for a detailed description. These resources
are handled through `bigml.BatchTopicDistribution`.

- **time series** These resources are models to discover the patterns in
the properties of a sequence of ordered data. Check the
[developers documentation](https://bigml.com/api/timeseries)
for a detailed description. These resources
are handled through `bigml.TimeSeries`.

- **forecasts** These resources contain forecasts for the numeric
fields in a dataset as predicted by a `timeseries` model.
Check the
[developers documentation](https://bigml.com/api/forecasts)
for a detailed description. These resources
are handled through `bigml.Forecast`.

- **scripts** These resources are Whizzml scripts, that can be created
to handle workflows, which provide a means of automating the creation and
management of the rest of resources. Check the
[developers documentation](https://bigml.com/api/scripts)
for a detailed description. These resources
are handled through `bigml.Script`.

- **executions** These resources are Whizzml scripts' executions, that
can be created to execute the workflows defined in the `Whizzml scripts`.
Check the
[developers documentation](https://bigml.com/api/executions)
for a detailed description. These resources
are handled through `bigml.Execution`.

- **libraries** These resources are Whizzml libraries, that
can be created to store definitions of constants and functions which can
be imported and used in the `Whizzml scripts`.
Check the
[developers documentation](https://bigml.com/api/libraries)
for a detailed description. These resources
are handled through `bigml.Library`.

Creating resources
------------------

As you've seen in the quick start section, each resource has its own creation
method availabe in the corresponding resource object. Sources are created
by uploading a local csv file:

```js
    var bigml = require('bigml');
    var source = new bigml.Source();
    source.create('./data/iris.csv', {name: 'my source'}, true,
      function(error, sourceInfo) {
          if (!error && sourceInfo) {
            console.log(sourceInfo);
          }
      });
```
The first argument in the `create` method of the `bigml.Source` is the csv
file, the next one is an object to set some of the source properties,
in this case its name, a boolean that determines if retries will be used
in case a resumable error occurs, and finally the chosen callback.
The arguments are optional (for this method and all
the `create` methods of the rest of resources).

It is important to instantiate a new resource object (`new bigml.Source()` in
this case) for each different resource, because each one stores internally the
parameters used in the last REST call. They are available
to be used if the call needs to be retried. For instance, if your internet
connection falls for a while, the `create` call will be retried a limited number
of times using this information unless you explicitely command it by using the


For datasets to be created you need a source object or id, another dataset
object or id, a list of dataset ids or a cluster id as first argument
in the `create` method.
In the first case, it
generates a dataset using the data of the source and in the second,
the method is used to generate new datasets by splitting the original one.
For instance,

```js
    var bigml = require('bigml');
    var dataset = new bigml.Dataset();
    dataset.create('source/51b25fb237203f4410000010',
      {name: 'my dataset', size: 1024}, true,
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
      {name: 'split dataset', sample_rate: 0.8}, true,
      function(error, datasetInfo) {
          if (!error && datasetInfo) {
            console.log(datasetInfo);
          }
      });
```

will create a new dataset by sampling 80% of the data in the original dataset.

Clusters can also be used to generate datasets containing the instances
grouped around each centroid. You will need the cluster id and the centroid id
to reference the dataset to be created. For instance,

```js
    cluster.create(datasetId, function (error, data) {
      var clusterId = data.resource;
      var centroidId = '000000';
      dataset.create(clusterId, {centroid: centroidId},
                     function (error, data) {
        console.log(data);
      });
    });
```

All datasets can be exported to a local CSV file using the ``download``
method of ``Dataset`` objects.

```js
    var bigml = require('bigml');
    dataset = new bigml.Dataset();
    dataset.download('dataset/53b0aa6837203f4341000034',
                     'my_exported_file.csv',
                     function (error, data) {
        console.log("data:" + data);
    });
```

would generate a new dataset containing the subset of instances in the cluster
associated to the centroid id ``000000``.

Similarly, for models, ensembles and logistic regressions
you will need a dataset as first argument,
evaluations will need a model as first argument and a dataset as second one and
predictions need a model as first argument too:

```js
    var bigml = require('bigml');
    var evaluation = new bigml.Evaluation();
    evaluation.create('model/51922d0b37203f2a8c000010',
                      'dataset/51b3c4c737203f16230000d1',
                      {'name': 'my evaluation'}, true,
      function(error, evaluationInfo) {
          if (!error && evaluationInfo) {
            console.log(evaluationInfo);
          }
      });
```

Newly-created resources are returned in an object with the following
keys:

-  **code**: If the request is successful you will get a
   `constants.HTTP_CREATED` (201) status code. Otherwise, it will be
   one of the standard HTTP error codes [detailed in the
   documentation](https://bigml.com/api/status_codes).
-  **resource**: The identifier of the new resource.
-  **location**: The location of the new resource.
-  **object**: The resource itself, as computed by BigML.
-  **error**: If an error occurs and the resource cannot be created, it
   will contain an additional code and a description of the error. In
   this case, **location**, and **resource** will be `null`.

Bigml.com will answer your `create` call immediately, even if the resource
is not finished yet (see the
[documentation on status
codes](https://bigml.com/api/status_codes) for the listing of
potential states and their semantics). To retrieve a finished resource,
you'll need to use the `get` method described in the next section.

Getting resources
-----------------

To retrieve an existing resource, you use the `get`
method of the corresponding class. Let's see an example of model retrieval:

```js
    var bigml = require('bigml');
    var model = new bigml.Model();
    model.get('model/51b3c45a37203f16230000b5',
              true,
              'only_model=true;limit=-1',
              function (error, resource) {
        if (!error && resource) {
          console.log(resource);
        }
      })
```

The first parameter is, obviously, the model id, and the rest of parameters are
optional. Passing a `true` value as the second argument (as in the example)
forces the `get` method to retry to
retrieve a finished model. In the previous section we saw that, right after
creation, resources evolve
through a series of states until they end up in a `FINISHED` (or `FAULTY`)
state.
Setting this boolean to `true` will force the `get` method to wait for
the resource to be finished before
executing the corresponding callback (default is set to `false`).
The third parameter is a query string
that can be used to filter the fields returned. In the example we set the
fields to be retrieved to those used in the model (default is an empty string).
The callback parameter is set to
a default printing function if absent.


Updating Resources
------------------

Each type of resource has a set of properties whose values can be updated.
Check the properties subsection of each resource in the [developers
documentation](https://bigml.com/developers) to see which are marked as
updatable. The `update` method of each resource class will let you modify
such properties. For instance,

```js
    var bigml = require('bigml');
    var ensemble = new bigml.Ensemble();
    ensemble.update('ensemble/51901f4337203f3a9a000215',
      {name: 'my name', tags: 'code example'}, true,
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
    var bigml = require('bigml');
    var source = new bigml.Source();
    source.delete('source/51b25fb237203f4410000010', true,
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
   status codes](https://bigml.com/api/status_codes) for more
   info.
-  **error** If the request does not succeed, it will contain an
   object with an error code and a message. It will be `null`
   otherwise.

The callback parameter is optional and a printing function is used as default.

Downloading Batch Predictions' (or Centroids') output
-----------------------------------------------------

Using batch predictions you can obtain the predictions given by a model or
ensemble on a dataset. Similarly, using batch centroids you will get the
centroids predicted by a cluster for each instance of a dataset.
The output is accessible through a BigML URL and can
be stored in a local file by using the download method.

```js
    var bigml = require('bigml');
    var batchPrediction = new bigml.BatchPrediction(),
      tmpFileName='/tmp/predictions.csv';
    // batch prediction creation call
    batchPrediction.create('model/52e4680f37203f20bb000da7',
                           'dataset/52e6bd1a37203f3eac000392',
                           {'name': 'my batch prediction'},
        function(error, batchPredictionInfo) {
          if (!error && batchPredictionInfo) {
            // retrieving batch prediction finished resource
            batchPrediction.get(batchPredictionInfo, true,
              function (error, batchPredictionInfo) {
                if (batchPredictionInfo.object.status.code === bigml.constants.FINISHED) {
                  // retrieving the batch prediction output file and storing it
                  // in the local file system
                  batchPrediction.download(batchPredictionInfo,
                                           tmpFileName,
                    function (error, cbFilename) {
                      console.log(cbFilename);
                    });
                }
              });
          }
        });
```

If no `filename` is given, the callback receives the error and the
request object used to download the url.

Listing, Filtering and Ordering Resources
-----------------------------------------

Each type of resource has its own `list` method that allows you to
retrieve groups of available resources of that kind. You can also add some
filters to select
specific subsets of them and even order the results. The returned list will
show the 20 most recent resources. That limit can be modified by setting
the `limit` argument in the query string. For more information about the syntax
of query strings filters and orderings, you can check the fields labeled
as *filterable* and *sortable* in the listings section of [BigML
documentation](https://bigml.com/developers) for each resource. As an
example, we can see how to list the first 20 sources

```js
    var bigml = require('bigml');
    var source = new bigml.Source();
    source.list(function (error, list) {
        if (!error && list) {
          console.log(list);
        }
      })
```

and if you want the first 5 sources created before April 1st,
2013:

```js
    var bigml = require('bigml');
    var source = new bigml.Source();
    source.list('limit=5;created__lt=2013-04-1',
      function (error, list) {
        if (!error && list) {
          console.log(list);
        }
      })
```

and if you want to select the first 5 as ordered by name:

```js
    var bigml = require('bigml');
    var source = new bigml.Source();
    source.list('limit=5;created__lt=2013-04-1;order_by=name',
      function (error, list) {
        if (!error && list) {
          console.log(list);
        }
      })
```

In this method, both parameters are optional and, if no callback is given,
a basic printing function is used instead.

The list object will have the following structure:

-  **code**: If the request is successful you will get a
   `constants.HTTP_OK` (200) status code. Otherwise, it will be one of
   the standard HTTP error codes. See [BigML documentation on status
   codes](https://bigml.com/api/status_codes) for more info.
-  **meta**: An object including the following keys that can help you
   paginate listings:

   -  **previous**: Path to get the previous page or `null` if there
      is no previous page.
   -  **next**: Path to get the next page or `null` if there is no
      next page.
   -  **offset**: How far off from the first entry in the resources is
      the first one listed in the resources key.
   -  **limit**: Maximum number of resources that you will get listed in
      the resources key.
   -  **total\_count**: The total number of resources in BigML.

-  **objects**: A list of resources as returned by BigML.
-  **error**: If an error occurs and the resource cannot be created, it
   will contain an additional code and a description of the error. In
   this case, **meta**, and **resources** will be `null`.

a simple example of what a `list` call would retrieve is this one, where
we asked for the 2 most recent sources:

```js
    var bigml = require('bigml');
    var source = new bigml.Source();
    source.list('limit=2',
      function (error, list) {
        if (!error && list) {
          console.log(list);
        }
      })
    > { code: 200,
      meta:
       { limit: 2,
         next: '/andromeda/source?username=mmerce&api_key=c972018dc5f2789e65c74ba3170fda31d02e00c0&limit=2&offset=2',
         offset: 0,
         previous: null,
         total_count: 653 },
      resources:
       [ { category: 0,
           code: 200,
           content_type: 'text/csv',
           created: '2013-06-11T00:01:51.526000',
           credits: 0,
           description: '',
           file_name: 'iris.csv',
           md5: 'd1175c032e1042bec7f974c91e4a65ae',
           name: 'iris.csv',
           number_of_datasets: 0,
           number_of_ensembles: 0,
           number_of_models: 0,
           number_of_predictions: 0,
           private: true,
           resource: 'source/51b668ef37203f50a4000005',
           size: 4608,
           source_parser: [Object],
           status: [Object],
           subscription: false,
           tags: [],
           type: 0,
           updated: '2013-06-11T00:02:06.381000' },
         { category: 0,
           code: 200,
           content_type: 'text/csv',
           created: '2013-06-09T00:15:00.574000',
           credits: 0,
           description: '',
           file_name: 'iris.csv',
           md5: 'd1175c032e1042bec7f974c91e4a65ae',
           name: 'my source',
           number_of_datasets: 0,
           number_of_ensembles: 0,
           number_of_models: 0,
           number_of_predictions: 0,
           private: true,
           resource: 'source/51b3c90437203f16230000dd',
           size: 4608,
           source_parser: [Object],
           status: [Object],
           subscription: false,
           tags: [],
           type: 0,
           updated: '2013-06-09T00:15:00.780000' } ],
      error: null }
```


Local Models
------------

A remote model encloses all the information required to make
predictions. Thus, once you retrieve a remote model, you can build its local
version and predict locally. This can be easily done using
the `LocalModel` class.

```js
    var bigml = require('bigml');
    var localModel = new bigml.LocalModel('model/51922d0b37203f2a8c000010');
    localModel.predict({'petal length': 1},
                       function(error, prediction) {console.log(prediction)});
```

As you see, the first parameter to the `LocalModel` constructor is a model id
(or object). The constructor allows a second optional argument, a connection
object (as described in the [Authentication section](#authentication)).

```js
    var bigml = require('bigml');
    var myUser = 'myuser';
    var myKey = 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291';
    var localModel = new bigml.LocalModel('model/51922d0b37203f2a8c000010',
                                          new bigml.BigML(myUser, myKey));
    localModel.predict({'petal length': 1},
                       function(error, prediction) {console.log(prediction)});
```

The predict method can also be used labelling input data with the corresponding
field id.

```js
    var bigml = require('bigml');
    var localModel = new bigml.LocalModel('model/51922d0b37203f2a8c000010');
    localModel.predict({'000002': 1},
                       function(error, prediction) {console.log(prediction)});
```

When the first argument is a finished model object, the constructor creates
immediately
a `LocalModel` instance ready to predict. Then, the `LocalModel.predict`
method can be immediately called in a synchronous way.


```js
    var bigml = require('bigml');
    var model = new bigml.Model();
    model.get('model/51b3c45a37203f16230000b5',
              true,
              'only_model=true;limit=-1',
              function (error, resource) {
        if (!error && resource) {
          var localModel = new bigml.LocalModel(resource);
          var prediction = localModel.predict({'petal length': 3});
          console.log(prediction);
        }
      })
```
Note that the `get` method's second and third arguments ensure that the
retrieval waits for the model to be finished before retrieving it and that all
the fields used in the model will be downloaded. Beware of using
filtered fields models to instantiate a local model. If an important field is
missing (because it has been excluded or
filtered), an exception will arise. In this example, the connection to BigML
is used only in the `get` method call to retrieve the remote model information.
The callback code, where the `localModel` and predictions are built, is
strictly local.

On the other hand, when the first argument for the `LocalModel` constructor
is a model id, it automatically calls internally
the `bigml.Model.get` method to retrieve the remote model information. As this
is an asyncronous procedure, the `LocalModel.predict` method must wait for
the built process to complete before making predictions. When using the
previous callback syntax this condition is internally ensured and you need
not care for these details. However, you may
want to use the synchronous version of the predict method in this case too.
Then you must be aware that the `LocalModel`
`ready` event is triggered on completion and at the same time the
`LocalModel.ready` attribute is set to true. You can wait for
the `ready` event to make predictions synchronously from then on like in:

```js
    var bigml = require('bigml');
    var localModel = new bigml.LocalModel('model/51922d0b37203f2a8c000010');
    function doPredictions() {
      var prediction = localModel.predict({'petal length': 1});
      console.log(prediction);
    }
    if (localModel.ready) {
      doPredictions();
    } else {
      localModel.on('ready', function () {doPredictions()});
    }
```

You can also create a `LocalModel` from a JSON file containing the model
structure by setting the path to the file as first parameter:

```js
    var bigml = require('bigml');
    var localModel = new bigml.LocalModel('my_dir/my_model.json');
    localModel.predict({'000002': 1},
                       function(error, prediction) {console.log(prediction)});
```

Predictions' Missing Strategy
----------------------------

There are two different strategies when dealing with missing values
in input data for the fields used in the model rules. The default
strategy used in predictions when a missing value is found for the
field used to split the node is returning the prediction of the previous node.

```js
    var bigml = require('bigml');
    var LAST_PREDICTION = 0;
    var localModel = new bigml.LocalModel('model/51922d0b37203f2a8c000010');
    localModel.predict({'petal length': 1}, LAST_PREDICTION,
                       function(error, prediction) {console.log(prediction)});
```

The other strategy when a missing value is found is considering both splits
valid and following the rules to the final leaves of the tree. The prediction
is built considering all the predictions of the leaves reached, averaging
them in regressions and selecting the majority class for classifications.

```js
    var bigml = require('bigml');
    var PROPORTIONAL = 1;
    var localModel = new bigml.LocalModel('model/51922d0b37203f2a8c000010');
    localModel.predict({'petal length': 1}, PROPORTIONAL,
                       function(error, prediction) {console.log(prediction)});
```

Local Ensembles
---------------

As in the local model case, remote ensembles can also be used locally through
the `LocalEnsemble` class to make local predictions. The simplest way to
create a `LocalEnsemble` is:

```js
    var bigml = require('bigml');
    var localEnsemble = new bigml.LocalEnsemble('ensemble/51901f4337203f3a9a000215');
    localEnsemble.predict({'petal length': 1}, 0,
                          function(error, prediction) {console.log(prediction)});
```

This call will download all the ensemble related info (and each of its
component models) and use it to predict by combining the predictions
of each individual
model. The algorithm used to combine these predictions depends
on the ensemble type (`Decision Forest`,
`Random Decision Forest` or `Boosting Trees`) and you can learn more about
them in the
[ensembles section of the API documents](https://bigml.com/api/ensembles).
The example shows
a `Decision Forest` using a majority system (classifications)
or an average system
(regressions) to combine the models' predictions.
The first argument of the `LocalEnsemble.predict`
method
is the input data to predict from, the second one is a code that sets the
combination method (only useful in `Decision Forests`):

- 0 for **plurality**: one vote per each model prediction
- 1 for **confidence weighted**: each prediction's vote has its confidence as
    associated weight.
- 2 for **distribution weighted**: each model contributes to the final
    prediction with the distribution of possible values in the final
    prediction node weighted by its distribution weight (the number of
    instances that have that value over the total number of instances in the
    node).
- 3 for **threshold**: one vote per each model prediction. Needs an additional
    object with two properties: threshold and category. The category is
    predicted if and only if the number of predictions for that category is
    at least the threshold value.
    Otherwise, the prediction is plurality for the rest of predicted
    values.

An there's an optional third argument named `options` that specify some
additional configuration values, such as the missing strategy used in each
model's prediction:

```js
    var bigml = require('bigml');
    var localEnsemble = new bigml.LocalEnsemble('ensemble/51901f4337203f3a9a000215');
    localEnsemble.predict({'petal length': 1}, 0, {missingStrategy: 1},
                          function(error, prediction) {console.log(prediction)});
```
in this case the proportional missing strategy (default would be last
prediction missing strategy) will be applied.

Another example would be the `threshold` combination method, where the third
argument contains the `threshold` and `category` values used in the algorithm:

```js
    var bigml = require('bigml');
    var localEnsemble = new bigml.LocalEnsemble('ensemble/528ba06e37203f5bc3000000');
    localEnsemble.predict({'petal length': 0.9, 'petal width': 3.0}, 3,
                          {threshold: 3, category: 'Iris-virginica'},
                          function(error, prediction) {console.log(prediction)});
```

As in `LocalModel`, the constructor of `LocalEnsemble` has as
first argument the ensemble id (or object) or a list of model ids (or objects)
as well as a second optional connection
argument. Building a `LocalEnsemble` is an asynchronous process because the
constructor will need to call the `get` methods of the remote ensemble object
and its component models. Thus, the `LocalEnsemble.predict` method will have
to wait for the object to be entirely built before making the prediction. This
is internally done when you use the callback syntax for the `predict` method.
In case you want to call the `LocalEnsemble.predict` method as a synchronous
function, you should first make sure that the constructor has finished building
the object by checking the `LocalEnsemble.ready` attribute and listening
to the `ready` event. For instance,

```js
    var bigml = require('bigml');
    var localEnsemble = new bigml.LocalEnsemble('ensemble/51901f4337203f3a9a000215');
    function doPredictions() {
      var prediction = localEnsemble.predict({'petal length': 1}, 2);
      console.log(prediction);
    }
    if (localEnsemble.ready) {
      doPredictions();
    } else {
      localEnsemble.on('ready', function () {doPredictions()});
    }
```
would first download the remote ensemble and its component models, then
construct a local model for each one and predict using these local models.
In this case, the final prediction is made by combining the individual local
model's predictions using a distribution weighted method.

The same can be done for an array containing a list of models (only bagging
ensembles and random decision forests can be built this way), regardless of
whether they belong to a remote ensemble or not:

```js
    var bigml = require('bigml');
    var localEnsemble = new bigml.LocalEnsemble([
      'model/51bb69b437203f02b50004ce', 'model/51bb69b437203f02b50004d0']);
    localEnsemble.predict({'petal length': 1}, 0,
                          function(error, prediction) {console.log(prediction)});
```

Local Logistic Regressions
--------------------------

A remote logistic regression model encloses all the information
required to predict the categorical value of the objective field associated
to a given input data set.
Thus, you can build a local version of
a logistic regression model and predict the category locally using
the `LocalLogisticRegression` class.

```js
    var bigml = require('bigml');
    var localLogisticRegression = new bigml.LocalLogisticRegression(
        'logisticregression/51922d0b37203f2a8c001010');
    localLogisticRegression.predict({'petal length': 1, 'petal width': 1,
                                     'sepal length': 1, 'sepal width': 1},
                          function(error, prediction) {
                            console.log(prediction)});
```

Note that, to find the associated prediction, input data cannot contain missing
values in numeric fields. The predict method can also be used labelling
input data with the corresponding field id.

As you see, the first parameter to the `LocalLogisticRegression` constructor
is a logistic regression id (or object). The constructor allows a second
optional argument, a connection
object (as described in the [Authentication section](#authentication)).

```js
    var bigml = require('bigml');
    var myUser = 'myuser';
    var myKey = 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291';
    var localLogisticRegression = new bigml.LocalLogisticRegression(
        'logisticregression/51922d0b37203f2a8c001010',
        new bigml.BigML(myUser, myKey));
    localLogisticRegression.predict({'000000': 1, '000001': 1,
                           '000002': 1, '000003': 1},
                          function(error, prediction) {
                            console.log(prediction)});
```

When the first argument is a finished logistic regression object,
the constructor creates immediately
a `LocalLogisticRegression` instance ready to predict. Then,
the `LocalLogisticRegression.predict`
method can be immediately called in a synchronous way.


```js
    var bigml = require('bigml');
    var logisticRegression = new bigml.LogisticRegression();
    logisticRegression.get('logisticregression/51b3c45a37203f16230000b5', true,
                'only_model=true;limit=-1',
                function (error, resource) {
        if (!error && resource) {
          var localLogisticRegression = new bigml.LocalLogisticRegression(
            resource);
          var prediction = localLogisticRegression.predict(
            {'000000': 1, '000001': 1,
             '000002': 1, '000003': 1});
          console.log(prediction);
        }
      })
```
Note that the `get` method's second and third arguments ensure that the
retrieval waits for the model to be finished before retrieving it and that all
the fields used in the logistic regression will be downloaded respectively.
Beware of using
filtered fields logistic regressions to instantiate a local logistic regression
object. If an important field
is missing (because it has been excluded or
filtered), an exception will arise. In this example, the connection to BigML
is used only in the `get` method call to retrieve the remote logistic
regression
information. The callback code, where the `localLogisticRegression`
and predictions
are built, is strictly local.

Local Clusters
--------------

A remote cluster encloses all the information required to predict the centroid
associated to a given input data set. Thus, you can build a local version of
a cluster and predict centroids locally using
the `LocalCluster` class.

```js
    var bigml = require('bigml');
    var localCluster = new bigml.LocalCluster('cluster/51922d0b37203f2a8c000010');
    localCluster.centroid({'petal length': 1, 'petal width': 1,
                           'sepal length': 1, 'sepal width': 1,
                           'species': 'Iris-setosa'},
                          function(error, centroid) {console.log(centroid)});
```

Note that, to find the associated centroid, input data cannot contain missing
values in numeric fields. The centroid method can also be used labelling
input data with the corresponding field id.

As you see, the first parameter to the `LocalCluster` constructor is a cluster
id (or object). The constructor allows a second optional argument, a connection
object (as described in the [Authentication section](#authentication)).

```js
    var bigml = require('bigml');
    var myUser = 'myuser';
    var myKey = 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291';
    var localCluster = new bigml.LocalCluster('cluster/51922d0b37203f2a8c000010',
                                              new bigml.BigML(myUser, myKey));
    localCluster.centroid({'000000': 1, '000001': 1,
                           '000002': 1, '000003': 1,
                           '000004': 'Iris-setosa'},
                          function(error, centroid) {console.log(centroid)});
```

When the first argument is a finished cluster object, the constructor creates
immediately
a `LocalCluster` instance ready to predict. Then, the `LocalCluster.centroid`
method can be immediately called in a synchronous way.


```js
    var bigml = require('bigml');
    var cluster = new bigml.Cluster();
    cluster.get('cluster/51b3c45a37203f16230000b5', true,
                'only_model=true;limit=-1',
                function (error, resource) {
        if (!error && resource) {
          var localCluster = new bigml.LocalCluster(resource);
          var centroid = localCluster.centroid({'000000': 1, '000001': 1,
                                                '000002': 1, '000003': 1,
                                                '000004': 'Iris-setosa'});
          console.log(centroid);
        }
      })
```
Note that the `get` method's second and third arguments ensure that the
retrieval waits for the model to be finished before retrieving it and that all
the fields used in the cluster will be downloaded respectively. Beware of using
filtered fields clusters to instantiate a local cluster. If an important field
is missing (because it has been excluded or
filtered), an exception will arise. In this example, the connection to BigML
is used only in the `get` method call to retrieve the remote cluster
information. The callback code, where the `localCluster` and predictions
are built, is strictly local.

Local Anomaly Detectors
-----------------------

A remote anomaly detector encloses all the information required to predict the
anomaly score
associated to a given input data set. Thus, you can build a local version of
an anomaly detector and predict anomaly scores locally using
the `LocalAnomaly` class.

```js
    var bigml = require('bigml');
    var localAnomaly = new bigml.LocalAnomaly('anomaly/51922d0b37203f2a8c003010');
    localAnomaly.anomalyScore({'srv_serror_rate': 0.0, 'src_bytes': 181.0,
                               'srv_count': 8.0, 'serror_rate': 0.0},
                          function(error, anomalyScore) {
                                console.log(anomalyScore)});
```

The anomaly score method can also be used labelling
input data with the corresponding field id.

As you see, the first parameter to the `LocalAnomaly` constructor is an anomaly
detector id (or object). The constructor allows a second optional argument,
a connection
object (as described in the [Authentication section](#authentication)).

```js
    var bigml = require('bigml');
    var myUser = 'myuser';
    var myKey = 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291';
    var localAnomaly = new bigml.LocalAnomaly('anomaly/51922d0b37203f2a8c003010',
                                              new bigml.BigML(myUser, myKey));
    localAnomaly.anomalyScore({'000020': 9.0, '000004': 181.0, '000016': 8.0,
                               '000024': 0.0, '000025': 0.0},
                          function(error, anomalyScore) {console.log(anomalyScore)});
```

When the first argument is a finished anomaly detector object, the constructor creates
immediately
a `LocalAnomaly` instance ready to predict. Then, the `LocalAnomaly.anomalyScore`
method can be immediately called in a synchronous way.


```js
    var bigml = require('bigml');
    var anomaly = new bigml.Anomaly();
    anomaly.get('anomaly/51b3c45a37203f16230030b5', true,
                'only_model=true;limit=-1',
                function (error, resource) {
        if (!error && resource) {
          var localAnomaly = new bigml.LocalAnomaly(resource);
          var anomalyScore = localAnomaly.anomalyScore(
            {'000020': 9.0, '000004': 181.0, '000016': 8.0,
             '000024': 0.0, '000025': 0.0});
          console.log(anomalyScore);
        }
      })
```
Note that the `get` method's second and third arguments ensure that the
retrieval waits for the model to be finished before retrieving it and that all
the fields used in the anomaly detector will be downloaded respectively.
Beware of using
filtered fields anomaly detectors to instantiate a local anomaly detector.
If an important field
is missing (because it has been excluded or
filtered), an exception will arise. In this example, the connection to BigML
is used only in the `get` method call to retrieve the remote anomaly detector
information. The callback code, where the `localAnomaly` and scores
are built, is strictly local.

The top anomalies in the `LocalAnomaly` can be extracted from the original
dataset by filtering the rows that have the highest score. The filter
expression that can single out these rows can be extracted using the
`anomaliesFilter` method:

```js
    localAnomaly.anomaliesFilter(true,
                                 function(error, data) {console.log(data);});
```

When the first argument is set to `true`, the filter corresponds to the top
anomalies. On the contrary, if set to `false` the filter will exclude
the top anomalies from the dataset.

Local Associations
------------------

A remote association object encloses the information about which field values
in your dataset are related. The values are structured as items and
their relations are described as rules. The `LocalAssociation`
class allows you to build a local version of this remote object, and get
both the list of `Items` that can be related and the list of `AssociationRules`
that describe such relations. Creating a `LocalAssociation` object is as
simple as


```js
    var bigml = require('bigml');
    var localAssociation = new bigml.LocalAssociation('association/51922d0b37203f2a8c003010');
```

and you can list the `AssociationRules` that it contains using the `getRules`
method

```js
    var index = 0;
    associationRules = localAssociation.getRules();
    for (index = 0; index < associationRules.length; index++) {
      console.log(associationRules[index].describe());
    }
```

As you can see in the previous code, the `AssociationRule` object has a
`describe` method that will generate a human-readable description of the
rule.

The `getRules` method accepts also several arguments that will allow you to
filter the rules by its leverage, strength, support, p-value, the list of
items they contain or a user-given filter function. They can all be added
as attributes of a filters object as first argument. The second argument can
be a callback function. The previous example was a syncrhonous call to the
method that will only work once the `localAssociation` object is ready. To
use the method asyncrhonously you can use:

```js
    var associationRules;
    localAssociation.getRules(
      {minLeverage: 0.3}, // filter by minimum Leverage
      function(error, data) {associationRules = data;}) // callback code
```

See the method docstring for filter options details.

Similarly, you can obtain the list of `Items` involved in the association
rules

```js
    var index = 0;
    items = localAssociation.getItems();
    for (index = 0; index < items.length; index++) {
      console.log(items[index].describe());
    }
```

and they can be filtered by their field ID, name, an object containing
input data or a user-given function. See the method docstring for details.

You can also save the rules to a CSV file using the `rulesCSV` method

```js
    minimumLeverage = 0.3;
    localAssociation.rulesCSV(
      './my_csv.csv', // fileName
      {minLeverage: minimumLeverage}); // filters for the rules
```

as you can see, the first argument is the path to the CSV file where the
rules will be stored and the second one is the list of rules. In this example,
we are only storing the rules whose leverage is over the 0.3 threshold.

Both the `getItems` and the `rulesCSV` methods can also be called
asynchronously as we saw for the `getRules` method.


The `LocalAssociation` object can be used to retrieve the `association sets`
related to a certain input data.


```js
    var bigml = require('bigml');
    var localAssociation = new bigml.LocalAssociation(
      'association/55922d0b37203f2a8c003010');
    localAssociation.associationSet({product: 'cat food'},
                                    function(error, associationSet) {
                                      console.log(associationSet)});
```

When the
`LocalAssociation` instance is ready, the `LocalAssociation.associationSet`
method can be immediately called to predict in a synchronous way.


```js
    var bigml = require('bigml');
    var association = new bigml.Association();
    association.get('association/51b3c45a37203f16230530b5', true,
                    'only_model=true;limit=-1',
                    function (error, resource) {
            if (!error && resource) {
              var localAssociation = new bigml.LocalAssociation(resource);
              var associationSet = localAssociation.associationSet(
                {'000020': 'cat food'});
              console.log(associationSet);
            }
          })
```
In this example, the connection to BigML
is used only in the `get` method call to retrieve the remote association
information. The callback code, where the `localAssociation` and scores
are built, is strictly local.


Local Topic Models
------------------

A remote `topic model` object contains a list of topics extracted from the
terms in the collection of documents used in its training. The
`LocalTopicModel`
class allows you to build a local version of this remote object, and get
the list of `Topics` and the terms distribution for each of them. Using this
information, its `distribution` method computes the probabilities for a new
document to be classified under each of the `Topics`.
Creating a `LocalTopicModel` object is as
simple as


```js
    var bigml = require('bigml');
    var localTopicModel = new bigml.LocalTopicModel('topicmodel/51922d0b37203f4b8c003010');
```

and obtaining the `TopicDistribution` for a new document:

```js
    var newDocument = {"Message": "Where are you?when wil you reach here?"}
    localTopicModel.distribution(newDocument,
                                 function(error, topicDistribution) {
                                   console.log(topicDistribution)});
```

Note that only text fields are considered to decide the `topic distribution`
of a document, and their contents will be concatenated.

As you see, the first parameter to the `LocalTopicModel` constructor is a
`topic model`
id (or object). The constructor allows a second optional argument, a connection
object (as described in the [Authentication section](#authentication)).

```js
    var bigml = require('bigml');
    var myUser = 'myuser';
    var myKey = 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291';
    var localTopicModel = new bigml.LocalTopicModel('topicmodel/51522d0b37203f2a8c000010',
                                                    new bigml.BigML(myUser, myKey));
    localTopicModel.distribution({'000001': "Where are you?when wil you reach here?"},
                                 function(error, topicDistribution) {console.log(topicDistribution)});
```

When the first argument is a finished `topic model` object,
the constructor creates
immediately
a `LocalTopicModel` instance ready to be used. Then, the
`LocalTopicModel.distribution` method can be immediately called
in a synchronous way.


```js
    var bigml = require('bigml');
    var topicModel = new bigml.TopicModel();
    topicModel.get('topicmodel/51b3c45a47203f16230000b5', true,
                   'only_model=true;limit=-1',
                   function (error, resource) {
        if (!error && resource) {
          var localTopicModel = new bigml.LocalTopicModel(resource);
          var topicDistribution = localTopicModel.distribution(
            {'000001': "Where are you?when wil you reach here?"},
          console.log(topicDistribution);
        }
      })
```
Note that the `get` method's second and third arguments ensure that the
retrieval waits for the `topic model` to be finished before retrieving
it and that all
the fields used in the `topic model` will be downloaded.
Beware of using
filtered fields topic models to instantiate a local topic model.
If an important field
is missing (because it has been excluded or
filtered), an exception will arise. In this example, the connection to BigML
is used only in the `get` method call to retrieve the remote topic model
information. The callback code, where the `localTopicModel` and distributions
are built, is strictly local.

Local Time Series
-----------------

A remote time series resource encloses all the information
required to produce forecasts for all the numeric fields that have been
previously declared as its objective fields.
Thus, you can build a local version of
a time series and generate forecasts using the `LocalTimeSeries` class.

```js
    var bigml = require('bigml');
    var localTimeSeries = new bigml.LocalTimeSeries(
        'timeseries/51922d0b37203f2a8c001010');
    localTimeSeries.forecast({'Final': {'horizon': 10}},
                              function(error, forecast) {
                                console.log(forecast)});
```

The forecast method can also be used labelling
input data with the corresponding field id. The result of this call will
contain forecasts for the fields, horizons and ETS models given as input
data. In the example, the response will be an object like:

```js
    { '000005': [ { model: 'A,N,N', pointForecast: [ 68.53181,
                                                     68.53181,
                                                     68.53181,
                                                     68.53181,
                                                     68.53181,
                                                     68.53181,
                                                     68.53181,
                                                     68.53181,
                                                     68.53181,
                                                     68.53181 ]}]}
```
that contains the ID of the forecasted field and the forecast for the best
performing model in the `time series` (according to `aic`). You can
read more about the available error metrics and the input data parameters in
the [time series API documentation](https://bigml.com/api/timeseries) and
the [forecast API documentation](https://bigml.com/api/forecasts).

As you see, the first parameter to the `LocalTimeSeries` constructor
is a time series ID (or object). The constructor allows a second
optional argument, a connection
object (as described in the [Authentication section](#authentication)).

```js
    var bigml = require('bigml');
    var myUser = 'myuser';
    var myKey = 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291';
    var localTimeSeries = new bigml.LocalTimeSeries(
        'timeseries/51922d0b37203f2a8c001010',
        new bigml.BigML(myUser, myKey));
    localTimeSeries.forecast({'000005': {"horizon": 10,
                                         "ets_models": {"criterion": "aic",
                                                        "names": ["A,A,N"],
                                                        "indices": [3,7],
                                                        "limit": 2}}},
                          function(error, forecast) {
                            console.log(forecast)});
```

When the first argument is a finished time series object,
the constructor creates immediately
a `LocalTimeSeries` instance ready to predict. Then,
the `LocalTimeSeries.forecast`
method can be immediately called in a synchronous way.


```js
    var bigml = require('bigml');
    var timeSeries = new bigml.TimeSeries();
    timeSeries.get('timeseries/51b3c45a37203f16230000b5', true,
                'only_model=true;limit=-1',
                function (error, resource) {
        if (!error && resource) {
          var localTimeSeries = new bigml.LocalTimeSeries(
            resource);
          var prediction = localTimeSeries.forecast(
            {'Final': {'horizon': 10}});
          console.log(prediction);
        }
      })
```
Note that the `get` method's second and third arguments ensure that the
retrieval waits for the time series to be finished before retrieving it
and that all
the fields used in the time series models will be downloaded respectively.
Beware of using
filtered fields time series to instantiate a local time series
object.

Logging configuration
---------------------

Logging is configured at startup and uses the
[winston](https://github.com/flatiron/winston) logging library. Logs are sent
both to console and a `bigml.log` file by default. You can change this
behaviour by using:

- BIGML_LOG_FILE: path to the log file.
- BIGML_LOG_LEVEL: log level (0 - no output at all, 1 - console and file log,
                              2 - console log only, 3 - file log only,
                              4 - console and log file with debug info)

For instance,

```batch
export BIGML_LOG_FILE=/tmp/my_log_file.log
export BIGML_LOG_LEVEL=3
```

would store log information only in the `/tmp/my_log_file.log` file.

Additional Information
----------------------

For additional information about the API, see the
[BigML developer's documentation](https://bigml.com/api).
