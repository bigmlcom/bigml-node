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
  var sourceId, source = new bigml.Source(), path = './data/spam.csv',
    datasetId, dataset = new bigml.Dataset(),
    args = {"objective_field": "000000"},
    deepnetId, deepnet = new bigml.Deepnet(),
    deepnetResource, deepnetFinishedResource,
    localDeepnet, firstPredictionProbability,
    inputData1 = {"Message": "Mobile phone"},
    prediction = new bigml.Prediction(),
    prediction1 = JSON.parse('{"prediction":"ham","probability":0.93524,"distribution":[{"category":"ham","probability":0.93524},{"category":"spam","probability":0.06476}]}');

  before(function (done) {
    var tokenMode = {'fields': {'000001': {'term_analysis': {'token_mode': 'all'}}}},
      textField = {'fields': {'000001': {'optype': 'text'}}};
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.get(sourceId, true, function (error, data) {
        source.update(sourceId, textField, function (error, data) {
          dataset.create(sourceId, undefined, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            datasetId = data.resource;
            deepnet.create(datasetId, args, function (error, data) {
              assert.equal(data.code, bigml.constants.HTTP_CREATED);
              deepnetId = data.resource;
              deepnetResource = data;
              deepnet.get(deepnetResource, true, 'only_model=true', function (error, data) {
                deepnetFinishedResource = data;
                prediction.create(deepnetFinishedResource, inputData1, function(error, data) {
                  remotePrediction1 = data;
                  assert.equal(remotePrediction1.object.output, prediction1.prediction);
                  assert.equal(remotePrediction1.object.probability, prediction1.probability);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  describe('LocalDeepnet(deepnetId)', function () {
    it('should create a localDeepnet from a deepnet Id', function (done) {
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
      localDeepnet.predict(inputData1, 0, function (error, data) {
        assert.equal(data.prediction, prediction1.prediction);
        firstPredictionProbability = data.probability;
        done();
      });
    });
  });
  describe('LocalDeepnet(deepnetResource)', function () {
    it('should create a localDeepnet from a deepnet unfinished resource', function (done) {
      localDeepnet = new bigml.LocalDeepnet(deepnetResource);
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
      localDeepnet.predict(inputData1, function (error, data) {
        assert.equal(JSON.stringify(data), JSON.stringify(prediction1));
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
    deepnet.delete(deepnetId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
