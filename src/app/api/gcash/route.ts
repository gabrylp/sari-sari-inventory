import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { findGcashTier, roundMoney, type GcashTier } from '@/lib/gcash';

export async function GET() {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('gcash_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const type = body.type === 'cashout' ? 'cashout' : 'cashin';
  const amount = Number(body.amount);
  const fee = Number(body.fee);
  const customerName = String(body.customer_name ?? '').trim() || null;
  const note = String(body.note ?? '').trim() || null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
  }
  if (!Number.isFinite(fee) || fee < 0) {
    return NextResponse.json({ error: 'Fee must be a non-negative number' }, { status: 400 });
  }

  const admin = getAdmin();

  const { data: tierRows, error: tiersError } = await admin
    .from('gcash_fee_tiers')
    .select('id, min_amount, max_amount, fee');
  if (tiersError) return NextResponse.json({ error: tiersError.message }, { status: 500 });

  const tiers = (tierRows ?? []) as GcashTier[];
  const matchedTier = findGcashTier(tiers, amount);

  if (!matchedTier) {
    return NextResponse.json(
      {
        error:
          tiers.length === 0
            ? 'No fee tiers configured — add them on the GCash Service page'
            : `Amount ₱${amount.toFixed(2)} falls outside every fee tier`,
      },
      { status: 400 }
    );
  }

  if (fee < Number(matchedTier.fee)) {
    return NextResponse.json(
      { error: `Fee must be at least ₱${Number(matchedTier.fee).toFixed(2)} for this tier` },
      { status: 400 }
    );
  }

  const { data, error } = await admin
    .from('gcash_transactions')
    .insert([{ type, amount, fee, customer_name: customerName, note }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: {
      ...data,
      amount: Number(data.amount),
      fee: Number(data.fee),
      net: roundMoney(Number(data.amount) - Number(data.fee)),
    },
  });
}