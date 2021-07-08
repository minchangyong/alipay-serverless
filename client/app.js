// 1. 引入必要的 sdk
import MPServerless from '@alicloud/mpserverless-sdk';
import cloud from 'alipay-serverless-sdk';
// 2. 在 app.js 中对 sdk 进行初始化
// 2.1 初始化 MPServerless
my.serverless = my.serverless || new MPServerless({
  uploadFile: my.uploadFile,
  request: my.request,
  getAuthCode: my.getAuthCode,
}, {
  // 2.2 参数能在小程序云服务空间详情中获取
  appId: '2018110962083552',
  spaceId: 'f0ab93a3-9648-4d9d-b1ab-d242d4b74bdd',
  clientSecret: 'sTqTDMzNQvbfCKyHnK/h9Q==',
  endpoint: 'https://api.bspapp.com'
})
// 2.3 初始化 alipay-serverless-sdk
cloud.init(my.serverless);
App({
  async onLaunch() {
    const res = await my.serverless.user.authorize({
      authProvider: 'alipay_openapi'
    })
    if (res.success) {
      console.log('授权成功');
    }
  },
  onShow(options) {
    // 从后台被 scheme 重新打开
    // options.query == {number:1}
  },
});