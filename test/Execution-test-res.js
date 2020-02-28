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

describe(scriptName + ': Manage execution objects', function () {
  var scriptId, script = new bigml.Script(), sourceCode = '(+ 1 1)',
    scriptId2, script2 = new bigml.Script(),
    executionId, execution = new bigml.Execution();

  before(function (done) {
    script.create(sourceCode, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      scriptId = data.resource;
      script2.create(sourceCode, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        scriptId2 = data.resource;
        done();
      });
    });
  });

  describe('#create(script, args, callback)', function () {
    it('should create a execution from a script', function (done) {
      execution.create(scriptId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        executionId = data.resource;
        done();
      });
    });
  });
  describe('#get(execution, finished, query, callback)', function () {
    it('should retrieve a finished execution', function (done) {
      execution.get(executionId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(execution, args, callback)', function () {
    it('should update properties in the execution', function (done) {
      var newName = 'my new name';
      execution.update(executionId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        execution.get(executionId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(execution, callback)', function () {
    it('should delete the remote execution', function (done) {
      execution.delete(executionId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });

  describe('#create(scripts, args, callback)', function () {
    it('should create a execution from a list of scripts', function (done) {
      execution.create([scriptId, scriptId2], undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        executionId = data.resource;
        done();
      });
    });
  });
  describe('#get(execution, finished, query, callback)', function () {
    it('should retrieve a finished execution', function (done) {
      execution.get(executionId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(execution, args, callback)', function () {
    it('should update properties in the execution', function (done) {
      var newName = 'my new name';
      execution.update(executionId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        execution.get(executionId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(execution, callback)', function () {
    it('should delete the remote execution', function (done) {
      execution.delete(executionId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });

  after(function (done) {
    script.delete(scriptId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    script2.delete(scriptId2, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
