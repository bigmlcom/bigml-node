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

describe(scriptName + ': Manage source objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv';
  var tagsAsList = ['tag1', 'tag2'];
  var tagsAsString = "['tag1', 'tag2']";
  describe('#create(path, args, callback)', function () {
    it('should create a source from a file, stringified tags', function (done) {
      source.create(path, { tags: tagsAsString }, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        sourceId = data.resource;
        done();
      });
    });
  });
  describe('#create(path, args, callback)', function () {
    it('should create a source from a file, array of tags', function (done) {
      source.create(path, { tags: tagsAsList }, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        sourceId = data.resource;
        done();
      });
    });
  });
  describe('#get(source, finished, query, callback)', function () {
    it('should retrieve a finished source', function (done) {
      source.get(sourceId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(source, args, callback)', function () {
    it('should update properties in the source', function (done) {
      var newName = 'my new name';
      source.update(sourceId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        source.get(sourceId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(source, args, callback)', function () {
    it('should delete the remote source', function (done) {
      source.delete(sourceId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
