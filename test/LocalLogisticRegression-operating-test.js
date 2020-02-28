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

describe(scriptName + ': Manage local logistic regression objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    logisticId, logistic = new bigml.LogisticRegression(),
    logisticResource, logisticFinishedResource,
    localLogisticRegression, prediction = new bigml.Prediction(),
    prediction1 = {"prediction":"Iris-virginica","probability":0.5481030132399242,"distribution":[{"category":"Iris-virginica","probability":0.5481030132399242},{"category":"Iris-versicolor","probability":0.24434611164870548},{"category":"Iris-setosa","probability":0.20755087511137035}]},
    inputData1 = {'petal length': 1, 'sepal length': 1,
                  'petal width': 1, 'sepal width': 1},
    operatingPoint1 = {"kind": "probability",
                       "positiveClass": "Iris-virginica",
                       "threshold": 0.1},
    operatingPoint2 = {"kind": "probability",
                       "positiveClass": "Iris-virginica",
                       "threshold": 1},
    prediction2 = "Iris-versicolor";

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        logistic.create(datasetId, {balance_fields: false},
          function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          logisticId = data.resource;
          logisticResource = data;
          logistic.get(logisticResource, true, 'only_model=true',
            function (error, data) {
            logisticFinishedResource = data;
            done();
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
      localLogisticRegression.predict(inputData1, false, operatingPoint1,
      function (error, data) {
        assert.equal(data.prediction, prediction1.prediction);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localLogisticRegression.predict(inputData1, false,
                                                       operatingPoint1);
      assert.equal(prediction.prediction, prediction1.prediction);
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localLogisticRegression.predict(inputData1, false, operatingPoint2,
      function (error, data) {
        assert.equal(data.prediction, prediction2);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localLogisticRegression.predict(inputData1, false,
                                                       operatingPoint2);
      assert.equal(prediction.prediction, prediction2);
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
