!(function (global) {
  function loadScript(url, callback) {
    define = null; // 防止 amd 或 cmd 环境导致没有全局变量

    var script = document.createElement('script');
    script.src = url;
    script.type = 'text/javascript';
    script.onload = script.onreadystatechange = function () {
      if (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete') {
        this.onload = this.onreadystatechange = null;
        this.parentNode.removeChild(this);
        callback();
      }
    }
    document.getElementsByTagName('head')[0].appendChild(script);
  }

  function get(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url);
    xhr.send();
    xhr.onreadystatechange = function(e) {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var result;
          try {
            result = JSON.parse(xhr.responseText);
          } catch (err) {
            callback(err);
          }
          if (result) {
            callback(null, result);
          }
        } else {
          callback(new Error('status:' + xhr.status))
        }
      }
    };
  }

  var REG_WECHAT = /\bMicroMessenger\/([\d.]+)/;
  var ua = navigator.userAgent;
  var isInWechat = REG_WECHAT.test(ua);

  var utils = {
    isInWechat: isInWechat,
  };

  function onWXScriptReady(callback) {
    if (!isInWechat) {
      return;
    }
    if (global.wx) {
      callback(global.wx);
    } else {
      loadScript('https://res.wx.qq.com/open/js/jweixin-1.2.0.js', function () {
        callback(global.wx);
      });
    }
  }

  function onWXConfigReady(callback) {
    onWXScriptReady(function (wx) {
      if (!utils.getConfigUrl) {
        return console.error('No "getConfigUrl"');
      }
      get(utils.getConfigUrl, function (err, result) {
        if (err) {
          return console.error(err);
        }
        if (result.code === 0) {
          wx.config(result.data);
          wx.ready(function () {
            callback(wx);
          });
        } else {
          console.error(result);
        }
      })
    });
  }

  function initServer(baseUrl) {
    if (baseUrl) {
      utils.getConfigUrl = baseUrl + '/wechat/config';
    }
    return utils;
  }

  /**
   * 初始化分享
   * @param {Object} options 分享配置
   * @param {String} options.link 分享地址
   * @param {String} options.title 分享地址
   * @param {String} options.desc 分享地址
   * @param {String} options.imgUrl 分享地址
   * @param {Function} options.success|fail|complete|cancel 分享回掉
   */
  function initShare(options) {
    onWXConfigReady(function (wx) {
      wx.onMenuShareTimeline(options);
      wx.onMenuShareAppMessage(options);
      wx.onMenuShareQQ(options);
    });
  }

  utils.onConfigReady = onWXConfigReady;
  utils.initServer = initServer;
  utils.initShare = initShare;

  global.wxUtils = utils;
})(this);
