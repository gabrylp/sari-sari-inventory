import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const minAmount = Number(body.min_amount);
  const maxAmount = Number(body.max_amount);
  const fee = Number(body.fee);

  if (
    !Number.isFinite(minAmount) ||
    minAmount < 0 ||
    !Number.isFinite(maxAmount) ||
    maxAmount < minAmount ||
    !Number.isFinite(fee) ||
    fee < 0
  ) {
    return NextResponse.json({ error: 'Invalid tier (min/max/fee must be numbers, min ≤ max)' }, { status: 400 });
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from('gcash_fee_tiers')
    .update({ min_amount: minAmount, max_amount: maxAmount, fee })
    .eq('id', Number(id))
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const admin = getAdmin();

  const { error } = await admin.from('gcash_fee_tiers').delete().eq('id', Number(id));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}