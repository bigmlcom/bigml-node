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
    localModel, firstPredictionConfidence, secondPredictionConfidence,
    proportionalConfidence = 0.84075,
    inputData1 = {'petal length': 0.5},
    inputData2 = {'petal length': 2.5},
    prediction1 = {
      prediction: 'Iris-setosa',
      path: [ 'petal length <= 2.45' ],
      confidence: 0.92865,
      distribution: [ [ 'Iris-setosa', 50 ] ],
      count: 50,
      nextPredicates: [],
      probability: 0.98693 },
    prediction2 = {
      prediction: 'Iris-versicolor',
      path: [ 'petal length > 2.45' ],
      confidence: 0.40383,
      distribution: [ [ 'Iris-versicolor', 50 ], [ 'Iris-virginica', 50 ] ],
      count: 100,
      nextPredicates:
        [ { operator: '>', field: '000003', value: 1.75, count: 46 },
          { operator: '<=', field: '000003', value: 1.75, count: 54 } ],
      probability: 0.49835 }


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
      localModel.predict(inputData1, function (error, data) {
        assert.equal(JSON.stringify(data), JSON.stringify(prediction1));
        done();
      });
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localModel.predict(inputData2, function (error, data) {
        assert.equal(JSON.stringify(data), JSON.stringify(prediction2));
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
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localModel.predict(inputData2, function (error, data) {
        assert.equal(JSON.stringify(data), JSON.stringify(prediction2));
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
