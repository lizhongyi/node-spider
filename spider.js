const request = require("request")
const iconv = require('iconv-lite')
const cheerio = require("cheerio")
const _ = require("lodash")
const crypto = require('crypto')
class spider {

  constructor(config) {
    /**
     * @param {boolen} debug
     * @param {boolen} proxy
     * @param {string} proxy_ip
     * @param {array} temp_proxy
     * @param {array} headers
     */
    this.config = config
    this.doc_type = config.doc_type || 'html'
    this.headers = {
      'Host': this.config.Host
    }
    this.result_obj = {
      id: Number,
      title: String,
      link: String,
      desc: String,
      from: String
    }
    this.result_ext = {}
    this.debug = false
    this.proxy = false
    this.proxy_ip = null
    this.temp_proxy = []
    this.headers = []
    this.result_list = []
  }

  /**
   * @param {string} url
   * @param {string} method
   * @return {string} 
   */
  async so(url = "baidu.com", method = 'get') {
    let options = {
      method: method,
      url: url,
      timeout: 8000,
      headers: this.headers
    }
    console.log('开始爬取', url)
    if (this.temp_proxy.length && this.proxy) {
      if (!this.proxy_ip) {
        this.say('找出可用的代理ip')
        this.proxy_ip = await this.checkIp()
        console.log('获取到了才到下一步')
      }
      if (!this.proxy_ip) {
        console.log('还没有的话。估计是不行了')

        return false
      }
      options.proxy = this.proxy_ip
      return new Promise((resolve, reject) => {

        request(options, (error, response, body) => {
          try {

            if (error) throw error;

            if (/meta.*charset=gb2312/.test(body)) {
              body = iconv.decode(body, 'gbk');
            }
            if (this.proxy_ip) {
              this.say('这个IP果然牛逼!!!!', this.proxy_ip)
            }
            this.say('爬取完成了，丢出去html给下一个兄弟处理\n')

            if (this.doc_type == 'json') {
              resolve(this.handle(body[this.res_data]))
            } else {
              resolve(this.handle(body))
            }


          } catch (e) {
            this.say(options.proxy + '爬取失败了，因为这原因代理ip换一下吧' + options.proxy, e.response)
            this.tempProxy = []
            this.proxyIp = null
            resolve(false)
          }

        });
      }).catch(e => {
        this.say(e);
        return false
      })
    } else {
      return new Promise((resolve, reject) => {

        request(options, (error, response, body) => {
          try {

            if (error) throw error;

            if (/meta.*charset=gb2312/.test(body)) {
              body = iconv.decode(body, 'gbk');
            }
            let result
            this.say('爬取完成了，丢出去html给下一个兄弟处理\n')
            if (this.doc_type == 'json') {
              result = JSON.parse(body)
              // console.log(result)
              return resolve(this.handle(result[this.res_data]))
            } else {
              console.log(this.config.doc_type)
              resolve(this.handle(body))
            }

          } catch (e) {
            this.say('爬取失败了，因为这原因', e.response)
            return reject(e);
          }

        });
      }).catch(e => {
        console.log(e)
      })
    }
  }
  /**
   * 获取代理IP
   * @returns 
   */
  get_proxy_list() {
    let api_url = 'http://www.66ip.cn/mo.php?sxb=&tqsl=100&port=&export=&ktip=&sxa=&submit=%CC%E1++%C8%A1&textarea=http%3A%2F%2Fwww.66ip.cn%2F%3Fsxb%3D%26tqsl%3D100%26ports%255B%255D2%3D%26ktip%3D%26sxa%3D%26radio%3Dradio%26submit%3D%25CC%25E1%2B%2B%25C8%25A1';
    return new Promise((resolve, reject) => {
      let options = {
        method: 'GET',
        url: api_url,
        gzip: true,
        encoding: null,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'zh-CN,zh;q=0.8,en;q=0.6,zh-TW;q=0.4',
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.101 Safari/537.36',
          'referer': 'http://www.66ip.cn/'
        }
      }

      request(options, (error, response, body) => {
        try {
          if (error) throw error;
          if (/meta.*charset=gb2312/.test(body)) {
            body = iconv.decode(body, 'gbk');
          }
          let ret = body.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,4}/g);
          resolve(ret);
        } catch (e) {
          return reject(e);
        }
      })
    })
  }
  /**
   * 设置代理ip
   */
  async set_proxy() {
    //   this.say(this.tempProxy)
    this.proxy = true
    this.say('好吧请稍等，代理IP稍后奉上....')
    if (!this.tempProxy.length) {
      this.temp_proxy = await this.get_proxy_list()
      this.say('这次一用力获取到了' + this.temp_proxy.length + '个IP，请测试！')
    } else {
      this.say('原来的代理IP还有慢慢慢用')
      //其实该换新的了
      this.temp_proxy = []
    }
  }
  /**
   * 处理数据
   * @returns
   */
  handle(data) {
    if (this.doc_type == 'json') {
      let item = {}
      for (let i in data) {
        item = {}
        for (let it in this.result_obj) {
          //如果是数读取到最后一个字符串
          if (_.isArray(this.result_obj[it])) {
            if (this.result_obj[it].length == 2) {
              item[it] = data[i][this.result_obj[it][0]][this.result_obj[it][1]]
            }
            if (this.result_obj[it].length == 3) {
              item[it] = data[i][this.result_obj[it][0]][this.result_obj[it][1]][this.result_obj[it][2]]
            }
          } else {
            item[it] = data[i][this.result_obj[it]]
          }

        }
        let new_item = Object.assign(item, this.result_ext)
        new_item['key'] = this.set_key(new_item.title)
        this.result_list[i] = new_item
      }
      if (this.debug) {
        this.say(data[0])
        this.say(this.result_list[0])
      }
    }

    if (this.doc_type == 'html') {
      let $ = cheerio.load(data)
      this.say('这是一个html文档，具体是否可用要问一下下面的兄弟才知道')
      return $
    }
    return this.result_list
  }

  async test_proxy(proxy_ip) {
    if (proxyIp == undefined) {
      this.say('ip 已经没了，重新获取')
      this.temp_proxy = []
      await this.set_proxy()
    }
    //测试这个代理IP 可用就设置
    return new Promise((resolve, reject) => {
      let target_options = {
        method: 'GET',
        url: 'http://ip.chinaz.com/getip.aspx',
        timeout: 8000
      };

      //这里修改一下，变成你要访问的目标网站
      this.say(`开始测试这个IP ${proxyIp}`);

      target_options.proxy = 'http://' + proxy_ip;
      request(target_options, (error, response, body) => {
        try {
          if (error) throw error;
          body = body.toString();
          // this.say(body);

          if (body.length < 100) {
            this.say(`兄弟这个可以拿去用==>> ${proxy_ip}`);
            resolve('http://' + proxy_ip)
          } else {
            this.say(`这个IP无效==>> ${proxy_ip}`);
            resolve(false)
          }

        } catch (e) {
          return reject(false);
        }

      });

    }).catch(e => {
      return e
    })
  }

  say(lang, lang1 = '') {
    if (this.debug) {
      console.log(lang, lang1)
    }
  }
  async check_ip() {
    //从第一个开始找找到合适的返回
    if (this.proxy) {
      for (let i in this.temp_proxy) {
        console.log(this.temp_proxy[i])
        let true_ip = await this.testProxy(this.temp_proxy[i])
        if (true_ip) {
          //记住这个索引
          return true_ip
        }
      }
    }
    return false
  }
  set_key(str) {
    if (!str) {
      return 'no str'
    }
    let rand = Math.ceil(Math.random() * 100)
    const md5 = crypto.createHash('md5')
    let password = md5.update(str + rand).digest('hex')
    return password
  }
}

