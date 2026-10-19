import { NextResponse } from 'next/server'
import { sendToAll } from '@/lib/push-server'
import { TEST_MESSAGE } from '@/lib/reminder-messages'

export const dynamic = 'force-dynamic'

/** 「发一条试试」：马上给开了提醒的设备发一条 */
export async function POST() {
  const res = await sendToAll(TEST_MESSAGE)
  return NextResponse.json(res)
}
