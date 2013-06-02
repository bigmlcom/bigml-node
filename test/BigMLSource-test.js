var assert = require("assert"),
  BigMLSource = require('../lib/BigMLSource'),
  constants = require('../lib/constants');

describe('Manage source objects', function(){
  var sourceId, source = new BigMLSource(), path = './data/iris.csv';
  describe('#create(path, callback)', function(){
    it('should create a source from a file', function(done){
        source.create(path, undefined, function (error, data) {
        assert.equal(data.code, constants.HTTP_CREATED);
        sourceId = data.resource;
        done();
      });
    })
  })
  describe('#get(sourceId, finished, callback)', function(){
    it('should retrieve a finished source', function(done){
        source.get(sourceId, true, function (error, data) {
        if (data.object.status.code === constants.FINISHED) {
          assert.ok(true);
          done();
        }
      });
    })
  })
})
