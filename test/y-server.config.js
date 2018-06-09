'use strict';

const path = require('path');

const corsPlugin = require('y-server-plugin-cors');

const wechatPlugin = require('../index.js');

module.exports = {
  port: 8889,
  watch: path.join(__dirname, '../index.js'),
  plugins: [
    corsPlugin(),
    wechatPlugin({
      baseUrl: '/githubx',
      appId: 'wx9cf1eb96d1d90407',
      secret: '091ede1d21be2e7f86bc678408a49a8d',
      hosts: [
        '*.githubx.com',
      ],
      jsApiList: [
        'onMenuShareAppMessage',
        'onMenuShareTimeline',
        'onMenuShareQQ',
        'onMenuShareQZone',
        'onMenuShareWeibo',
      ],
    }),
  ],
};
