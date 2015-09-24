var assert = require('assert'),
  bigml = require('../index');

describe('Manage execution objects', function () {
  var scriptId, script = new bigml.Script(), sourceCode = '(+ 1 1)',
    scriptId2, script2 = new bigml.Script(),
    executionId, execution = new bigml.Execution();

  before(function (done) {
    script.create(sourceCode, undefined, function (error, data) {
      assert.equal(data.code, bigml.constants.HTTP_CREATED);
      scriptId = data.resource;
      script2.create(sourceCode, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        scriptId2 = data.resource;
        done();
      });
    });
  });

  describe('#create(script, args, callback)', function () {
    it('should create a execution from a script', function (done) {
      execution.create(scriptId, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        executionId = data.resource;
        done();
      });
    });
  });
  describe('#get(execution, finished, query, callback)', function () {
    it('should retrieve a finished execution', function (done) {
      execution.get(executionId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(execution, args, callback)', function () {
    it('should update properties in the execution', function (done) {
      var newName = 'my new name';
      execution.update(executionId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        execution.get(executionId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(execution, callback)', function () {
    it('should delete the remote execution', function (done) {
      execution.delete(executionId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });

  describe('#create(scripts, args, callback)', function () {
    it('should create a execution from a list of scripts', function (done) {
      execution.create([scriptId, scriptId2], undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        executionId = data.resource;
        done();
      });
    });
  });
  describe('#get(execution, finished, query, callback)', function () {
    it('should retrieve a finished execution', function (done) {
      execution.get(executionId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(execution, args, callback)', function () {
    it('should update properties in the execution', function (done) {
      var newName = 'my new name';
      execution.update(executionId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        execution.get(executionId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(execution, callback)', function () {
    it('should delete the remote execution', function (done) {
      execution.delete(executionId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });

  after(function (done) {
    script.delete(scriptId, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
  after(function (done) {
    script2.delete(scriptId2, function (error, data) {
      assert.equal(error, null);
      done();
    });
  });
});
