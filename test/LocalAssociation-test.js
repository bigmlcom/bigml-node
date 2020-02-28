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

describe(scriptName + ': Manage local association objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/groceries.csv',
    datasetId, dataset = new bigml.Dataset(),
    associationId, association = new bigml.Association(), associationResource,
    associationFinishedResource,
    localAssociation,
    inputData = {"field1": "cat food"},
    testAssociationSet = [{"rules": ["000003"], "item": {
      "count": 16, "complement": false, "fieldId": "000000",
      "name": "hygiene articles"}, "score": 0.01609}];

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        association.create(datasetId, undefined,
          function (error, data) {
            assert.equal(data.code, bigml.constants.HTTP_CREATED);
            associationId = data.resource;
            associationResource = data;
            association.get(associationResource, true, 'only_model=true',
              function (error, data) {
                associationFinishedResource = data;
                done();
              });
        });
      });
    });
  });

  describe('LocalAssociation(associationId)', function () {
    it('should create a localAssociation from an association Id', function (done) {
      localAssociation = new bigml.LocalAssociation(associationId);
      if (localAssociation.ready) {
        assert.ok(true);
        done();
      } else {
        localAssociation.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('LocalAssociation(associationResource)', function () {
    it('should create a localAssociation from an association unfinished resource', function (done) {
      localAssociation = new bigml.LocalAssociation(associationResource);
      if (localAssociation.ready) {
        assert.ok(true);
        done();
      } else {
        localAssociation.on('ready', function () {assert.ok(true);
          done();
          });
      }
    });
  });
  describe('LocalAssociation(associationFinishedResource)', function () {
    it('should create a localAssociation from an association finished resource', function () {
      localAssociation = new bigml.LocalAssociation(associationFinishedResource);
      assert.ok(localAssociation.ready);
    });
  });


  describe('#associationset(inputData, callback)', function () {
    it('should predict association sets asynchronously from input data', function (done) {
      localAssociation.associationSet(inputData, function (error, data) {
        assert.deepEqual(data, testAssociationSet);
        done();
      });
    });
  });
  describe('#associationset(inputData)', function () {
    it('should predict association set synchronously from input data', function (done) {
      localAssociation.associationSet(inputData, function (error, data) {
        assert.deepEqual(data, testAssociationSet);
        done();
      });
    });
  });


  describe('#rulesCSV("my_csv.csv", rules)', function () {
    it('should save AssociationRules to a CSV file', function (done) {
      var rules = localAssociation.getRules(), file = "/tmp/rules.csv";
      localAssociation.rulesCSV(file, undefined , function (error, data) {
        assert.equal(data, file);
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
