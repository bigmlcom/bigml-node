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
  util = require('util');
  path = require('path');
var scriptName = path.basename(__filename);

describe(scriptName + ': Manage local ensemble objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    ensembleId, ensemble = new bigml.Ensemble(), ensembleResource,
    ensembleArgs = {missing_splits: false, number_of_models: 2,
                    sample_rate: 0.80, seed: "BigML",
                    ensemble_sample: {rate: 0.8,
                                      replacement: true,
                                      seed: "BigML"}},
    prediction = new bigml.Prediction(), inputData = {},
    method = undefined, ensembleFinishedResource, modelsList, index,
    model = new bigml.Model(), reference,
    localEnsemble, len, finishedModelsList = [], missingStrategy = 1,
    operatingKind1 = "confidence",
    operatingKind2 = "probability",
    operatingKind3 = "votes",
    prediction1 = 'Iris-virginica',
    prediction2 = 'Iris-virginica',
    prediction3 = 'Iris-setosa';

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        ensemble.create(datasetId, ensembleArgs, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          ensembleId = data.resource;
          ensembleResource = data;
          ensemble.get(ensembleResource, true, undefined, function (error, data) {
            ensembleFinishedResource = data;
            modelsList = data.object.models;
            len = modelsList.length;
            function retrievePrediction(error, data) {
              prediction.get(data, true, function (error, data) {
                reference = data.object.output;
                assert.equal(reference, prediction1);
                done();
              });
            }
            function retrieveModel(error, data) {
              finishedModelsList.push(data);
              if (finishedModelsList.length === len) {
                prediction.create(ensembleId, inputData,
                                  {'operating_kind': operatingKind1,
                                   'missing_strategy': missingStrategy},
                                  retrievePrediction);
              }
            }
            for (index = 0; index < len; index++) {
              model.get(modelsList[index], true, 'only_model=true', retrieveModel);
            }
          });
        });
      });
    });
  });

  describe('LocalEnsemble(ensemble)', function () {
    it('should create a localEnsemble from an ensemble Id', function (done) {
      localEnsemble = new bigml.LocalEnsemble(ensembleId);
      if (localEnsemble.ready) {
        assert.ok(true);
        done();
      } else {
        localEnsemble.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, method, {operatingKind: kind}, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localEnsemble.predict(inputData, method,
                            {missingStrategy: missingStrategy,
                             operatingKind: operatingKind1},
        function (error, data) {
          assert.equal(data.prediction, prediction1);
          done();
      });
    });
  });
  describe('#predict(inputData, method, {operatingKind: kind})', function () {
    it('should predict synchronously from input data', function () {
      var result = localEnsemble.predict(inputData, method,
        {missingStrategy: missingStrategy,
         operatingKind: operatingKind1});
      assert.equal(result.prediction, prediction1);
    });
  });
  describe('#predict(inputData, method, {operatingKind: kind}, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localEnsemble.predict(inputData, method,
                            {missingStrategy: missingStrategy,
                             operatingKind: operatingKind2},
        function (error, data) {
          assert.equal(data.prediction, prediction2);
          done();
      });
    });
  });
  describe('#predict(inputData, method, {operatingKind: kind})', function () {
    it('should predict synchronously from input data', function () {
      var result = localEnsemble.predict(inputData, method,
        {missingStrategy: missingStrategy,
         operatingKind: operatingKind2});
      assert.equal(result.prediction, prediction2);
    });
  })
  describe('#predict(inputData, method, {operatingKind: kind})', function () {
    it('should predict synchronously from input data', function () {
      var result = localEnsemble.predict(inputData, method,
        {missingStrategy: missingStrategy,
         operatingKind: operatingKind3});
      assert.equal(result.prediction, prediction3);
    });
  })
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
  /*
  after(function (done) {
    ensemble.delete(ensembleId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  */

});
