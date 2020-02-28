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
  path = require('path');
var scriptName = path.basename(__filename);

describe(scriptName + ': Manage local model objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/spam.csv',
    datasetId, dataset = new bigml.Dataset(),
    modelId, model = new bigml.Model(), modelResource, modelFinishedResource,
    localModel, firstPredictionConfidence, secondPredictionConfidence;

  before(function (done) {
    var textField = {'fields': {'000001': {'optype': 'text'}}};
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.get(sourceId, true, function (error, data) {
        source.update(sourceId, textField, function (error, data) {
          dataset.create(sourceId, undefined, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            datasetId = data.resource;
            model.create(datasetId, undefined, function (error, data) {
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
      localModel.predict({'Message': 'mobile Mobile call'}, function (error, data) {
        assert.equal(data.prediction, 'spam');
        firstPredictionConfidence = data.confidence;
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predict({'Message': 'A normal message'});
      assert.equal(prediction.prediction, 'ham');
      secondPredictionConfidence = prediction.confidence;
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data keyed by field id',
       function (done) {
      localModel.predict({'000001': 'mobile Mobile call'}, function (error, data) {
        assert.equal(data.prediction, 'spam');
        assert.equal(data.confidence, firstPredictionConfidence);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data keyed by field id',
       function () {
      var prediction = localModel.predict({'000001': 'A normal message'});
      assert.equal(prediction.prediction, 'ham');
      assert.equal(prediction.confidence, secondPredictionConfidence);
    });
  });
  describe('LocalModel(modelResource)', function () {
    it('should create a localModel from a model unfinished resource', function (done) {
      localModel = new bigml.LocalModel(modelResource);
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
      localModel.predict({'Message': 'A normal message'}, function (error, data) {
        assert.equal(data.prediction, 'ham');
        done();
      });
    });
  });
  describe('LocalModel(modelFinishedResource)', function () {
    it('should create a localModel from a model finished resource', function () {
      localModel = new bigml.LocalModel(modelFinishedResource);
      assert.ok(localModel.ready);
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function (done) {
      localModel.predict({'Message': 'A normal message'}, function (error, data) {
        assert.equal(data.prediction, 'ham');
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
    model.delete(modelId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
