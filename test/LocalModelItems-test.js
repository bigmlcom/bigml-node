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
  var sourceId, source = new bigml.Source(), path = './data/movies.csv',
    datasetId, dataset = new bigml.Dataset(),
    modelId, model = new bigml.Model(), prediction = new bigml.Prediction(),
    modelResource, modelFinishedResource,
    localModel,
    inputData1 = {"gender": "Female", "genres": "Adventure$Action",
                  "timestamp": 993906291, "occupation": "K-12 student",
                  "zipcode": 59583, "rating": 3};

  before(function (done) {
    var itemsField = {
      'fields': {'000007': {
        'optype': 'items', 'item_analysis': {'separator': '$'}}}};
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.get(sourceId, true, function (error, data) {
        source.update(sourceId, itemsField, function (error, data) {
          dataset.create(sourceId, undefined, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            datasetId = data.resource;
            model.create(datasetId, {'objective_field': '000002'},
              function (error, data) {
              assert.equal(data.code, bigml.constants.HTTP_CREATED);
              modelId = data.resource;
              modelResource = data;
              model.get(modelResource, true, 'only_model=true', function (error, data) {
                modelFinishedResource = data;
                prediction.create(modelId, inputData1, function (error, data) {
                  predictionOutput = data['object'];
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
      localModel.predict(inputData1, function (error, data) {
        assert.equal(data.prediction, predictionOutput['output']);
        assert.equal(data.confidence, predictionOutput['confidence']);
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
