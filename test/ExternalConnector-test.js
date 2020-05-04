/**
 * Copyright 2020 BigML
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

describe(scriptName + ': Manage external connection objects', function () {
  var externalConnectorId, extConnector = new bigml.ExternalConnector();
  describe('#create(connectionInfo, args, callback)', function () {
    it('should create an external connector using envvars info', function (done) {
      extConnector.create(undefined, {'source': 'postgresql'}, false,
        function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          externalConnectorId = data.resource;
          done();
      });
    });
  });
  describe('#get(externalConnector, finished, query, callback)', function () {
    it('should retrieve a finished external connector', function (done) {
      extConnector.get(externalConnectorId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(externalConnector, args, callback)', function () {
    it('should update properties in the external connector', function (done) {
      var newName = 'my new name';
      extConnector.update(externalConnectorId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        extConnector.get(externalConnectorId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(extConncector, args, callback)', function () {
    it('should delete the remote external connector', function (done) {
      extConnector.delete(externalConnectorId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
