var assert = require('assert'),
  bigml = require('../index');

describe('Manage whizzml script objects', function () {
  var scriptId, script = new bigml.Script(), sourceCode = '(+ 1 1)';
  describe('#create(sourceCode, args, callback)', function () {
    it('should create a script from a excerpt of code', function (done) {
      script.create(sourceCode, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        scriptId = data.resource;
        done();
      });
    });
  });
  describe('#get(script, finished, query, callback)', function () {
    it('should retrieve a finished script', function (done) {
      script.get(scriptId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(script, args, callback)', function () {
    it('should update properties in the script', function (done) {
      var newName = 'my new name';
      script.update(scriptId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        script.get(scriptId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(script, args, callback)', function () {
    it('should delete the remote script', function (done) {
      script.delete(scriptId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
