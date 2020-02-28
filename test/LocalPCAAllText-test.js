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

describe(scriptName + ': Manage local model objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/spam_tiny.csv',
    datasetId, dataset = new bigml.Dataset(),
    pcaId, pca = new bigml.PCA(), pcaResource, pcaFinishedResource,
    localPCA, inputData1 = {'Message': 'Mobile call'}, projectionResult,
    inputData2 = {'Message': 'Ok every'}, projection = new bigml.Projection();

  before(function (done) {
    var tokenMode = {'fields': {'000001': {'term_analysis': {'token_mode': 'all'}}}},
      textField = {'fields': {'000001': {'optype': 'text'}}};
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.get(sourceId, true, function (error, data) {
        source.update(sourceId, textField, function (error, data) {
          dataset.create(sourceId, tokenMode, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            datasetId = data.resource;
            pca.create(datasetId, undefined, function (error, data) {
              assert.equal(data.code, bigml.constants.HTTP_CREATED);
              pcaId = data.resource;
              pcaResource = data;
              pca.get(pcaResource, true, undefined, function (error, data) {
                pcaFinishedResource = data;
                projection.create(pcaId, inputData2, function (error, data2) {
                  projectionResult = data2.object.projection.result;
                  projection.delete(data2.resource, function (error, data3) {});
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  describe('LocalPCA(pcaId)', function () {
    it('should create a localPCA from a PCA Id', function (done) {
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
  describe('#projection(inputData, callback)', function (done) {
    it('should create a projection asynchronously from input data ', function (done) {
      localPCA.projection(inputData1, function (error, data) {
        projection.create(pcaId, inputData1, function (error, data2) {
          jsonEqual(data, data2.object.projection.result);
          projection.delete(data2.resource, function (error, data3) {
            done();
          });
        });
      });
    });
  });
  describe('#projection(inputData)', function () {
    it('should create a projection synchronously from input data ', function () {
      var localProjection = localPCA.projection(inputData2);
      jsonEqual(localProjection, projectionResult);
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