/**
 * api 例子
 */

const api_spider = new spider({
  Host: 'juejin.com',
  doc_type: 'json'
})
api_spider.res_data = ['d']
api_spider.result_obj = {
  id: 'objectId',
  title: 'title',
  link: 'originalUrl',
  desc: 'content',
  like: 'collectionCount',
  comments: 'commentsCount',
  createdAt: 'createdAt'
}
api_spider.result_ext = {
  from: '掘金'
}

api_spider.so('https://search-merger-ms.juejin.im/v1/search?query=node&page=0&raw_result=false&src=web')
  .then((data) => {
    console.log(data[0])
  })



/**
 * html 例子
 */

const so = async function () {

  let start = new spider({
    Host: 'zzk.cnblogs.com',
    doc_type: 'html'
  })
  start.headers['Cookie'] = 'GA1.2.182722864.1520590357; UM_distinctid=162105121121049-0b14491452f4e4-32667b04-1aeaa0-162105121136f2; _gid=GA1.2.1004931403.1527083606; __utma=59123430.182722864.1520590357.1527094058.1527094058.1; __utmc=59123430; __utmz=59123430.1527094058.1.1.utmcsr=cnblogs.com|utmccn=(referral)|utmcmd=referral|utmcct=/; __utmt=1; __utmb=59123430.3.10.1527094058'
  let $ = await start.so('http://zzk.cnblogs.com/s?t=b&w=node')
  $('div.searchItem').each(function (i, elem) {
    let item = $(this).children('.searchItemTitle')
    start.result_list[i] = {
      id: i + 1,
      title: item.text(),
      link: item.children('a').attr('href'),
      desc: $(this).children('.searchCon').text().substr(0, 80),
      from: '博客园',
      createdAt: $(this).children('.searchItemInfo').children('.searchItemInfo-publishDate').text(),
      comments: $(this).children('.searchItemInfo').children('.searchItemInfo-comments').text(),
      views: $(this).children('.searchItemInfo').children('.searchItemInfo-views').text(),
      key: start.set_key(item.text())
    }
  })
  // console.log(start.resultList)
  return start.result_list
}
so().then((data)=>{
    console.log(data[0])
})
module.exports = spider
