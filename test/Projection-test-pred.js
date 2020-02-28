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


describe(scriptName + ': Manage prediction objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    pcaId, pca = new bigml.PCA(),
    projectionId, projection = new bigml.Projection(),
    inputData = {'petal width': 0.5},
    testProjection = {
        "PC1":0.91648,
        "PC2":0.1593,
        "PC3":-0.01286,
        "PC4":1.29255,
        "PC5":0.75196,
        "PC6":0.27284
    },
    inputDataId = {'000003': 0.5};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        pca.create(datasetId, undefined, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          pcaId = data.resource;
          done();
        });
      });
    });
  });

  describe('#create(model, inputData, args, callback)', function () {
    it('should create a prediction from a pca', function (done) {
      projection.create(pcaId, inputData, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        projectionId = data.resource;
        done();
      });
    });
  });
  describe('#create(pca, inputDataId, args, callback)', function () {
    it('should create a projection from a pca using ids in input data', function (done) {
      projection.create(pcaId, inputDataId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        projectionId = data.resource;
        done();
      });
    });
  });
  describe('#get(projection, finished, query, callback)', function () {
    it('should retrieve a finished projection', function (done) {
      projection.get(projectionId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.equal(JSON.stringify(data.object.projection.result),
                       JSON.stringify(testProjection));
          done();
        }
      });
    });
  });
  describe('#update(projection, args, callback)', function () {
    it('should update properties in the projection', function (done) {
      var newName = 'my new name';
      projection.update(projectionId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        projection.get(projectionId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(projection, callback)', function () {
    it('should delete the remote projection', function (done) {
      projection.delete(projectionId, function (error, data) {
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
    pca.delete(pcaId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
