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

function truncate(value, digits) {
  return Math.round(value * Math.pow(10, digits), digits) / Math.pow(10.0, digits);
}

describe(scriptName + ': Manage local model objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    missingSplits = {"missing_splits": false},
    modelId, model = new bigml.Model(), modelResource, modelFinishedResource,
    localModel, remotePred1, remotePred2,
    predictionRes = new bigml.Prediction(),
    inputData1 = {'petal length': 0.5},
    inputData2 = {'petal length': 2.5},
    prediction1 = [ { category: 'Iris-setosa', probability: 0.98693 },
  { category: 'Iris-versicolor',
    probability: 0.00654 },
  { category: 'Iris-virginica',
    probability: 0.00654 } ],
    prediction2 = [ { category: 'Iris-setosa', probability: 0.0033 },
  { category: 'Iris-versicolor',
    probability: 0.49835 },
  { category: 'Iris-virginica',
    probability: 0.49835 } ];


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
            predictionRes.create(modelId, inputData1, function (error, data) {
              var probabilities = [], index, len = data.object.probabilities.length,
                probabilities2 = [];
              for (index = 0;  index < len; index++) {
                probabilities.push({"category": data.object.probabilities[index][0],
                                    "probability": data.object.probabilities[index][1]});
              };
              for (index = 0;  index < len; index++) {
                probabilities2.push({"category": prediction1[index].category,
                                     "probability": truncate(prediction1[index].probability, 5)});
              };
              assert.equal(JSON.stringify(probabilities), JSON.stringify(probabilities2));
              predictionRes.delete(data.resource, function (e, d) {});
              predictionRes.create(modelId, inputData2, function (error, data) {
                var probabilities = [], index, len = data.object.probabilities.length,
                  probabilities2 = [];
                for (index = 0;  index < len; index++) {
                  probabilities.push({"category": data.object.probabilities[index][0],
                                      "probability": data.object.probabilities[index][1]});
                };
                for (index = 0;  index < len; index++) {
                  probabilities2.push({"category": prediction2[index].category,
                                       "probability": truncate(prediction2[index].probability, 5)});
                };
                assert.equal(JSON.stringify(probabilities), JSON.stringify(probabilities2));
                predictionRes.delete(data.resource, function (e, d) {});
                done();
              })
            })
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
      localModel.predictProbability(inputData1, 0, function (error, data) {
        assert.equal(JSON.stringify(data), JSON.stringify(prediction1));
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predictProbability(inputData1);
      assert.equal(JSON.stringify(prediction), JSON.stringify(prediction1));
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localModel.predictProbability(inputData2, 0, function (error, data) {
        assert.equal(JSON.stringify(data), JSON.stringify(prediction2));
        done();
      });
    });
  });
  describe('#predict(inputData)', function () {
    it('should predict synchronously from input data', function () {
      var prediction = localModel.predictProbability(inputData2);
      assert.equal(JSON.stringify(prediction), JSON.stringify(prediction2));
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
