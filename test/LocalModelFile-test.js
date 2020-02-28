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

describe(scriptName + ': Manage local model objects', function () {
  var path = './data/iris_model.json',
    modelId, model = new bigml.Model(), modelResource, modelFinishedResource,
    localModel, firstPredictionConfidence, secondPredictionConfidence,
    proportionalConfidence = 0.84075;

  describe('LocalModel(modelJSONFilePath)', function () {
    it('should create a localModel from a JSON file containing the model', function (done) {
      localModel = new bigml.LocalModel(path);
      if (localModel.ready) {
        assert.ok(true);
        done();
      } else {
        localModel.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localModel.predict({'petal width': 0.5}, 0, function (error, data) {
        assert.equal(data.prediction, 'Iris-setosa');
        firstPredictionConfidence = data.confidence;
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predict({'petal length': 3});
      assert.equal(prediction.prediction, 'Iris-versicolor');
      secondPredictionConfidence = prediction.confidence;
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data keyed by field id',
       function (done) {
      localModel.predict({'000003': 0.5}, function (error, data) {
        assert.equal(data.prediction, 'Iris-setosa');
        assert.equal(data.confidence, firstPredictionConfidence);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data keyed by field id',
       function () {
      var prediction = localModel.predict({'000002': 3});
      assert.equal(prediction.prediction, 'Iris-versicolor');
      assert.equal(prediction.confidence, secondPredictionConfidence);
    });
  });
  describe('#predict(inputData, constants.PROPORTIONAL)', function () {
    it('should predict synchronously from input data using proportional missing strategy',
       function () {
      var prediction = localModel.predict({'petal length': 3}, constants.PROPORTIONAL);
      assert.equal(prediction.prediction, 'Iris-versicolor');
      assert.equal(prediction.confidence, proportionalConfidence);
    });
  });
});
