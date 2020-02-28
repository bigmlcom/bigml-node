/**
 * Copyright 2017-2020 BigML
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

var assert = require('assert'),
  bigml = require('../index'),
  constants = require('../lib/constants'),
  path = require('path');
var scriptName = path.basename(__filename);

function beforeFunc(csvPath, deepnetArgs, context) {
  return function (done) {

    var source = new bigml.Source(),
        dataset = new bigml.Dataset(),
        deepnet = new bigml.Deepnet();

    context.cleanUp = [];

    source.create(csvPath, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      context.cleanUp.push([source, data.resource]);
      dataset.create(data.resource, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        context.cleanUp.push([dataset, data.resource]);
        deepnet.create(data.resource, deepnetArgs, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          context.deepnetId = data.resource;
          context.cleanUp.push([deepnet, context.deepnetId]);
          context.deepnetResource = data;
          deepnet.get(context.deepnetResource, true, 'only_model=true',
                      function (error, data) {
                        context.deepnetFinishedResource = data;
                        done();
                      });
        });
      });
    });
  }
}

function afterFunc(context, done) {

  function deleteOneByOne(resourceList, failedList) {
    var handler, resourceId;
    if (resourceList.length == 0) {
      assert.deepEqual(failedList, []);
      done();
      return;
    }
    [handler, resourceId] = resourceList.shift();
    handler.delete(resourceId, function (error, data) {
      if (error != null && failedList.indexOf(resourceId) == -1) {
        failedList.push(resourceId);
      }
      deleteOneByOne(resourceList, failedList);
    });
  }
  
  deleteOneByOne(context.cleanUp, []);
}

describe(scriptName + ': Manage local model objects', function () {
  var context = {},
    localDeepnet, firstPredictionProbability, secondPredictionProbability,
    inputData1 = {},
    inputData2 = {'petal length': 1, 'sepal length': 1, 'petal width': 1,
                  'sepal width': 1},
    prediction1 = JSON.parse('{"prediction":"Iris-versicolor","probability":0.46999,"distribution":[{"category":"Iris-setosa","probability":0.4257},{"category":"Iris-versicolor","probability":0.46999},{"category":"Iris-virginica","probability":0.10432}]}'),
    prediction2 = JSON.parse('{"prediction":"Iris-setosa","probability":0.50504,"distribution":[{"category":"Iris-setosa","probability":0.50504},{"category":"Iris-versicolor","probability":0.48348},{"category":"Iris-virginica","probability":0.01149}]}')

  before(beforeFunc('./data/iris.csv', undefined, context));
 
  describe('LocalDeepnet(deepnetId)', function () {
    it('should create a localDeepnet from a deepnet Id', function (done) {
      localDeepnet = new bigml.LocalDeepnet(context.deepnetId);
      if (localDeepnet.ready) {
        assert.ok(true);
        done();
      } else {
        localDeepnet.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localDeepnet.predict(inputData1, 0, function (error, data) {
        assert.equal(data.prediction, prediction1.prediction);
        firstPredictionProbability = data.probability;
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localDeepnet.predict(inputData2);
      assert.equal(prediction.prediction, prediction2.prediction);
      secondPredictionProbability = prediction.probability;
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data keyed by field id',
       function () {
      var prediction = localDeepnet.predict({'000000': 1, '000001': 1, '000002': 1, '000003': 1});
      assert.equal(prediction.prediction, prediction2.prediction);
      assert.equal(prediction.probability, secondPredictionProbability);
    });
  });
  describe('LocalDeepnet(deepnetResource)', function () {
    it('should create a localDeepnet from a deepnet unfinished resource', function (done) {
      localDeepnet = new bigml.LocalDeepnet(context.deepnetResource);
      if (localDeepnet.ready) {
        assert.ok(true);
        done();
      } else {
        localDeepnet.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localDeepnet.predict(inputData1, function (error, data) {
        assert.equal(JSON.stringify(data), JSON.stringify(prediction1));
        done();
      });
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localDeepnet.predict(inputData2, function (error, data) {
        assert.equal(JSON.stringify(data), JSON.stringify(prediction2));
        done();
      });
    });
  });
  describe('LocalDeepnet(deepnetFinishedResource)', function () {
    it('should create a localDeepnet from a model finished resource', function () {
      localDeepnet = new bigml.LocalDeepnet(context.deepnetFinishedResource);
      assert.ok(localDeepnet.ready);
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localDeepnet.predict(inputData2, function (error, data) {
        assert.equal(JSON.stringify(data), JSON.stringify(prediction2));
        done();
      });
    });
  });
  after(function (done) {
    afterFunc(context, done);
  });
});

describe(scriptName + ': Local Regression Deepnets with Search', function () {
  var context = {},
    localDeepnet,
    inputData1 = {},
    inputData2 = {'Midterm': 50, 'Assignment': 19, 'Unknown': 1},
    prediction1 = JSON.parse('{ "prediction": 66.42764400447102, ' + 
                             '"unusedFields": ["Unknown"] }')
    prediction2 = JSON.parse('{ "prediction": -6.74669884503282, ' + 
                             '"unusedFields": ["Unknown"] }'),
    prediction3 = JSON.parse('{ "prediction": 38.31076738844381, ' + 
                             '"unusedFields": ["Unknown"] }');

  before(beforeFunc('./data/grades.csv', 
                    { search : true,
                      max_training_time: 120,
                      number_of_model_candidates: 10 },
                    context));

  describe('LocalDeepnet(deepnetId)', function () {
    it('should create a localDeepnet from a deepnet Id', function (done) {
      localDeepnet = new bigml.LocalDeepnet(context.deepnetId);
      if (localDeepnet.ready) {
        assert.ok(true);
        done();
      } else {
        localDeepnet.on('ready', function () {
          assert.ok(true);
          done();
        });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localDeepnet.predict(inputData1, 0, function (error, data) {
        assert.notEqual(data.prediction, null);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localDeepnet.predict(inputData2);
      assert.notEqual(prediction.prediction, null);
      secondPredictionProbability = prediction.probability;
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data keyed by field id',
       function () {
      var prediction = localDeepnet.predict({'000000': 1, '000001': 1, '000002': 1, '000003': 1});
      assert.notEqual(prediction.prediction, null);
    });
  });
  describe('LocalDeepnet(deepnetResource)', function () {
    it('should create a localDeepnet from a deepnet unfinished resource', function (done) {
      localDeepnet = new bigml.LocalDeepnet(context.deepnetResource);
      if (localDeepnet.ready) {
        assert.ok(true);
        done();
      } else {
        localDeepnet.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localDeepnet.predict(inputData1, true, function (error, data) {
        assert.notEqual(data.prediction, null);
        done();
      });
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localDeepnet.predict(inputData2, true, function (error, data) {
        assert.equal(JSON.stringify(data.unusedFields), 
                     JSON.stringify(prediction2.unusedFields));
        done();
      });
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localDeepnet.predict(inputData2, true, function (error, data) {
        assert.equal(JSON.stringify(data.unusedFields), 
                     JSON.stringify(prediction2.unusedFields));
        done();
      });
    });
  });
  after(function (done) {
    afterFunc(context, done);
  });
});
