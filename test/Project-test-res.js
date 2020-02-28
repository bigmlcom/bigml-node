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

describe(scriptName + ': Manage project objects', function () {
  var projectId, project = new bigml.Project();
  describe('#create(args, callback)', function () {
    it('should create a project', function (done) {
      project.create({name:'my project'}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        projectId = data.resource;
        done();
      });
    });
  });
  describe('#get(project, finished, query, callback)', function () {
    it('should retrieve a finished project', function (done) {
      project.get(projectId, true, function (error, data) {
        if (data.resource === projectId) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(project, args, callback)', function () {
    it('should update properties in the project', function (done) {
      var newName = 'my new project name';
      project.update(projectId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        project.get(projectId, true, function (errorcb, datacb) {
          if (datacb.resource === projectId &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(project, args, callback)', function () {
    it('should delete the remote project', function (done) {
      project.delete(projectId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
