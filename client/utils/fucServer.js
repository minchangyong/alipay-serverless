const MPServerless = require('@alicloud/mpserverless-sdk');
const mpserverless = new MPServerless({
  uploadFile: my.uploadFile,
  request: my.request,
  getAuthCode: my.getAuthCode
}, {
    // 配置参考 https://help.aliyun.com/document_detail/123251.html?spm=a2c4g.11186623.6.548.48395db9KiePV4#title-zb1-mhj-8vw
    appId: 'appid', //请自行填入
    spaceId: 'spaceID',//请自行填入
    clientSecret: 'clientSecret',//请自行填入
    endpoint: 'https://api.bspapp.com'
  });

/**
 * 云函数调用
 * @param {String} funName 云函数名称
 * @param {Object} params 请求入参
 * @return {*}
 */
export async function fucServer(fucName, params = {}) {
  if (!fucName) {
    return {
      success: false,
      errMsg: 'fucName不能为空'
    };
  }
  try {
    my.showLoading();
    // 现阶段获取用户uid方法
    const userInfo = await mpserverless.user.getInfo();
    console.log(userInfo);
    const { user } = userInfo.result;
    // 调用云函数
    const data = await mpserverless.function.invoke(fucName, { ...params, userId: user.oAuthUserId });
    const { success, result } = data;
    my.hideLoading();
    if (success) {
      // 云函数网关层调用成功, 返回业务.
      return result;
    } else {
      // 云函数网关层出现异常, 主动抛出.
      throw data;
    }
  } catch (e) {
    console.error('云函数调用失败: ', e);
    my.hideLoading();
    return false;
  }
}
