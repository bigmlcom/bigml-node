/**
 * Copyright 2017 BigML
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
  bigml = require('../index');

describe('Connect with a BigML object', function(){
  var connection = new bigml.BigML(),
    reqOptions = {
      method: 'GET',
      resourceType: 'source',
      endpoint: '',
      query: undefined,
      headers: bigml.constants.ACCEPT_JSON
    };
  describe('#request(options, callback)', function () {
    it('should connect without error with user\'s credentials', function (done) {
      connection.request(reqOptions, function (error, data, response) {
        assert.equal(error, null);
        done();
      });
    });
    it('should not connect with false credentials', function (done) {
      connection = new bigml.BigML('foo', 'bar');
      connection.request(reqOptions, function (error, data, response) {
        assert.equal(data.code, bigml.constants.HTTP_UNAUTHORIZED);
        done();
      });
    });
  });
});
