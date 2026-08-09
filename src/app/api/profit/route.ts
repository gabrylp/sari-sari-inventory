import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { toLocalDateString } from '@/lib/format';

export async function GET() {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('daily_profit')
    .select('id, date, profit')
    .order('date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const { action, ids } = body ?? {};
  const admin = getAdmin();

  if (action === 'update') {
    const { data, error } = await admin.rpc('update_daily_profit');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // GCash service fees are income too: add each day's fee totals on top of
    // the sales profit computed by the RPC (idempotent — fee totals are always
    // added to whatever the RPC left for that day).
    const { data: txns, error: txnsError } = await admin
      .from('gcash_transactions')
      .select('created_at, fee');
    if (txnsError) return NextResponse.json({ error: txnsError.message }, { status: 500 });

    const feesByDate = new Map<string, number>();
    for (const t of txns ?? []) {
      const day = toLocalDateString(new Date(t.created_at));
      feesByDate.set(day, (feesByDate.get(day) ?? 0) + Number(t.fee ?? 0));
    }

    for (const [day, feeTotal] of feesByDate) {
      const { data: existing } = await admin
        .from('daily_profit')
        .select('profit')
        .eq('date', day)
        .maybeSingle();

      const profit = Number(existing?.profit ?? 0) + feeTotal;
      await admin
        .from('daily_profit')
        .upsert({ date: day, profit }, { onConflict: 'date' });
    }

    return NextResponse.json({ data });
  }

  if (action === 'delete') {
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No entries selected for deletion' }, { status: 400 });
    }
    const { error } = await admin.from('daily_profit').delete().in('id', ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}