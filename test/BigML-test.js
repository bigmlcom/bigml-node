var assert = require('assert'),
  bigml = require('../index');

describe('Connect with a BigML object', function(){
  var connection = new bigml.BigML(),
    reqOptions = {
      method: 'GET',
      resourceType: 'source',
      endpoint: '',
      query: undefined,
      headers: bigml.constants.ACCEPT_JSON
    };
  describe('#request(options, callback)', function () {
    it('should connect without error with user\'s credentials', function (done) {
      connection.request(reqOptions, function (error, data, response) {
        assert.equal(error, null);
        done();
      });
    });
    it('should not connect with false credentials', function (done) {
      connection = new bigml.BigML('foo', 'bar');
      connection.request(reqOptions, function (error, data, response) {
        assert.equal(data.code, bigml.constants.HTTP_UNAUTHORIZED);
        done();
      });
    });
  });
});
