# y-server-plugin-wechat

y-server-plugin-wechat is a [y-server](https://github.com/yued-fe/y-server) wechat plugin.

## Install

```bash
npm install y-server-plugin-wechat
```

## Usage

```javascript
const yServer = require('y-server');
const wechatPlugin = require('y-server-plugin-wechat');

yServer({
  plugins: [
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
});
```

## Notes

* `baseUrl` is the base url of route path.
* `appId` is the wechat AppID (see [doc](https://mp.weixin.qq.com/wiki?action=doc&id=mp1421140183&t=0.574157375101344)).
* `secret` is the wechat AppSecret (see [doc](https://mp.weixin.qq.com/wiki?action=doc&id=mp1421140183&t=0.574157375101344)).
* `hosts` is the hosts whitelist
* `jsApiList` is the js api list

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)
