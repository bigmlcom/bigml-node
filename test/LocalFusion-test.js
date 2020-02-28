/**
 * Copyright 2018-2020 BigML
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
try {
describe(scriptName + ': Manage local fusion objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    modelId, model = new bigml.Model(),
    logisticRId, logistic = new bigml.LogisticRegression(),
    ensembleId, ensemble = new bigml.Ensemble(),
    deepnetId, deepnet = new bigml.Deepnet(),
    fusionId, fusion = new bigml.Fusion(), fusionResource,
    ensembleArgs = {missing_splits: false, number_of_models: 2,
                    sample_rate: 0.80, seed: "BigML"},
    prediction = new bigml.Prediction(), inputData = {'petal width': 0.5},
    fusionFinishedResource, index, reference,
    localFusion, len;

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
          model.create(datasetId, undefined, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            modelId = data.resource;
            logistic.create(datasetId, undefined, function (error, data) {
              assert.equal(data.code, bigml.constants.HTTP_CREATED);
              logisticId = data.resource;
              deepnet.create(datasetId, undefined, function (error, data) {
                assert.equal(data.code, bigml.constants.HTTP_CREATED);
                deepnetId = data.resource;
                fusion.create([modelId, ensembleId, logisticId, deepnetId],
                               undefined, function (error, data) {
                  assert.equal(data.code, bigml.constants.HTTP_CREATED);
                  fusionId = data.resource;
                  fusion.get(fusionId, function (error, data) {
                    fusionResource = data;
                    prediction.create(fusionId, inputData, function(error, data) {
                      reference = data.object.output;
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('LocalFusion(fusion)', function () {
    it('should create a localFusion from a fusion Id', function (done) {
      localFusion = new bigml.LocalFusion(fusionId);
      if (localFusion.ready) {
        assert.ok(true);
        done();
      } else {
        localFusion.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, method, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localFusion.predict(inputData,
        function (error, data) {
          assert.equal(data.prediction, reference);
          done();
      });
    });
  });
  describe('#predict(inputData, method)', function () {
    it('should predict synchronously from input data', function () {
      var result = localFusion.predict(inputData);
      assert.equal(result.prediction, reference);
    });
  });
  describe('LocalFusion(fusionResource)', function () {
    it('should create a localFusion from a fusion unfinished resource', function (done) {
      localFusion = new bigml.LocalFusion(fusionResource);
      if (localFusion.ready) {
        assert.ok(true);
        done();
      } else {
        localFusion.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, method, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localFusion.predict(inputData,
        function (error, data) {
          assert.equal(data.prediction, reference);
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
    fusion.delete(fusionId, function (error, data) {
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
  after(function (done) {
    ensemble.delete(ensembleId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    logistic.delete(logisticId, function (error, data) {
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
} catch (e) {
  console.log(e);
}
