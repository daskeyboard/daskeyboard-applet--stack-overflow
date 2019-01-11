// oAuth2ProxyBaseUrl

const assert = require('assert');
const authProxyUri = require('./auth.json').oAuth2ProxyBaseUrl;
process.env = {
  ...process.env,
  oAuth2ProxyBaseUrl: authProxyUri
}

const index = require('../index');
const apiKey = require('./auth.json').apiKey;

describe('QStackoverflow', () => {
  describe('#run()', () => {
    it('should run correctly', async function () {
      return buildApp().then(app => {
        return app.run().then(signal => {
          console.log('Received signal', signal);
          assert.ok(signal);
        }).catch(err => assert.fail(err));
      }).catch(err => assert.fail(err));
    })
  });
});


async function buildApp() {
  let app = new index.QStackoverflow();
  return app.processConfig({
    authorization: {
      apiKey: apiKey
    }
  }).then(() => {
    return app;
  })
}