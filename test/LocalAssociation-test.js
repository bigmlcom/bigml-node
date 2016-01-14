var assert = require('assert'),
  bigml = require('../index');

describe('Manage local association objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/movies.csv',
    datasetId, dataset = new bigml.Dataset(),
    associationId, association = new bigml.Association(), associationResource,
    associationFinishedResource,
    localAssociation;

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
