import cloud from "alipay-serverless-sdk";
const app = getApp()
Page({
  data: {
    userId: '',
    accessToken: '',
    refreshToken: '',
    imgDraw: {}
  },
  onLoad() {
    my.getAuthCode({
      scopes: 'auth_base',
      success: (res) => {
        console.log('authCode:' + res.authCode)
      },
    });
  },
  /**
   * 授权成功事件
   */
  onGetAuthorize() {
    my.showLoading({
      content: '加载中'
    })
    //获取用户授权
    my.getAuthCode({
      scopes: 'auth_base',
      success: (res) => {
        cloud.base.oauth.getToken(res.authCode).then((resResult) => {
          my.hideLoading()
          console.log(resResult)
          const userId = resResult.userId
          const accessToken = resResult.accessToken
          const refreshToken = resResult.refreshToken
          this.setData({
            userId,
            accessToken,
            refreshToken
          })
          // cloud.payment.common.create('小程序支付测试', Date.now(), '0.01', userId).then((createRes) => {
          //   console.log(createRes)
          // })
        })
      }
    })
  },
  handleCreateCode() {
    my.showLoading({
      content: '加载中'
    })
    cloud.base.qrcode.create('pages/index/index', 'shareid=222', '这是一个测试分享码').then((res) => {
      my.hideLoading()
      if (res.code === '10000') {
        this.setData({
          qrCodeUrl: res.qrCodeUrl
        })
      }
    })
  },
  handleUploadImg() {
    my.chooseImage({
      chooseImage: 1,
      success: res => {
        const filePath = res.apFilePaths[0]
        my.getImageInfo({
          src: filePath,
          success: imageInfoRes => {
            const options = {
              filePath,
              extension: imageInfoRes.type,
              headers: {
                contentDisposition: 'inline'
              }
            };
            my.serverless.file.uploadFile(options).then((image) => {
              my.showToast({
                type: 'success',
                content: '上传成功'
              })
              this.setData({
                imageUrl: image.fileUrl
              })
            }).catch(err => {
              console.log(err)
            })
          },
          fail: function (err) {
            my.showToast({
              type: 'exception',
              content: '上传失败'
            });
            console.log(err)
          }
        });
      },
    });
  },
  handleTextarea(e) {
    this.setData({
      textVal: e.detail.value
    })
  },
  async handleCheckText() {
    my.showLoading({
      content: '加载中'
    })
    const res = await cloud.security.textRisk.detect(this.data.textVal)
    my.hideLoading()
    console.log(res)
    if (res.action === 'PASSED') {
      my.showToast({
        content: '文案无违规内容'
      })
    } else if (res.action === 'REJECTED') {
      my.showToast({
        content: `文案有违规内容如下: ${JSON.stringify(res.keywords)}`
      })
    }
  },
  async handleCreateLink() {
    let outerOrderNo = Date.now().toString()
    let bizCode = 'CERT_PHOTO_FACE'
    let identityParam = {
      identityType: 'CERT_INFO',
      certType: 'IDENTITY_CARD',
      certName: '闵昌勇',
      certNo: '511011199606164757'
    }
    let MerchantConfig = {
      returnUrl: 'https://m.qtshe.com'
    }
    const res = await cloud.member.identification.init(outerOrderNo, bizCode, identityParam, MerchantConfig)
    if (res.code === '10000') {
      let certify_id = res.certifyId
      const todo = await cloud.util.generic.execute('alipay.user.certify.open.certify', { certify_id })
      console.log(todo)
    }
  },
  async handleSubmit(e) {
    let postData = {
      keyword1: { value: '程序员鼓励师' },
      keyword2: { value: '辣鸡子默' },
      keyword3: { value: '13587817199' },
      keyword4: { value: '青团社' },
      keyword5: { value: '程序员鼓励师' }
    }
    if (e.detail.formId) {
      const res = await cloud.marketing.templateMessage.send(this.data.userId, e.detail.formId, 'OGMzYmQzYTIxYTZhYTM5NTYwNDg2MzJmY2M1ZTU2MTY=', 'pages/index/index', postData)
      console.log(res)
      if (res.code === '10000') {
        my.showToast({
          content: '发送模版消息成功, 请退到支付宝首页查看',
          type: 'none'
        })
      } else {
        my.showToast({
          content: '发送模版消息失败，请重试'
        })
      }
    }
  },
  async handlePayMent() {
    my.showLoading({
      content: '加载中'
    })
    let subject = '辣鸡表弟结婚礼'
    let outTradeNo = Date.now().toString()
    let totalAmount = 0.01
    let buyerId = this.data.userId
    const res = await cloud.Payment.Common.create(subject, outTradeNo, totalAmount, buyerId)
    my.hideLoading()
    if (res.code === '10000') {
      my.tradePay({
        tradeNO: res.tradeNo,
        success: attr => {
          console.log(attr)
        }
      })
    } else {
      my.showToast({
        type: 'none',
        content: res.subMsg
      })
    }
  },
  onGetAuthorize1(e) {
    my.getPhoneNumber({
      success: (result) => {
        console.log(result)
        const res = cloud.util.generic.execute('')
      },
      fail: () => {

      },
      complete: () => {

      }
    })
  },
  handleCreatePoster() {
    my.showLoading({
      content: '生成中...'
    })
    this.setData({
      startInit: true
    }, () => {
      this.setData({
        imgDraw: {
          width: '750rpx',
          height: '1334rpx',
          background: 'https://qiniu-image.qtshe.com/20190506share-bg.png',
          views: [
            {
              type: 'image',
              url: 'https://qiniu-image.qtshe.com/1560248372315_467.jpg',
              css: {
                top: '32rpx',
                left: '30rpx',
                right: '32rpx',
                width: '688rpx',
                height: '420rpx',
                borderRadius: '16rpx'
              },
            },
            {
              type: 'image',
              url: 'https://qiniu-image.qtshe.com/default-avatar20170707.png',
              css: {
                top: '404rpx',
                left: '328rpx',
                width: '96rpx',
                height: '96rpx',
                borderWidth: '6rpx',
                borderColor: '#FFF',
                borderRadius: '96rpx'
              }
            },
            {
              type: 'text',
              text: '青团社-郝帅',
              css: {
                top: '532rpx',
                fontSize: '28rpx',
                left: '375rpx',
                align: 'center',
                color: '#3c3c3c'
              }
            },
            {
              type: 'text',
              text: `邀请您参与助力活动`,
              css: {
                top: '576rpx',
                left: '375rpx',
                align: 'center',
                fontSize: '28rpx',
                color: '#3c3c3c'
              }
            },
            {
              type: 'text',
              text: `宇宙最萌蓝牙耳机测评员`,
              css: {
                top: '644rpx',
                left: '375rpx',
                maxLines: 1,
                align: 'center',
                fontWeight: 'bold',
                fontSize: '44rpx',
                color: '#3c3c3c'
              }
            },
            {
              type: 'image',
              url: 'https://qiniu-image.qtshe.com/20190605index.jpg',
              css: {
                top: '834rpx',
                left: '470rpx',
                width: '200rpx',
                height: '200rpx'
              }
            }
          ]
        }
      })
    })
  },
  onSuccess(res) {
    my.hideLoading()
    this.setData({
      imagePath: res.path
    })
  },
  onError(err) {
    console.log(err)
    my.hideLoading()
    my.showToast({ content: '生成失败', icon: 'error' })
  },
  downloadImg() {
    my.saveImage({
      url: this.data.imagePath,
      success: () => {
        my.showToast({ content: '保存成功', icon: 'success' })
      },
      fail: () => {
        my.showToast({ content: '保存失败', icon: 'error' })
      }
    });
  }
})