import { NextResponse } from 'next/server';
import { readDb, writeDb, logAudit } from '@/lib/db';
import { MessageLog } from '@/types';

export async function GET() {
  const db = readDb();
  return NextResponse.json({
    templates: db.templates,
    logs: db.messageLogs,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = readDb();

    const newLog: MessageLog = {
      id: `msg-${Date.now()}`,
      clientId: body.clientId || 'cl-custom',
      clientName: body.clientName,
      phone: body.phone,
      channel: body.channel || 'whatsapp',
      trigger: body.trigger || 'invoice_receipt',
      content: body.content,
      status: 'sent',
      sentAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    db.messageLogs.unshift(newLog);
    writeDb(db);

    logAudit(
      'SEND_MESSAGE',
      'MESSAGE',
      newLog.id,
      `إرسال رسالة ${newLog.channel === 'whatsapp' ? 'واتساب' : 'SMS'} إلى ${newLog.clientName} (${newLog.phone})`
    );

    return NextResponse.json({ log: newLog });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
