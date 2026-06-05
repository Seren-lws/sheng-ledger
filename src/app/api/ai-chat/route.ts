import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = process.env.AI_BASE_URL || 'https://yunwu.ai/v1'

  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI_API_KEY 未配置，请在 .env.local 中设置' },
      { status: 500 }
    )
  }

  try {
    const { message, financialContext } = await req.json()

    const systemPrompt = `你是晚声的私人记账小助手，语气温柔亲切，像闺蜜聊天一样。会适当鼓励和夸奖，但不说教。用中文回答。
遇到存得多就真诚地夸，遇到花得多就温柔地安慰，不要说"你应该""建议你"这种居高临下的话。

当前财务数据：
- 本月总收入：¥${Math.round(financialContext.monthlyIncome).toLocaleString()} JPY
- 本月总支出：¥${Math.round(financialContext.monthlyExpense).toLocaleString()} JPY
- 本月净存款：¥${Math.round(financialContext.netSavings).toLocaleString()} JPY
- 存款率：${(financialContext.savingsRate * 100).toFixed(1)}%
- 总资产：¥${Math.round(financialContext.totalAssets).toLocaleString()} JPY
- 可自由存款：¥${Math.round(financialContext.freeAssets).toLocaleString()} JPY

本月支出分类明细：
${financialContext.expenseBreakdown || '暂无数据'}

本月收入分类明细：
${financialContext.incomeBreakdown || '暂无数据'}

固定月支出：¥${Math.round(financialContext.fixedExpenseTotal).toLocaleString()} JPY

近3个月月均存款：¥${Math.round(financialContext.avg3MonthSavings).toLocaleString()} JPY

请基于以上数据回答用户的问题。给出具体数字和分析，语气轻松温暖不说教。该夸就夸，该安慰就安慰。如果数据不足以回答，诚实说明。不要编造数据。回复控制在300字以内。`

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('AI API error:', response.status, text)
      return NextResponse.json(
        { error: `AI 服务返回 ${response.status}` },
        { status: 502 }
      )
    }

    const result = await response.json()
    const reply = result.choices?.[0]?.message?.content ?? '抱歉，我没有收到有效回复。'

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('AI chat error:', err)
    return NextResponse.json(
      { error: 'AI 暂时开小差了，再试一次？' },
      { status: 500 }
    )
  }
}
