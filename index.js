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

// 周一至周五 9:30 开机并发送邮件提示ECS实例IP
schedule.scheduleJob(
  { second: 0, minute: 30, hour: 9, dayOfWeek: new schedule.Range(1, 5) },
  function() {
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
          const mailOptions = {
            from: `ECS启动通知<${config.mailAccount.user}>`,
            to: config.notifyTo,
          }
          try {
            const result = JSON.parse(stdOut)
            const ipAddress =
              result.Instances.Instance[0].PublicIpAddress.IpAddress[0]
            mailOptions.subject = 'ECS启动成功'
            mailOptions.text = `实例IP: ${ipAddress}`
          } catch (e) {
            console.error(e)
            console.error(`解析实例信息失败`)
            console.error(stdOut)
            mailOptions.subject = '读取ECS实例信息失败'
            mailOptions.text = stdOut
          }
          transporter.sendMail(mailOptions).catch(console.error)
        },
      )
    }, 5 * 60 * 1000)
  },
)

// 每天19:30 关机
schedule.scheduleJob({ second: 0, minute: 30, hour: 19 }, function() {
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
