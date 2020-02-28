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
describe(scriptName + ': Manage PCA objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(), datasetId2,
    dataset2 = new bigml.Dataset(),
    pcaId, pca = new bigml.PCA(), pcaId2,
    pca2 = new bigml.PCA();


  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        dataset2.create(sourceId, undefined, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          datasetId2 = data.resource;
          done();
        });
      });
    });
  });

  describe('#create(dataset, args, callback)', function () {
    it('should create a PCA from a dataset', function (done) {
      pca.create(datasetId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        pcaId = data.resource;
        done();
      });
    });
  });
  describe('#get(pca, finished, query, callback)', function () {
    it('should retrieve a finished PCA', function (done) {
      pca.get(pcaId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(pca, args, callback)', function () {
    it('should update properties in the pca', function (done) {
      var newName = 'my new name';
      pca.update(pcaId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        pca.get(pcaId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#create([dataset], args, callback)', function () {
    it('should create a PCA from a list of datasets ',
      function (done) {
        pca2.create([datasetId, datasetId2], undefined,
                    function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        pcaId2 = data.resource;
        done();
      });
    });
  });

  describe('#delete(pca, callback)', function () {
    it('should delete the remote pca', function (done) {
      pca.delete(pcaId, function (error, data) {
        assert.equal(error, null);
        pca2.delete(pcaId2, function (error, data) {
          assert.equal(error, null);
          done();
        });
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
      dataset2.delete(datasetId2, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
} catch (e) {console.log(e);}
