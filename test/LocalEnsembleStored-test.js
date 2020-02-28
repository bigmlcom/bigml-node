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

describe(scriptName + ': Manage local ensemble objects', function () {
  var inputData = {"000002": 3, "000005": 3407, "000007": 1958,
                   "00000b": 601875, "00000c": 44.63, "00000d": -64338.6},
    modelsList = ["model/5a8c5fec8a318f490a00400c",
                  "model/5a8c5fec8a318f490a00400e",
                  "model/5a8c5feb8a318f490a004008"],
    index,
    ensembleId = "ensemble/5a8c5fe792fb5601d20003b1",
    reference = '{"prediction":97330,"confidence":0.368635}',
    reference2 = '{"prediction":97330,"confidence":1.68006}',
    localEnsemble, len, missingStrategy = 1;

  describe('LocalEnsemble(ensemble)', function () {
    it('should create a localEnsemble from a list of stored models', function (done) {
      localEnsemble = new bigml.LocalEnsemble(
        modelsList,
        new bigml.BigML(undefined, undefined, {storage: "data/storage"}));
      if (localEnsemble.ready) {
        assert.ok(true);
        done();
      } else {
        localEnsemble.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, method, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localEnsemble.predict(inputData, undefined, {missingStrategy: missingStrategy},
        function (error, data) {
          assert.equal(JSON.stringify(data), reference);
          done();
      });
    });
  });
  describe('#predict(inputData, method)', function () {
    it('should predict synchronously from input data', function () {
      var result = localEnsemble.predict(inputData, undefined,
        {missingStrategy: missingStrategy});
      assert.equal(JSON.stringify(result), reference);
    });
  });
  describe('#predict(inputData, method)', function () {
    it('should predict synchronously from input data', function () {
      var result = localEnsemble.predict(inputData, undefined, {missingStrategy: missingStrategy});
      assert.equal(JSON.stringify(result), reference);
    });
  });

  describe('LocalEnsemble(ensembleId)', function () {
    it('should create a localEnsemble from an ensemble Id', function (done) {
      localEnsemble = new bigml.LocalEnsemble(
        ensembleId,
        new bigml.BigML(undefined, undefined, {storage: "data/storage"}));
      if (localEnsemble.ready) {
        assert.ok(true);
        done();
      } else {
        localEnsemble.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('#predict(inputData, method, callback)', function () {
    it('should predict asynchronously from input data', function (done) {
      localEnsemble.predict(inputData, undefined, {missingStrategy: missingStrategy},
        function (error, data) {
          assert.equal(JSON.stringify(data), reference2);
          done();
      });
    });
  });
  describe('#predict(inputData, method)', function () {
    it('should predict synchronously from input data', function () {
      var result = localEnsemble.predict(inputData, undefined,
        {missingStrategy: missingStrategy});
      assert.equal(JSON.stringify(result), reference2);
    });
  });
  describe('#predict(inputData, method)', function () {
    it('should predict synchronously from input data', function () {
      var result = localEnsemble.predict(inputData, undefined, {missingStrategy: missingStrategy});
      assert.equal(JSON.stringify(result), reference2);
    });
  });


});
