const q = require('daskeyboard-applet');
const request = require('request-promise');
// module to decompress stackoverflow api response
const zlib = require('zlib');
const logger = q.logger;

const apiUrl = `https://api.stackexchange.com/2.2`;


const MessageForInboxItemType = {
  comment: 'New comment',
  chat_message: 'New chat message',
  new_answer: 'New answer',
  careers_message: 'New careers message',
  careers_invitations: 'New careers invitations',
  meta_question: 'New meta question',
  post_notice: 'New post notice',
  moderator_message: 'New moderator message'
}

/**
 * Model to define the credential needed from the cloud proxy to send a request to the 
 * stack exchange api.
 * For more information https://api.stackexchange.com/docs
 */
class OauthProxyCredentials {
  constructor({
    accessToken,
    quotaKey
  }) {
    this.accessToken = accessToken;
    this.quotaKey = quotaKey
  }

  isValid() {
    return this.accessToken && this.quotaKey;
  }
}

/**
 * Model to define the answer given by stackexchange api when asking for inbox.
 * There is more fields but only extract what is needed by the applet
 */

class StackOverflowInboxItem {
  constructor({
    item_type,
    link,
    title
  }) {
    this.item_type = item_type;
    this.link = link;
    this.title = title;
  }

  /**
   * Get a message depending on the inbox item type
   */
  getMessageDependingOnItemType() {
    if (Object.keys(MessageForInboxItemType).includes(this.item_type)) {
      return MessageForInboxItemType[this.item_type];
    } else {
      return 'New inbox item'
    }
  }
}

class QStackoverflow extends q.DesktopApp {
  constructor() {
    super();
    this.pollingInterval = 1000 * 60; // every minute
  }


  /**
   * Delete all previous signals
   */
  async deleteOldSignals() {
    // delete the previous signals
    while (this.signalLog && this.signalLog.length) {
      const signal = this.signalLog.pop().signal;
      logger.debug(`Deleting previous signal: ${signal.id}`)
      await q.Signal.delete(signal).catch(error => {
        logger.error(`Error deleting signal ${signal.id}: ${error}`);
      });
      logger.debug(`Deleted the signal: ${signal.id}`);
    }
  }

  /** ping Montastic and set the signal  */
  async run() {
    this.deleteOldSignals();
    return this.getInbox().then(body => {
      const signalColor = '#0000FF';
      const signalEffect = q.Effects.BLINK;
      const latestInboxItem = new StackOverflowInboxItem(body.items[0]);
      const signalMessage = `${latestInboxItem.getMessageDependingOnItemType()}:`
      + '<br>' + `${latestInboxItem.title}`;
      let signal = new q.Signal({
        points: [[new q.Point(signalColor, signalEffect)]],
        name: 'Stackoverflow',
        message: signalMessage,
        link: {
          url: `${latestInboxItem.link}`,
          label: `Show in stackoverflow`
        }
      })
      return signal;
    }).catch(err => {
      logger.error(`Error while getting stackoverflow inbox ${err}`);
      // reset auth credential
      this.oauthCredentials = null;
      return q.Signal.error([`Error while getting stackoverflow inbox`]);
    });
  }

  /**
   * Get the inbox of the user logged in the applet
   */
  async getInbox() {
    logger.info(`Getting Inbox`);
    return this.getOauthClientKeysFromProxy().then(oauthCredentials => {
      console.log('sldkfjsldkfj', oauthCredentials);
      logger.info(`Got Oauth client keys from proxy`);
      /* Stack exchange API sends compressed response. We need to decompress it.
       * More info here: https://api.stackexchange.com/docs/compression
       * The decompression is handled by request promise by passing the option gzip to true
       */
      const options = {
        headers: {
          'Accept-Encoding': 'GZIP'
        },
        gzip: true,
        uri: apiUrl + `/me/inbox`,
        method: 'GET',
        qs: {
          site: 'stackoverflow',
          access_token: oauthCredentials.accessToken,
          key: oauthCredentials.quotaKey
        },
        json: true
        // resolveWithFullResponse: true
      }

      return request(options);
    }).catch(err => {
      logger.error(`Error when trying to fetch user questions: ${err}`);
      throw new Error(`Error when trying to fetch user questions`);
    })
  }



  /**
   * Use daskeyboard Oauth Proxy to make the request
   */
  async getOauthClientKeysFromProxy() {
    if (!this.authorization.apiKey) {
      logger.error(`No apiKey available.`);
      throw new Error('No apiKey available.');
    }

    if (this.oauthCredentials && this.oauthCredentials.isValid()) {
      return this.oauthCredentials;
    }

    const proxyRequest = new q.Oauth2ProxyRequest({
      apiKey: this.authorization.apiKey
    });

    return Promise.all([proxyRequest.getOauth2ProxyToken(),
    proxyRequest.getOauth2ProxyClientPayload()]).then((proxyKeys) => {
      if (proxyKeys.length !== 2) {
        logger.error(`Error when trying to fetch user questions: didn't receive token and key from proxy`);
        throw new Error(`Error when trying to fetch user questions`);
      }
      // get access token from the proxy
      const accessToken = proxyKeys[0].access_token;
      // get the stack app quota key from the client proxy payload
      const key = JSON.parse(proxyKeys[1]).key;

      // save the token and the key in memory
      this.oauthCredentials = new OauthProxyCredentials({
        accessToken: accessToken,
        quotaKey: key
      });

      return new OauthProxyCredentials({
        accessToken: accessToken,
        quotaKey: key
      })
    })
  }
}


const stackoverflow = new QStackoverflow();

module.exports = {
  QStackoverflow: QStackoverflow
}