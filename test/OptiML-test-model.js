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
try {
var assert = require('assert'),
  bigml = require('../index'),
  path = require('path');
var scriptName = path.basename(__filename);

describe(scriptName + ': Manage OptiML detector objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/tiny_kdd.csv',
    datasetId, dataset = new bigml.Dataset(),
    optimlId, optiml = new bigml.OptiML();

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        done();
      });
    });
  });

  describe('#create(dataset, args, callback)', function () {
    it('should create an optiml detector from a dataset', function (done) {
      optiml.create(datasetId, {model_types: ["model", "logisticregression"],
        max_training_time: 10, number_of_model_candidates: 5},
        function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        optimlId = data.resource;
        done();
      });
    });
  });
  describe('#get(optiml, finished, query, callback)', function () {
    it('should retrieve a finished optiml detector', function (done) {
      optiml.get(optimlId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(optiml, args, callback)', function () {
    it('should update properties in the optiml', function (done) {
      var newName = 'my new name';
      optiml.update(optimlId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        optiml.get(optimlId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(optiml, callback)', function () {
    it('should delete the remote optiml', function (done) {
      optiml.delete(optimlId, function (error, data) {
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
});} catch(e) {console.log(e);}
