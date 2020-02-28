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
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    missingSplits = {"missing_splits": false},
    modelId, model = new bigml.Model(), modelResource, modelFinishedResource,
    localModel, firstPredictionConfidence,
    inputData1 = {'petal length': 0.5},
    operatingKind1 = "confidence",
    operatingKind2 = "probability",
    prediction1 = 'Iris-setosa',
    confidence = 0.92865,
    probability = 0.98693;


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
          model.get(modelResource, true, 'only_model=true', function (error, data) {
            modelFinishedResource = data;
            done();
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
  describe('#predict(inputData, operatingKind,callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localModel.predict(inputData1, 0, undefined, undefined, undefined,
                         operatingKind1,
        function (error, data) {
        assert.equal(data.prediction, prediction1);
        assert.equal(data.confidence, confidence);
        done();
      });
    });
  });
  describe('#predict(inputData, operatingKind)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predict(inputData1, 0, false, false,
                                          undefined,
                                          operatingKind1);
      assert.equal(prediction.prediction, prediction1);
      assert.equal(prediction.confidence, confidence);
    });
  });
  describe('#predict(inputData,operatingKind, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localModel.predict(inputData1, 0, false, false, undefined, operatingKind2,
        function (error, data) {
        assert.equal(data.prediction, prediction1);
        assert.equal(data.probability, probability);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predict(inputData1, 0, false, false,
                                          undefined,
                                          operatingKind2);
      assert.equal(prediction.prediction, prediction1);
      assert.equal(prediction.probability, probability);
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
