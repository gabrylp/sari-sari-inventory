import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const admin = getAdmin();

  const { data: existing, error: fetchError } = await admin
    .from('utang')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const markPaid = body.mark_paid === true;

  if (markPaid) {
    if (existing.status === 'paid') {
      return NextResponse.json({ error: 'Utang is already paid' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('utang')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Record the utang as a sale so daily profit includes it as revenue.
    const { error: saleError } = await admin.from('sales').insert([
      {
        product_id: existing.product_id,
        quantity: existing.quantity,
        sale_type: 'utang-paid',
      },
    ]);

    if (saleError) {
      return NextResponse.json({ error: saleError.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  }

  // Generic edit: quantity + optional status flip.
  const quantity = Number(body.quantity);
  const status = body.status;

  if (quantity !== undefined) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (quantity !== undefined) updatePayload.quantity = quantity;
  if (status === 'unpaid' || status === 'paid') {
    updatePayload.status = status;
    updatePayload.paid_at = status === 'paid' ? new Date().toISOString() : null;
  }

  const { data, error } = await admin
    .from('utang')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  const admin = getAdmin();
  const { error } = await admin.from('utang').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}