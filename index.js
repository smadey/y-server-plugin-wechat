'use strict';
require('colors');

const crypto = require('crypto');
const https = require('https');
const url = require('url');

/**
 * 是否有效的域名
 * @param {String} host 域名或地址
 * @param {Array} whitelist 有效的域名列表
 * @return {Boolean} 是否有效
 */
function isValidHost(host, whitelist) {
  if (!Array.isArray(whitelist) || whitelist.length === 0) {
    return false;
  }

  const regStr = whitelist.map((d) => {
      return d.replace(/\./g, '\\.').replace(/^\*\\\./g, '([^@/:]*\\.)?');
  }).join('|')
  return new RegExp(`^(${regStr})$`, 'i').test(host);
}

function getJSON(url, params) {
  if (params) {
    const qs = Object.keys(params).map((key) => {
      return `${key}=${params[key]}`;
    }).join('&');
    url += url.indexOf('?') > -1 ? '&' : '?';
    url += qs;
  }

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.setEncoding('utf8');
      res.on('data', (data) => {
        try {
          resolve(JSON.parse(data));
        } catch (ex) {
          reject(new Error(`获取 JSON 数据失败, url: ${url}, data: ${data}`));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`发送请求失败, url: ${url}, err: ${err}`));
    });
  });
}

function getRandomString(len) {
  if (!len) {
    len = 32;
  }
  const chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678'; // 默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1
  let str = '';
  for (let i = 0; i < len; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

function sha1(str) {
  return crypto.createHash('sha1').update(str).digest('hex');
}

function log(str) {
  console.log('[y-server-plugin-wechat]'.gray, str);
}

const cachedTokens = {};
function getAccessToken(appId, secret) {
  const token = cachedTokens[appId];
  if (token && token.expires > Date.now()) {
    return Promise.resolve(token.value);
  }
  return getJSON('https://api.weixin.qq.com/cgi-bin/token', {
    grant_type: 'client_credential',
    appId,
    secret
  }).then((result) => {
    // success: {"access_token":"ACCESS_TOKEN","expires_in":7200}
    // failed: {"errcode":40013,"errmsg":"invalid appid"}
    if (result.access_token) {
      log(`"${appId}"的access_token为"${result.access_token}"`);
      cachedTokens[appId] = {
        value: result.access_token,
        expires: Date.now() + (result.expires_in - 60) * 1000,
      };
      return result.access_token;
    }
    return Promise.reject(new Error(`获取 access token 失败, response: ${JSON.stringify(result)}`));
  });
}

const cachedTickets = {};
function getTicket(appId, access_token) {
  const ticket = cachedTickets[appId];
  if (ticket && ticket.expires > Date.now() && ticket.token === access_token) {
    return Promise.resolve(ticket.value);
  }

  return getJSON('https://api.weixin.qq.com/cgi-bin/ticket/getticket', {
    type: 'jsapi',
    access_token
  }).then((result) => {
    // success: {"errcode":0,"errmsg":"ok","ticket":"TICKET","expires_in":7200}
    // failed: {"errcode":40001,"errmsg":"invalid credential, access_token is invalid or not latest"}
    if (result.ticket) {
      log(`"${appId}"的ticket为"${result.ticket}"`);
      cachedTickets[appId] = {
        token: access_token,
        value: result.ticket,
        expires: Date.now() + (result.expires_in - 60) * 1000,
      };
      return result.ticket;
    }
    return Promise.reject(new Error(`获取 ticket 失败, response: ${JSON.stringify(result)}`));
  });
}

function signature(appId, { ticket, url }) {
  const nonceStr = getRandomString(12);
  const timestamp = Date.now();
  const signature = sha1([
    'jsapi_ticket=' + ticket,
    'noncestr=' + nonceStr,
    'timestamp=' + timestamp,
    'url=' + url
  ].join('&'));

  return {
    nonceStr,
    signature,
    timestamp,
  };
}

/**
 * 微信插件
 * @param {Object} options 配置
 * @param {String} options.baseUrl 基本路径
 * @param {String} options.appId 微信 appId
 * @param {String} options.secret 微信 secret
 * @param {Array} options.hosts 支持域名列表
 * @param {Array} options.jsApiList 支持 JSAPI 列表
 * @return {Function} 插件安装方法
 */
module.exports = function (options) {
  if (!options
   || !options.appId
   || !options.secret
   || !Array.isArray(options.hosts)
   || !Array.isArray(options.jsApiList)
  ) {
    throw new Error('[y-server-plugin-wechat]'.red, '"appId"或"secret"或"hosts"或"jsApiList"配置错误');
  }

  const baseUrl = options.baseUrl || '';
  const appId = options.appId;
  const secret = options.secret;
  const hosts = options.hosts;
  const jsApiList = options.jsApiList;

  /**
   * 插件安装方法
   * @param {Object} app Express实例
   */
  return function (app) {
    app.get(`${baseUrl}/wechat/config`, (req, res) => {
      const clientUrl = req.get('Referrer');
      if (!clientUrl) {
        return res.status(401).send({
          code: 401,
          msg: '缺失 referrer'
        });
      }

      const clientHost = url.parse(clientUrl).host;
      if(!isValidHost(url.parse(clientUrl).host, hosts)) {
        return res.status(401).send({
          code: 401,
          msg: `未知的 host:${clientHost}`
        });
      }

      getAccessToken(appId, secret).then((access_token) => {
        return getTicket(appId, access_token).then((ticket) => {
          const signaturedData = signature(appId, { ticket, url: clientUrl });
          res.send({
            code: 0,
            data: Object.assign({ appId, jsApiList }, signaturedData)
          });
        });
      }).catch((err) => {
        res.send({ code: -1, msg: err.message || err });
      })
    });
  };
};
