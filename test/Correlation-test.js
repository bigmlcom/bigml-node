var assert = require('assert'),
  bigml = require('../index');

describe('Manage correlations objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    correlationId, correlation = new bigml.Correlation();

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        done();
      });
    });
  });

  describe('#create(dataset, args, callback)', function () {
    it('should create a correlation from a dataset', function (done) {
      correlation.create(datasetId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        correlationId = data.resource;
        done();
      });
    });
  });
  describe('#get(correlation, finished, query, callback)', function () {
    it('should retrieve a finished correlation', function (done) {
      correlation.get(correlationId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(correlation, args, callback)', function () {
    it('should update properties in the correlation', function (done) {
      var newName = 'my new name';
      correlation.update(correlationId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        correlation.get(correlationId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(correlation, callback)', function () {
    it('should delete the remote correlation', function (done) {
      correlation.delete(correlationId, function (error, data) {
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
});
