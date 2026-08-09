import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('gcash_fee_tiers')
    .select('*')
    .order('min_amount', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
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
    .insert([{ min_amount: minAmount, max_amount: maxAmount, fee }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}