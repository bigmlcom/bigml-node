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
  var sourceId, source = new bigml.Source(), path = './data/grades.csv',
    datasetId, dataset = new bigml.Dataset(),
    modelId, model = new bigml.Model(), modelResource, modelFinishedResource,
    prediction = new bigml.Prediction(),
    missingSplits = {"missing_splits": false},
    localModel, firstPredictionConfidence, secondPredictionConfidence,
    firstInput = {'Midterm': 10, 'TakeHome': 10}, firstPrediction,
    singleInstanceInput = {"Midterm": 20, "Tutorial": 90, "TakeHome": 100},
    thirdPrediction, thirdPredictionConfidence, medianPrediction = 46.67;

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        model.create(datasetId, missingSplits, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          modelId = data.resource;
          modelResource = data;
          model.get(modelResource, true, 'only_model=true',
            function (error, data) {
            modelFinishedResource = data;
            prediction.create(modelId, firstInput,
                              {missing_strategy: constants.LAST_PREDICTION},
                              function (error, data) {
                var info = data.object;
                firstPrediction = info.output;
                firstPredictionConfidence = info.confidence.toFixed(5);
                prediction.delete(data.resource, function (error, data) {});
                prediction.create(modelId, firstInput,
                                  {missing_strategy: constants.PROPORTIONAL},
                                  function (error, data) {
                    var info = data.object;
                    secondPrediction = info.output;
                    secondPredictionConfidence = info.confidence.toFixed(5);
                    prediction.delete(data.resource, function (error, data) {});
                    prediction.create(modelId, singleInstanceInput,
                                      {missing_strategy: constants.PROPORTIONAL},
                                       function (error, data) {
                        var info = data.object;
                        thirdPrediction = info.output;
                        thirdPredictionConfidence = info.confidence.toFixed(5);
                        prediction.delete(data.resource, function (error, data) {});
                        done();
                    });
                });
            });
          });
        });
      });
    });
  });

  describe('LocalModel(modelId)', function () {
    it('should create a localModel from a model Id', function (done) {
      localModel = new bigml.LocalModel(modelId);
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
      localModel.predict(firstInput, function (error, data) {
        assert.equal(data.prediction, firstPrediction);
        firstPredictionConfidence = data.confidence;
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predict(firstInput);
      assert.equal(prediction.prediction, firstPrediction);
      assert.equal(prediction.confidence.toFixed(5), firstPredictionConfidence);
    });
  });
  describe('#predict(inputData, constants.PROPORTIONAL)', function () {
    it('should predict synchronously from input data using proportional missing strategy',
       function () {
      var prediction = localModel.predict(firstInput, constants.PROPORTIONAL);
      assert.equal(prediction.prediction, secondPrediction);
      assert.equal(prediction.confidence.toFixed(5), secondPredictionConfidence);
    });
  });
  describe('#predict(inputData, constants.PROPORTIONAL)', function () {
    it('should predict synchronously from input data using proportional missing strategy 1-instance node',
       function () {
      var prediction = localModel.predict(singleInstanceInput, constants.PROPORTIONAL);
      assert.equal(prediction.prediction, thirdPrediction);
      assert.equal(prediction.confidence.toFixed(5), thirdPredictionConfidence);
    });
  });
  describe('#predict(inputData, constants.PROPORTIONAL, true)', function () {
    it('should predict synchronously from input data using proportional missing strategy and median',
       function () {
      var prediction = localModel.predict(firstInput, constants.PROPORTIONAL, true);
      assert.equal(prediction.prediction, medianPrediction);
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
    model.delete(modelId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
