var assert = require("assert"),
  BigML = require('../lib/BigML'),
  constants = require('../lib/constants');

describe('Connect with a BigML object', function(){
  var bigml = new BigML(),
      reqOptions = {
      method: 'GET',
      resourceType: 'source',
      endpoint: '',
      query: undefined,
      headers: constants.ACCEPT_JSON
    };
  describe('#request(options, callback)', function(){
    it('should connect without error with user\'s credentials', function(done){
      bigml.request(reqOptions, function (error, data, response) {
          assert.equal(error, null);
          done();
        });
    })
    it('should not connect with false credentials', function(done){
      bigml = new BigML('*', '*');
      bigml.request(reqOptions, function (error, data, response) {
          assert.equal(data.code, constants.HTTP_UNAUTHORIZED);
          done();
        });
    })
  })
})
