var assert = require('assert'),
  bigml = require('../index');
try {
describe('Manage whizzml library objects', function () {
  var libraryId, library = new bigml.Library(),
  sourceCode = '(define (mu x) (+ x 1))';
  describe('#create(sourceCode, args, callback)', function () {
    it('should create a library from a excerpt of code', function (done) {
      library.create(sourceCode, undefined, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_CREATED);
        libraryId = data.resource;
        done();
      });
    });
  });
  describe('#get(library, finished, query, callback)', function () {
    it('should retrieve a finished library', function (done) {
      library.get(libraryId, true, function (error, data) {
        if (data.object.status.code === bigml.constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    });
  });
  describe('#update(library, args, callback)', function () {
    it('should update properties in the library', function (done) {
      var newName = 'my new name';
      library.update(libraryId, {name: newName}, function (error, data) {
        assert.equal(data.code, bigml.constants.HTTP_ACCEPTED);
        library.get(libraryId, true, function (errorcb, datacb) {
          if (datacb.object.status.code === bigml.constants.FINISHED &&
              datacb.object.name === newName) {
            assert.ok(true);
            done();
          }
        });
      });
    });
  });
  describe('#delete(library, args, callback)', function () {
    it('should delete the remote library', function (done) {
      library.delete(libraryId, function (error, data) {
        assert.equal(error, null);
        done();
      });
    });
  });
});
} catch(ex) {console.log(ex, ex.stack.split("\n"));}
