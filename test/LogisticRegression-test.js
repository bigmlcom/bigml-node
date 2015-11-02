var assert = require('assert'),
  bigml = require('../index');
try {
describe('Manage logistic regression objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv',
    datasetId, dataset = new bigml.Dataset(), datasetId2,
    dataset2 = new bigml.Dataset(),
    logisticId, logistic = new bigml.LogisticRegression(), logisticId2,
    logistic2 = new bigml.LogisticRegression();

  before(function (done) {
    source.create(path, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      sourceId = data.resource;
      dataset.create(sourceId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        datasetId = data.resource;
        dataset2.create(sourceId, undefined, function (error, data) {
          assert.equal(data.code, bigml.constants.HTTP_CREATED);
          datasetId2 = data.resource;
          done();
        });
      });
    });
  });

  describe('#create(dataset, args, callback)', function () {
    it('should create a logistic regression from a dataset', function (done) {
      logistic.create(datasetId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        logisticId = data.resource;
        done();
      });
    });
  });
  describe('#get(logisticRegression, finished, query, callback)', function () {
    it('should retrieve a finished logistic regression', function (done) {
      logistic.get(logisticId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(logisticRegression, args, callback)', function () {
    it('should update properties in the logistic regression', function (done) {
      var newName = 'my new name';
      logistic.update(logisticId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        logistic.get(logisticId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#create([dataset], args, callback)', function () {
    it('should create a logistic regression from a list of datasets ',
      function (done) {
        logistic2.create([datasetId, datasetId2], undefined,
                    function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        logisticId2 = data.resource;
        done();
      });
    });
  });
  describe('#delete(logisticRegression, callback)', function () {
    it('should delete the remote logistic regression', function (done) {
      logistic.delete(logisticId, function (error, data) {
        assert.equal(error, null);
        logistic2.delete(logisticId2, function (error, data) {
          assert.equal(error, null);
          done();
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
  after(function (done) {
    dataset.delete(datasetId, function (error, data) {
      assert.equal(error, null);
      dataset2.delete(datasetId2, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
} catch (e) {console.log(e);}
