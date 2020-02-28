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

try {
describe(scriptName + ': Manage association set objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/groceries.csv',
    datasetId, dataset = new bigml.Dataset(),
    associationId, association = new bigml.Association(),
    associationSetId, associationSet = new bigml.AssociationSet(),
    inputData = {"field1": "cat food"},
    testAssociationSet = [{"rules": ["000003"], "item": {
      "count": 16, "complement": false, "field_id": "000000",
      "name": "hygiene articles"}, "score": 0.01609}];

  before(function (done) {
    var tokenMode = {"fields": {"00000": {"optype": "text",
      "term_analysis": {"token_mode": "all", "language": "en"}}}};
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      source.get(sourceId, true, function (error, data) {
        source.update(sourceId, tokenMode, function (error, data) {
          dataset.create(sourceId, undefined, function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            datasetId = data.resource;
            association.create(datasetId, undefined, function (error, data) {
              assert.equal(data.code, bigml.constants.HTTP_CREATED);
              associationId = data.resource;
              done();
            });
          });
        });
      });
    });
  });

  describe('#create(association, inputData, args, callback)', function () {
    it('should create an association set from an association', function (done) {
      associationSet.create(associationId, inputData, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        associationSetId = data.resource;
        done();
      });
    });
  });
  describe('#get(associationset, finished, query, callback)', function () {
    it('should retrieve a finished associationset', function (done) {
      associationSet.get(associationSetId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          var associationSetRules = data.object.association_set.result;
          assert.deepEqual(associationSetRules, testAssociationSet);
          done();
        }
      });
    });
  });
  describe('#update(associationSet, args, callback)', function () {
    it('should update properties in the associationSet', function (done) {
      var newName = 'my new name';
      associationSet.update(associationSetId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        associationSet.get(associationSetId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(associationset, callback)', function () {
    it('should delete the remote association set', function (done) {
      associationSet.delete(associationSetId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });

  after(function (done) {
    source.delete(sourceId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    dataset.delete(datasetId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    association.delete(associationId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
} catch (e) {console.log(e);}
