/**
 * Copyright 2018 BigML
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

function jsonEqual(a, b) {
  assert.equal(JSON.stringify(a), JSON.stringify(b));
}

describe(scriptName + ': Manage local PCA objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    pcaId, pca = new bigml.PCA(), pcaResource, pcaFinishedResource,
    localPCA,
    inputData1 = {'species': 'Iris-versicolor'},
    inputData2 = {'petal length': 1},
    inputDataId1 = {'000004': 'Iris-versicolor'},
    inputDataId2 = {'000002': 1},
    projection1 = {
      PC1: -1.2033563979505828,
      PC2: 2.159142364135116,
      PC3: -1.547341364180193,
      PC4: -0.9609793323190531,
      PC5: 0.07090847599313028,
      PC6: -0.08232799297844741 },
    projection2 = {
      PC1: 3.0731408872030146,
      PC2: 0.10108614810462188,
      PC3: 0.1612293693124448,
      PC4: 0.28663062094189423,
      PC5: -0.16476904318225724,
      PC6: -0.16520366449476293 }



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
          pcaResource = data;
          pca.get(pcaResource, true, undefined, function (error, data) {
            pcaFinishedResource = data;
            done();
          });
        });
      });
    });
  });

  describe('LocalPCA(pcaId)', function () {
    it('should create a localPCA from a pca Id', function (done) {
      localPCA = new bigml.LocalPCA(pcaId);
      if (localPCA.ready) {
        assert.ok(true);
        done();
      } else {
        localPCA.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#projection(inputData, callback)', function () {
    it('should create projection from input data asynchronously', function (done) {
      localPCA.projection(inputData1, function (error, data) {
        jsonEqual(data, projection1);
        done();
      });
    });
  });
  describe('#projection(inputData)', function () {
    it('should projection synchronously from input data', function () {
      var projection = localPCA.projection(inputData1);
      jsonEqual(projection, projection1);
    });
  });
  describe('#projection(inputData, callback)', function () {
    it('should create projection asynchronously from input data keyed by field id',
       function (done) {
         localPCA.projection(inputDataId1, function (error, data) {
           jsonEqual(data, projection1);
           done();
        });
    });
  });
  describe('#projection(inputData)', function () {
    it('should create projection synchronously from input data keyed by field id',
       function () {
         var projection = localPCA.projection(inputDataId2);
         jsonEqual(projection, projection2);
    });
  });
  describe('LocalPCA(pcaResource)', function () {
    it('should create a localPCA from a PCA unfinished resource', function (done) {
      localPCA = new bigml.LocalPCA(pcaResource);
      if (localPCA.ready) {
        assert.ok(true);
        done();
      } else {
        localPCA.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#projection(inputData, callback)', function () {
    it('should create projection asynchronously from input data', function (done) {
      localPCA.projection(inputData1, function (error, data) {
        jsonEqual(data, projection1);
        done();
      });
    });
  });
  describe('#projection(inputData, callback)', function () {
    it('should projection asynchronously from input data', function (done) {
      localPCA.projection(inputData2, function (error, data) {
        jsonEqual(data, projection2);
        done();
      });
    });
  });
  describe('LocalPCA(pcaFinishedResource)', function () {
    it('should create a localPCA from a PCA finished resource', function () {
      localPCA = new bigml.LocalPCA(pcaFinishedResource);
      assert.ok(localPCA.ready);
    });
  });
  describe('#projection(inputData, callback)', function () {
    it('should projection asynchronously from input data', function (done) {
      localPCA.projection(inputData2, function (error, data) {
        jsonEqual(data, projection2);
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
