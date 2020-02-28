/**
 * Copyright 2019-2020 BigML
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
  var sourceId, source = new bigml.Source(), path = './data/diabetes_unbalanced.csv',
    datasetId, dataset = new bigml.Dataset(),
    logisticRId1, logistic1 = new bigml.LogisticRegression(),
    logisticRId2, logistic2 = new bigml.LogisticRegression(),
    logisticRId3, logistic3 = new bigml.LogisticRegression(),
    fusionId, fusion = new bigml.Fusion(), fusionResource,
    logisticArgs = {sample_rate: 0.80, balance_objective: true},
    prediction = new bigml.Prediction(), inputData = {'plasma glucose': 145},
    fusionFinishedResource, index, reference,
    localFusion, len;

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        logistic1.create(datasetId, logisticArgs, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          logisticRId1 = data.resource;
          logistic2.create(datasetId, undefined, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            logisticRId2 = data.resource;
            logistic3.create(datasetId, undefined, function (error, data) {
              assert.equal(data.code, bigml.constants.HTTP_CREATED);
              logisticRId3 = data.resource;
                fusion.create([logisticRId1, logisticRId2, logisticRId3],
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
    logistic1.delete(logisticRId1, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    logistic2.delete(logisticRId2, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    logistic3.delete(logisticRId3, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
} catch (e) {
  console.log(e);
}
