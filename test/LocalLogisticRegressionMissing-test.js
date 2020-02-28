/**
 * Copyright 2018-2020 BigML
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

describe(scriptName + ': Manage local logistic regression objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    logisticId, logistic = new bigml.LogisticRegression(),
    logisticResource, logisticFinishedResource,
    prediction = new bigml.Prediction(),
    localLogisticRegression, prediction = new bigml.Prediction(),
    prediction1 = {"prediction":"Iris-versicolor","probability":0.70887,"distribution":[{"category":"Iris-versicolor","probability":0.70887},{"category":"Iris-setosa","probability":0.28876},{"category":"Iris-virginica","probability":0.00237}]},
    inputData1 = {'petal length': 1, 'sepal length': 1,
                  'petal width': 1, 'sepal width': 1};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        logistic.create(datasetId, {missing_numerics: false},
          function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          logisticId = data.resource;
          logisticResource = data;
          logistic.get(logisticResource, true, 'only_model=true',
            function (error, data) {
            logisticFinishedResource = data;
            prediction.create(data.resource, inputData1, function(error, data) {
              assert.equal(data.object.output, prediction1.prediction);
              assert.equal(data.object.probability, Math.round(prediction1.probability * 100000) / 100000);
              done();
            });
          });
        });
      });
    });
  });

  describe('LocalLogisticRegression(logisticId)', function () {
    it('should create a LocalLogisticRegression from a logistic regression Id',
      function (done) {
      localLogisticRegression = new bigml.LocalLogisticRegression(logisticId);
      if (localLogisticRegression.ready) {
        assert.ok(true);
        done();
      } else {
        localLogisticRegression.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localLogisticRegression.predict(inputData1, false, function (error, data) {
        assert.equal(JSON.stringify(data), JSON.stringify(prediction1));
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localLogisticRegression.predict(inputData1);
      assert.equal(JSON.stringify(prediction), JSON.stringify(prediction1));
    });
  });
  after(function (done) {
    source.delete(sourceId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    dataset.delete(datasetId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    logistic.delete(logisticId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
