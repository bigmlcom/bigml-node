/**
 * Copyright 2019-2020 BigML
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


function jsonEqual(a, b, keys) {
  var index, len, key;
  assert.equal(Object.keys(a).length, Object.keys(b).length);
  keys = (typeof keys === "undefined") ? Object.keys(a) : keys;
  for (index = 0, len = keys.length; index < len; index++) {
    key = keys[index];
    a[key] = isNaN(a[key]) ? 0 : a[key]
    b[key] = isNaN(b[key]) ? 0 : b[key]
    a[key] = Math.round(a[key] * 100000, 5) /100000.0;
    b[key] = Math.round(b[key] * 100000, 5) /100000.0;
    assert.equal(a[key], b[key], "Mismatch in key " + key + ": "
      + a[key] + ", " + b[key]);
  }
}

function nanToZero(value) {
  return (isNaN(value) || value == null) ? 0 : value;
}

describe(scriptName + ': Manage local linear regression objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    linearId, linear = new bigml.LinearRegression(),
    linearResource, prediction = new bigml.Prediction(),
    localLinearRegression, prediction = new bigml.Prediction(),
    prediction1 = {prediction: 0.42077,
                   confidenceBounds: {confidenceInterval: 0,
                                      predictionInterval: 0.28244,
                                      valid: false}},
    inputData1 = {'000000': 1, '000001': 1,
                  '000002': 1, '000004': 'Iris-setosa'};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        linear.create(datasetId, {"objective_field": "000003",
                                  "field_codings": [{"field": "species",
                                                     "coding": "other",
                                                     "coefficients": [[1,1,1,0],
                                                                      [0,1,0,0]]}]},
          function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          linearId = data.resource;
          linearResource = data;
          linear.get(linearResource, true, 'only_model=true',
            function (error, data) {
            prediction.create(linearId, inputData1, function(error, data) {
              assert.equal(data.object.output, prediction1.prediction);
              assert.equal(nanToZero(data.object["confidence_bounds"]["confidence_interval"]), prediction1.confidenceBounds.confidenceInterval);
              assert.equal(nanToZero(data.object["confidence_bounds"]["prediction_interval"]),
                          prediction1.confidenceBounds.predictionInterval);
              done();
            });
          });
        });
      });
    });
  });

  describe('LocalLinearRegression(linearId)', function () {
    it('should create a LocalLinearRegression from a linear regression Id',
      function (done) {
      localLinearRegression = new bigml.LocalLinearRegression(linearId);
      if (localLinearRegression.ready) {
        assert.ok(true);
        done();
      } else {
        localLinearRegression.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localLinearRegression.predict(inputData1, false, function (error, data) {
        jsonEqual(data, prediction1, ["prediction"]);
        jsonEqual(data.confidenceBounds, prediction1.confidenceBounds);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localLinearRegression.predict(inputData1);
        jsonEqual(prediction, prediction1, ["prediction"]);
        jsonEqual(prediction.confidenceBounds, prediction1.confidenceBounds);
    });
  });
  describe('LocalLinearRegression(localRegressionResource)', function () {
    it('should create a LocalLinearRegression from a linear regression unfinished resource',
      function (done) {
      localLinearRegression = new bigml.LocalLinearRegression(linearResource);
      if (localLinearRegression.ready) {
        assert.ok(true);
        done();
      } else {
        localLinearRegression.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localLinearRegression.predict(inputData1, function (error, data) {
        jsonEqual(data, prediction1, ["prediction"]);
        jsonEqual(data.confidenceBounds, prediction1.confidenceBounds);
        done();
      });
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
    linear.delete(linearId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
