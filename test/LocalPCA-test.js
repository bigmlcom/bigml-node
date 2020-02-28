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
  constants = require('../lib/constants'),
  path = require('path');
var scriptName = path.basename(__filename);


function jsonEqual(a, b) {
  assert.equal(Object.keys(a).length, Object.keys(b).length);
  for (key in a) {
    if (a.hasOwnProperty(key)) {
      a[key] = Math.round(a[key] * 100000, 5) /100000.0;
      b[key] = Math.round(b[key] * 100000, 5) /100000.0;
      assert.equal(a[key], b[key], "Mismatch in key " + key + ": "
        + a[key] + ", " + b[key]);
    }
  }
}

describe(scriptName + ': Manage local PCA objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    projection = new bigml.Projection(), projectionRemote1,
    pcaId, pca = new bigml.PCA(), pcaResource, pcaFinishedResource,
    localPCA, projectionId,
    inputData1 = {'species': 'Iris-versicolor'},
    inputData2 = {'petal length': 1},
    inputDataId1 = {'000004': 'Iris-versicolor'},
    inputDataId2 = {'000002': 1},
    projection1 = {
      PC1: -0.611163519495484,
      PC2: 1.8601984603787987,
      PC3: -2.0086444976166247,
      PC4: -2.446175191831889,
      PC5: 0.4341354957946381,
      PC6: -0.6698283452388474 },
    projection2 = {
      PC1: 1.5608361320468902,
      PC2: 0.08708275165829191,
      PC3: 0.2092936861794336,
      PC4: 0.729496876659828,
      PC5: -1.0087611428279308,
      PC6: -1.3446331970093408}



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
            projection.create(pcaId, inputData1, function (error, data){
              projectionRemote1 = data.object.projection.result;
              projectionId = data.resource;
              jsonEqual(projection1, projectionRemote1);
              done();
            });
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
  after(function (done) {
    projection.delete(projectionId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });

});
