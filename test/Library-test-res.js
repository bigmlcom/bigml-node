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

describe(scriptName + ': Manage whizzml library objects', function () {
  var libraryId, library = new bigml.Library(),
  sourceCode = '(define (mu x) (+ x 1))';
  describe('#create(sourceCode, args, callback)', function () {
    it('should create a library from a excerpt of code', function (done) {
      library.create(sourceCode, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        libraryId = data.resource;
        done();
      });
    });
  });
  describe('#get(library, finished, query, callback)', function () {
    it('should retrieve a finished library', function (done) {
      library.get(libraryId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(library, args, callback)', function () {
    it('should update properties in the library', function (done) {
      var newName = 'my new name';
      library.update(libraryId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        library.get(libraryId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(library, args, callback)', function () {
    it('should delete the remote library', function (done) {
      library.delete(libraryId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
