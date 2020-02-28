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
  var sourceId, source = new bigml.Source(), path = './data/grades.csv',
    datasetId, dataset = new bigml.Dataset(),
    modelRId1, model1 = new bigml.Model(),
    modelRId2, model2 = new bigml.Model(),
    modelRId3, model3 = new bigml.Model(),
    fusionId, fusion = new bigml.Fusion(), fusionResource,
    modelArgs = {sample_rate: 0.80, seed: "bigml"},
    prediction = new bigml.Prediction(), inputData = {'Midterm': 20},
    fusionFinishedResource, index, reference,
    localFusion, len;

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        model1.create(datasetId, modelArgs, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          modelRId1 = data.resource;
          model2.create(datasetId, undefined, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            modelRId2 = data.resource;
            model3.create(datasetId, undefined, function (error, data) {
              assert.equal(data.code, bigml.constants.HTTP_CREATED);
              modelRId3 = data.resource;
                fusion.create([modelRId1, modelRId2, modelRId3],
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
    model1.delete(modelRId1, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    model2.delete(modelRId2, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    model3.delete(modelRId3, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
} catch (e) {
  console.log(e);
}
