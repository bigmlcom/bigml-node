var assert = require('assert'),
  bigml = require('../index');

describe('Manage dataset objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(), dataset2 = new bigml.Dataset(),
    dataset3 = new bigml.Dataset(), datasetId2, datasetId3;

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      done();
    });
  });

  describe('#create(source, callback)', function () {
    it('should create a dataset from a source', function (done) {
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        done();
      });
    });
  });
  describe('#get(dataset, finished, query, callback)', function () {
    it('should retrieve a finished dataset', function (done) {
      dataset.get(datasetId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(dataset, args, callback)', function () {
    it('should update properties in the source', function (done) {
      var newName = 'my new name';
      dataset.update(datasetId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        dataset.get(datasetId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#create(dataset, callback)', function () {
    it('should create a new dataset from a dataset', function (done) {
      dataset2.create(datasetId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId2 = data.resource;
        done();
      });
    });
  });
  describe('#create([dataset], callback)', function () {
    it('should create a new dataset from a list of datasets', function (done) {
      dataset3.create([datasetId, datasetId2], undefined,
                      function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId3 = data.resource;
        done();
      });
    });
  });
  describe('#delete(dataset, callback)', function () {
    it('should delete the remote dataset', function (done) {
      dataset.delete(datasetId, function (error, data) {
        assert.equal(error, null);
        dataset.delete(datasetId2, function (error, data) {
          assert.equal(error, null);
          dataset.delete(datasetId3, function (error, data) {
            assert.equal(error, null);
            done();
          });
        });
      });
    });
  });

  after(function (done) {
    source.delete(sourceId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
