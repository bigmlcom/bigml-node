var assert = require('assert'),
  bigml = require('../index');

describe('Manage project objects', function () {
  var projectId, project = new bigml.Project();
  describe('#create(args, callback)', function () {
    it('should create a project', function (done) {
      project.create({name:'my project'}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        projectId = data.resource;
        done();
      });
    });
  });
  describe('#get(project, finished, query, callback)', function () {
    it('should retrieve a finished project', function (done) {
      project.get(projectId, true, function (error, data) {
        if (data.resource === projectId) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(project, args, callback)', function () {
    it('should update properties in the project', function (done) {
      var newName = 'my new project name';
      project.update(projectId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        project.get(projectId, true, function (errorcb, datacb) {
          if (datacb.resource === projectId &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(project, args, callback)', function () {
    it('should delete the remote project', function (done) {
      project.delete(projectId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
