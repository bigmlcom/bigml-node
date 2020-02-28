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

describe(scriptName + ': Manage ensemble objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    ensembleId, ensemble = new bigml.Ensemble(), modelId,
    model = new bigml.Model(), fusionId, fusion = new bigml.Fusion();

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        ensemble.create(datasetId, {ensemble_sample: {seed: "BigML"}},
          function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          ensembleId = data.resource;
          model.create(datasetId, undefined, function (error, data) {
              assert.equal(data.code, bigml.constants.HTTP_CREATED);
              modelId = data.resource;
              done();
          });
        });
      });
    });
  });

  describe('#create([model, ensemble], args, callback)', function () {
    it('should create a fusion from a list of supervised models', function (done) {
      fusion.create([modelId, ensembleId], undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        fusionId = data.resource;
        done();
      });
    });
  });
  describe('#get(fusion, finished, query, callback)', function () {
    it('should retrieve a finished fusion', function (done) {
      fusion.get(fusionId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(fusion, args, callback)', function () {
    it('should update properties in the fusion', function (done) {
      var newName = 'my new name';
      fusion.update(fusionId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        fusion.get(fusionId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(fusion, callback)', function () {
    it('should delete the remote fusion', function (done) {
      fusion.delete(fusionId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
  describe('#create([{"id": model, "weight": 1}], args, callback)', function () {
    it('should create a fusion from a list of supervised models', function (done) {
      fusion.create([{id: modelId, weight: 1}], undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        fusionId = data.resource;
        done();
      });
    });
  });
  describe('#delete(fusion, callback)', function () {
    it('should delete the remote fusion', function (done) {
      fusion.delete(fusionId, function (error, data) {
        assert.equal(error, null);
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
    ensemble.delete(ensembleId, function (error, data) {
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
