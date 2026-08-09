import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const admin = getAdmin();

  const [customersResult, utangResult] = await Promise.all([
    admin.from('customers').select('id, name').order('name', { ascending: true }),
    admin.from('utang').select('customer_id, total_price, status'),
  ]);

  if (customersResult.error) {
    return NextResponse.json({ error: customersResult.error.message }, { status: 500 });
  }
  if (utangResult.error) {
    return NextResponse.json({ error: utangResult.error.message }, { status: 500 });
  }

  const byCustomer = new Map<string, { total: number; count: number }>();
  for (const u of utangResult.data ?? []) {
    if (u.status !== 'unpaid') continue;
    const key = String(u.customer_id);
    const cur = byCustomer.get(key) ?? { total: 0, count: 0 };
    cur.total += Number(u.total_price ?? 0);
    cur.count += 1;
    byCustomer.set(key, cur);
  }

  const balances = (customersResult.data ?? []).map((c) => ({
    id: String(c.id),
    name: c.name,
    unpaid_total: Number((byCustomer.get(String(c.id))?.total ?? 0).toFixed(2)),
    unpaid_count: byCustomer.get(String(c.id))?.count ?? 0,
  }));

  return NextResponse.json({ data: balances });
}