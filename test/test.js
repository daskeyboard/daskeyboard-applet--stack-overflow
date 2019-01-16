// oAuth2ProxyBaseUrl

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const index = require('../index');
const daskeyboardApplet = require('daskeyboard-applet')

describe('QStackoverflow', () => {
  describe('#run()', () => {
    it('should run correctly', async function () {
      return buildAppWith1UnreadInbox().then(app => {
        return app.run().then(signal => {
          console.log('Received signal', signal);
          assert.ok(signal);
        }).catch(err => assert.fail(err));
      }).catch(err => assert.fail(err));
    });

    it('should blink blue if found unread inbox', async function () {
      return buildAppWith1UnreadInbox().then(app => {
        return app.run().then(signal => {
          console.log('Received signal', signal);
          assert.equal(signal.points[0][0].color, '#0000FF');
          assert.equal(signal.points[0][0].effect, daskeyboardApplet.Effects.BLINK);
        }).catch(err => assert.fail(err));
      }).catch(err => assert.fail(err));
    });

    it('should return null if no inbox found', async function () {
      return buildAppWithNoUnreadInbox().then(app => {
        return app.run().then(signal => {
          assert.ok(!signal);
        }).catch(err => assert.fail(err));
      }).catch(err => assert.fail(err));
    })
  });
});


/**
 * Build the app and simulate the method getUnreadInbox()
 * to return the json file test/stack-response.json
 */
async function buildAppWith1UnreadInbox() {
  let app = new index.QStackoverflow();
  app.getUnreadInbox = async function () {
    return new Promise((resolve, reject) => {
      try {
        const fakeResponse = fs.readFileSync(path.resolve('test/stack-response-template.json'));
        resolve(JSON.parse(fakeResponse))
      } catch (err) {
        reject(err);
      }
    })
  }
  return app.processConfig({
    authorization: {
      apiKey: 'random-key'
    }
  }).then(() => {
    return app;
  });
}

/**
 * Build the app and simulate the method getUnreadInbox()
 * to return empty array
 */
async function buildAppWithNoUnreadInbox() {
  let app = new index.QStackoverflow();
  app.getUnreadInbox = async function () {
    return new Promise((resolve, reject) => {
      const response = {
        items: []
      }
      resolve(response);
    })
  }
  return app.processConfig({
    authorization: {
      apiKey: 'random-key'
    }
  }).then(() => {
    return app;
  });
}