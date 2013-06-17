var assert = require('assert'),
  bigml = require('../index');

describe('Manage source objects', function () {
  var sourceId, source = new bigml.Source(), path = './data/iris.csv';
  describe('#create(path, args, callback)', function () {
    it('should create a source from a file', function (done) {
      source.create(path, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        sourceId = data.resource;
        done();
      });
    });
  });
  describe('#get(source, finished, query, callback)', function () {
    it('should retrieve a finished source', function (done) {
      source.get(sourceId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(source, args, callback)', function () {
    it('should update properties in the source', function (done) {
      var newName = 'my new name';
      source.update(sourceId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        source.get(sourceId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(source, args, callback)', function () {
    it('should delete the remote source', function (done) {
      source.delete(sourceId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
