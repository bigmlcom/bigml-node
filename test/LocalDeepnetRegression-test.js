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
  constants = require('../lib/constants'),
  path = require('path');
var scriptName = path.basename(__filename);

describe(scriptName + ': Manage local deepnet objects', function () {
  var deepnetFile = "data/test_deepnet.json",
    inputData1 = {},
    prediction1 = 60.672057908744364;

  describe('LocalDeepnet(deepnetId)', function () {
    it('should create a localDeepnet from a deepnet Id', function (done) {
      localDeepnet = new bigml.LocalDeepnet(deepnetFile);
      if (localDeepnet.ready) {
        assert.ok(true);
        done();
      } else {
        localDeepnet.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localDeepnet.predict(inputData1, 0, function (error, data) {
        assert.equal(data.prediction, prediction1);
        done();
      });
    });
  });
});
