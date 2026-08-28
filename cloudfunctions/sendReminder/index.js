// cloudfunctions/sendReminder/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { templateId, data, page } = event
  const wxContext = cloud.getWXContext()
  try {
    const res = await cloud.openapi.subscribeMessage.send({
      touser: wxContext.OPENID,
      templateId,
      data,
      page,
    })
    return { ok: true, res }
  } catch (e) {
    return { ok: false, error: e.errMsg || String(e) }
  }
}
