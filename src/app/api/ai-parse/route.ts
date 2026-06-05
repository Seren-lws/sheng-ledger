import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL || 'https://yunwu.ai/v1'
  const model = process.env.AI_MODEL || 'claude-sonnet-4-20250514'

  if (!apiKey) {
    return NextResponse.json({ error: 'AI_API_KEY 未配置' }, { status: 500 })
  }

  try {
    const { text, categories, tags, accounts, today } = await req.json()

    const systemPrompt = `你是一个记账输入解析器。用户会用自然语言描述一笔消费或收入，你需要从中提取结构化信息。

可用的分类：
${categories.map((c: { name: string; id: string; type: string }) => `- ${c.name} (id: ${c.id}, type: ${c.type})`).join('\n')}

可用的标签：
${tags.map((t: { name: string; id: string }) => `- ${t.name} (id: ${t.id})`).join('\n')}

可用的账户：
${accounts.map((a: { name: string; id: string; currency: string }) => `- ${a.name} (id: ${a.id}, currency: ${a.currency})`).join('\n')}

请严格按以下 JSON 格式返回，不要返回任何其他内容：
{
  "amount": 数字或null,
  "type": "expense"或"income",
  "categoryId": "匹配的分类id"或null,
  "tagIds": ["匹配的标签id数组"],
  "accountId": "匹配的账户id"或null,
  "note": "提取的备注信息"或null,
  "date": "YYYY-MM-DD格式的日期"或null
}

规则：
- 金额：提取数字，没有明确金额则为null
- 类型：默认expense，明确说"收入""工资""进账"等才是income
- 分类：根据语义匹配最合适的分类，必须从可用列表中选
- 标签：匹配已有标签，也可以从描述中提取关键词但只能用已有标签
- 账户：根据提到的支付方式匹配（如"paypay""微信""现金"等），没提到则null
- 备注：把商品名、店名等有用信息提取为简短备注
- 日期：今天是 ${today}。用户说"今天"就返回今天日期，"昨天"就返回昨天，"前天"就前天，说了具体日期就用具体日期，没提到日期则为null
- 没有提到的字段一律返回null，不要猜测
- 只返回JSON，不要解释`

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `AI 服务返回 ${response.status}` }, { status: 502 })
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content ?? ''

    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: '解析失败' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('AI parse error:', err)
    return NextResponse.json({ error: 'AI 暂时开小差了' }, { status: 500 })
  }
}
