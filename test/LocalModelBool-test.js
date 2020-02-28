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
  var sourceId, source = new bigml.Source(),
    path = './data/diabetes_unbalanced.csv',
    datasetId, dataset = new bigml.Dataset(),
    modelId, model = new bigml.Model(), modelResource, modelFinishedResource,
    localModel,
    inputData1 = {'diabetes': false},
    inputData2 = {'diabetes': true},
    prediction1 = {
      prediction: 30.77059,
      path: [ 'diabetes = false' ],
      confidence: 10.99099,
      distribution:
       [ [ 0, 3 ],
         [ 19.63333, 3 ],
         [ 22.46667, 3 ],
         [ 23.15714, 7 ],
         [ 24.24286, 7 ],
         [ 25.12222, 9 ],
         [ 26.4, 6 ],
         [ 27.3, 3 ],
         [ 27.85, 4 ],
         [ 28.44, 5 ],
         [ 29.05, 4 ],
         [ 29.78, 5 ],
         [ 30.96667, 3 ],
         [ 32, 3 ],
         [ 32.675, 4 ],
         [ 33.2, 2 ],
         [ 33.93333, 6 ],
         [ 34.52, 5 ],
         [ 35.3875, 8 ],
         [ 36, 3 ],
         [ 36.7, 2 ],
         [ 37.6, 3 ],
         [ 38.3, 2 ],
         [ 39.18571, 7 ],
         [ 39.8, 1 ],
         [ 40.43333, 3 ],
         [ 41.5, 1 ],
         [ 42.7, 1 ],
         [ 43.3, 1 ],
         [ 44.55, 2 ],
         [ 46.55, 2 ],
         [ 57.3, 1 ] ],
      count: 119,
      nextPredicates: [] },
    prediction2 = {
      prediction: 30.41538,
      path: [ 'diabetes = true' ],
      confidence: 24.47391,
      distribution:
       [ [ 0, 1 ],
         [ 23.3, 1 ],
         [ 25.8, 1 ],
         [ 29.6, 1 ],
         [ 30, 1 ],
         [ 30.1, 1 ],
         [ 30.5, 1 ],
         [ 31, 1 ],
         [ 33.6, 1 ],
         [ 34.6, 1 ],
         [ 38, 1 ],
         [ 43.1, 1 ],
         [ 45.8, 1 ] ],
      count: 13,
      nextPredicates: [] }



  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        model.create(datasetId, {"objective_field": "bmi",
                                 "input_fields": ["000008"]},
          function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          modelId = data.resource;
          modelResource = data;
          model.get(modelResource, true, 'only_model=true',
            function (error, data) {
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
      localModel.predict(inputData1, 0, function (error, data) {
        assert.equal(data.prediction, prediction1.prediction);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predict(inputData1);
      assert.equal(prediction.prediction, prediction1.prediction);
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localModel.predict(inputData2, 0, function (error, data) {
        assert.equal(data.prediction, prediction2.prediction);
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predict(inputData2);
      assert.equal(prediction.prediction, prediction2.prediction);
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
