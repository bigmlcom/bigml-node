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

describe(scriptName + ': Manage whizzml script objects', function () {
  var scriptId, script = new bigml.Script(), sourceCode = '(+ 1 1)';
  var tagsAsList = ['tag1', 'tag2'];
  describe('#create(sourceCode, args, callback)', function () {
    it('should create a script from a excerpt of code, array of tags',
       function (done) {
         script.create(sourceCode, { tags: tagsAsList }, function (error, data) {
           assert.equal(data.code, bigml.constants.HTTP_CREATED);
           scriptId = data.resource;
           done();
         });
    });
  });
  describe('#get(script, finished, query, callback)', function () {
    it('should retrieve a finished script', function (done) {
      script.get(scriptId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(script, args, callback)', function () {
    it('should update properties in the script', function (done) {
      var newName = 'my new name';
      script.update(scriptId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        script.get(scriptId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(script, args, callback)', function () {
    it('should delete the remote script', function (done) {
      script.delete(scriptId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
