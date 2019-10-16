const schedule = require('node-schedule')
const nodemailer = require('nodemailer')
const config = require('./config')
const child_process = require('child_process')

const transporter = nodemailer.createTransport({
  host: 'smtp.mxhichina.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: config.mailAccount,
})

// 每天9:30 开机并发送邮件提示ECS实例IP
schedule.scheduleJob({ second: 0, minute: 30, hour: 9 }, function() {
  child_process.exec(
    `aliyun ecs StartInstance --InstanceId="${config.ecs.id}"`,
    (err, stdOut) => {
      if (err) {
        console.error(err)
      }
      console.log(stdOut)
    },
  )
  setTimeout(() => {
    // 5分钟后获取实例IP 并发送邮件
    child_process.exec(
      `aliyun ecs DescribeInstances --InstanceIds="['${config.ecs.id}']" --RegionId="${config.ecs.region}"`,
      (err, stdOut) => {
        if (err) {
          console.error(err)
        }
        try {
          const result = JSON.parse(stdOut)
          const ipAddress =
            result.Instances.Instance[0].PublicIpAddress.IpAddress[0]
          const mailOptions = {
            from: `ECS启动通知<${config.mailAccount.user}>`,
            to: config.notifyTo,
            subject: 'ECS启动成功',
            text: `实例IP: ${ipAddress}`,
          }
          transporter.sendMail(mailOptions).catch(console.error)
        } catch (e) {
          console.error(e)
          console.error(`解析实例信息失败`)
          console.error(stdOut)
        }
      },
    )
  }, 5 * 60 * 1000)
})

// 每天7:30 关机
schedule.scheduleJob({ second: 0, minute: 30, hour: 7 }, function() {
  child_process.exec(
    `aliyun ecs StopInstance --InstanceId="${config.ecs.id}"`,
    (err, stdOut) => {
      if (err) {
        console.error(err)
      }
      console.log(stdOut)
    },
  )
})
