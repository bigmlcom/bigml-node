BigML Node.js Bindings
======================

`BigML <https://bigml.com>`_ makes machine learning easy by taking care
of the details required to add data-driven decisions and predictive
power to your company. Unlike other machine learning services, BigML
creates
`beautiful predictive models <https://bigml.com/gallery/models>`_ that
can be easily understood and interacted with.

These BigML Node.js bindings allow you to interact with BigML.io, the API
for BigML. You can use it to easily create, retrieve, list, update, and
delete BigML resources (i.e., sources, datasets, models and,
predictions).

This module is licensed under the `Apache License, Version
2.0 <http://www.apache.org/licenses/LICENSE-2.0.html>`_.

Support
-------

Please report problems and bugs to our `BigML.io issue
tracker <https://github.com/bigmlcom/io/issues>`_.

Discussions about the different bindings take place in the general
`BigML mailing list <http://groups.google.com/group/bigml>`_. Or join us
in our `Campfire chatroom <https://bigmlinc.campfirenow.com/f20a0>`_.

Requirements
------------

Node 0.10 is currently supported by these bindings.

The only mandatory third-party dependencies are the
`request <https://github.com/mikeal/request.git>`_,
`winston <https://github.com/flatiron/winston.git>`_ and
`form-data <https://github.com/felixge/node-form-data.git>`_ libraries.
The testing environment requires the additional 
`mocha <https://github.com/visionmedia/mocha>`_ package. These
libraries are automatically installed during the setup. 

Installation
------------

To install the latest stable release with
`npm <https://npmjs.org/>`_::

    $ npm install -g bigml

You can also install the development version of the bindings by cloning the
Git repository to your local computer and issuing::

    $ npm install . -g

Importing the modules
---------------------

To use the library, import it with ``require``::

    $ node
    > bigml = require('bigml');

this will give you access to the following library structure:

    - bigml.BigML           connection object
    - bigml.utils           common utilities
    - bigml.constants       common constants
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
and `API key <https://bigml.com/account/apikey>`_ and are always
transmitted over HTTPS.

This module will look for your username and API key in the environment
variables ``BIGML_USERNAME`` and ``BIGML_API_KEY`` respectively. You canhe 
add the following lines to your ``.bashrc`` or ``.bash_profile`` to set
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
setting the third parameter ``dev_mode`` to ``true``::

    connection = new bigml.BigML('myusername',
                                 'ae579e7e53fb9abd646a6ff8aa99d4afe83ac291',
                                 true)

***********************************************
TODO: Change the following text to fit node.js.
***********************************************

Quick Start
-----------

Imagine that you want to use `this csv
file <https://static.bigml.com/csv/iris.csv>`_ containing the `Iris
flower dataset <http://en.wikipedia.org/wiki/Iris_flower_data_set>`_ to
predict the species of a flower whose ``sepal length`` is ``5`` and
whose ``sepal width`` is ``2.5``. A preview of the dataset is shown
below. It has 4 numeric fields: ``sepal length``, ``sepal width``,
``petal length``, ``petal width`` and a categorical field: ``species``.
By default, BigML considers the last field in the dataset as the
objective field (i.e., the field that you want to generate predictions
for).

::

    sepal length,sepal width,petal length,petal width,species
    5.1,3.5,1.4,0.2,Iris-setosa
    4.9,3.0,1.4,0.2,Iris-setosa
    4.7,3.2,1.3,0.2,Iris-setosa
    ...
    5.8,2.7,3.9,1.2,Iris-versicolor
    6.0,2.7,5.1,1.6,Iris-versicolor
    5.4,3.0,4.5,1.5,Iris-versicolor
    ...
    6.8,3.0,5.5,2.1,Iris-virginica
    5.7,2.5,5.0,2.0,Iris-virginica
    5.8,2.8,5.1,2.4,Iris-virginica

You can easily generate a prediction following these steps::

    from bigml.api import BigML

    api = BigML()

    source = api.create_source('./data/iris.csv')
    dataset = api.create_dataset(source)
    model = api.create_model(dataset)
    prediction = api.create_prediction(model, {'sepal length': 5, 'sepal width': 2.5})

You can then print the prediction using the ``pprint`` method::

    >>> api.pprint(prediction)
    species for {"sepal width": 2.5, "sepal length": 5} is Iris-virginica

Additional Information
----------------------

We've just barely scratched the surface. For additional information, see
the `full documentation for the Python
bindings on Read the Docs <http://bigml.readthedocs.org>`_.
Alternatively, the same documentation can be built from a local checkout
of the source by installing `Sphinx <http://sphinx.pocoo.org>`_
(``$ pip install sphinx``) and then running::

    $ cd docs
    $ make html

Then launch ``docs/_build/html/index.html`` in your browser.

How to Contribute
-----------------

Please follow the next steps:

  1. Fork the project on github.com.
  2. Create a new branch.
  3. Commit changes to the new branch.
  4. Send a `pull request <https://github.com/bigmlcom/python/pulls>`_.


For details on the underlying API, see the
`BigML API documentation <https://bigml.com/developers>`_.






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
                  function(error, prediction) {console.log(prediction)});
```

Local ensemble's prediction

```js
    Ensemble = require('./lib/Ensemble');
    ensemble = new Ensemble('ensemble/51901f4337203f3a9a000215');
    ensemble.predict({'petal length': 1}, 0, 
                     function(error, prediction) {console.log(prediction)});
```
