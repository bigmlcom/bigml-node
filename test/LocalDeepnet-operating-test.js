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

describe(scriptName + ': Manage local deepnet regression objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    deepnetId, deepnet = new bigml.Deepnet(),
    deepnetResource, deepnetFinishedResource,
    prediction = new bigml.Prediction(),
    localDeepnetRegression, prediction = new bigml.Prediction(),
    prediction1 = {"prediction":"Iris-setosa","probability":0.50504,"distribution":[{"category":"Iris-setosa","probability":0.50504},{"category":"Iris-versicolor","probability":0.48348},{"category":"Iris-versicolor","probability":0.01149}]},
    inputData1 = {'petal length': 1, 'sepal length': 1,
                  'petal width': 1, 'sepal width': 1},
    operatingPoint1 = {"kind": "probability",
                       "positiveClass": "Iris-setosa",
                       "threshold": 0.1},
    operatingPoint2 = {"kind": "probability",
                       "positiveClass": "Iris-setosa",
                       "threshold": 1},
    prediction2 = "Iris-versicolor";

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        deepnet.create(datasetId, undefined,
          function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          deepnetId = data.resource;
          deepnetResource = data;
          deepnet.get(deepnetResource, true, 'only_model=true',
            function (error, data) {
            deepnetFinishedResource = data;
            prediction.create(deepnet.resource, inputData1,
              function (error, data) {
                assert.equal(prediction1.prediction, data.object.output);
                assert.equal(
                  Math.round(prediction1.probability * 100000) / 100000,
                             data.object.probability)
                done();
            });
          });
        });
      });
    });
  });

  describe('LocalDeepnet(deepnetId)', function () {
    it('should create a LocalDeepnet from a deepnet Id',
      function (done) {
      localDeepnet = new bigml.LocalDeepnet(deepnetId);
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
      localDeepnet.predict(inputData1, false, operatingPoint1,
      function (error, data) {
        assert.equal(data.prediction, prediction1.prediction);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localDeepnet.predict(inputData1, false,
                                            operatingPoint1);
      assert.equal(prediction.prediction, prediction1.prediction);
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localDeepnet.predict(inputData1, false, operatingPoint2,
      function (error, data) {
        assert.equal(data.prediction, prediction2);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localDeepnet.predict(inputData1,
                                            false,
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
    deepnet.delete(deepnetId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
