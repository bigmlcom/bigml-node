/**
 * Copyright 2017-2020 BigML
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

describe(scriptName + ': Manage TopicModel objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/movies.csv',
    datasetId, dataset = new bigml.Dataset(), datasetId2,
    dataset2 = new bigml.Dataset(),
    topicModelId, topicModel = new bigml.TopicModel(), topicModelId2,
    topicModel2 = new bigml.TopicModel(),
    seed = "BigML tests",
    fields = {'000000': {'name': 'user_id', 'optype': 'numeric'},
              '000001': {'name': 'gender', 'optype': 'categorical'},
              '000002': {'name': 'age_range', 'optype': 'categorical'},
              '000003': {'name': 'occupation', 'optype': 'categorical'},
              '000004': {'name': 'zipcode', 'optype': 'numeric'},
              '000005': {'name': 'movie_id', 'optype': 'numeric'},
              '000006': {'name': 'title', 'optype': 'text'},
              '000007': {'name': 'genres', 'optype': 'items',
                         'item_analysis': {'separator': "$"}},
              '000008': {'name': 'timestamp', 'optype': 'numeric'},
              '000009': {'name': 'rating', 'optype': 'categorical'}},
    separator = ";",
    topicModelArgs = {seed: seed, topicmodel_seed: seed};

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.update(sourceId, {"fields": fields,
                               "source_parser": {"separator": separator}},
        function (error, data) {
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
  });

  describe('#create(dataset, args, callback)', function () {
    it('should create a TopicModel from a dataset', function (done) {
      topicModel.create(datasetId, topicModelArgs, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        topicModelId = data.resource;
        done();
      });
    });
  });
  describe('#get(topicModel, finished, query, callback)', function () {
    it('should retrieve a finished TopicModel', function (done) {
      topicModel.get(topicModelId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(topicModel, args, callback)', function () {
    it('should update properties in the topicModel', function (done) {
      var newName = 'my new name';
      topicModel.update(topicModelId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        topicModel.get(topicModelId, true, function (errorcb, datacb) {
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
    it('should create a TopicModel from a list of datasets ', function (done) {
      topicModel2.create([datasetId, datasetId2], topicModelArgs,
                  function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        topicModelId2 = data.resource;
        done();
      });
    });
  });
  describe('#delete(topicModel, callback)', function () {
    it('should delete the remote topicModel', function (done) {
      topicModel.delete(topicModelId, function (error, data) {
        assert.equal(error, null);
        topicModel2.delete(topicModelId2, function (error, data) {
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
