/**
 * Copyright 2017-2021 BigML
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

describe(scriptName + ': Create inline source objects', function () {
  var sourceId, source = new bigml.Source(),
    path = [{"id": 1, "text": "a"}, {"id": 2, "text": "b"}];
  describe('#create(path, args, callback)', function () {
    it('should create a source from inline data',
     function (done) {
      source.create(path, {}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        sourceId = data.resource;
        done();
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
