var assert = require('assert'),
  bigml = require('../index');

describe('Manage tests objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(),
    testId, statisticalTest = new bigml.StatisticalTest();

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
    it('should create a test from a dataset', function (done) {
      statisticalTest.create(datasetId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        testId = data.resource;
        done();
      });
    });
  });
  describe('#get(test, finished, query, callback)', function () {
    it('should retrieve a finished test', function (done) {
      statisticalTest.get(testId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(test, args, callback)', function () {
    it('should update properties in the test', function (done) {
      var newName = 'my new name';
      statisticalTest.update(testId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        statisticalTest.get(testId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(test, callback)', function () {
    it('should delete the remote test', function (done) {
      statisticalTest.delete(testId, function (error, data) {
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
