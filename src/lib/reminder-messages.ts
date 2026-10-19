/**
 * 推送提醒的话：按情况挑，同一种情况也换着说，不会天天同一句。
 */

type Msg = { title: string; body: string; url: string }

// 用日期挑一句，同一天固定、隔天会换
function pick(list: string[], seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return list[h % list.length]
}

/** 晚上：今天一笔都还没记 */
export function eveningMessage(opts: { today: string; streak: number; daysSinceLast: number | null }): Msg {
  const { today, streak, daysSinceLast } = opts
  let body: string

  if (streak >= 3) {
    body = pick([
      `已经连着记了 ${streak} 天，今天的还空着～随手记一笔，别让它断掉呀`,
      `第 ${streak + 1} 天就差今天这一下了，花了什么趁现在记一记？`,
      `${streak} 天都没落下，今天也来打个卡吧，一笔就够`,
    ], today)
  } else if (daysSinceLast !== null && daysSinceLast >= 3) {
    body = pick([
      `${daysSinceLast} 天没来啦，不用补得很完整，想起哪笔记哪笔就好`,
      `好几天没见了～不用一口气补齐，先把今天的记上就很好`,
      `隔了 ${daysSinceLast} 天也没关系，从今天这笔重新开始`,
    ], today)
  } else {
    body = pick([
      '今天的小账还空着呢，花了什么趁还记得记一下？',
      '今天过得怎么样？顺手把今天的花销记一笔吧',
      '睡前花一分钟，把今天的账记上～',
      '今天还没记账哦，咖啡、电车、便利店，想起哪笔记哪笔',
    ], today)
  }

  return { title: '声声记账本', body, url: '/' }
}

/** 早上：昨天整天都空着 */
export function morningMessage(opts: { today: string }): Msg {
  const body = pick([
    '昨天的账还空着，趁还记得补一下？点这里直接补昨天的',
    '早呀～昨天花了什么还记得吗？点开就能补记昨天',
    '昨天那页还是空白的，花一分钟补上吧',
  ], opts.today)
  return { title: '声声记账本', body, url: '/?date=yesterday' }
}

export const TEST_MESSAGE: Msg = {
  title: '声声记账本',
  body: '推送通啦～以后到点就会这样来找你',
  url: '/',
}
