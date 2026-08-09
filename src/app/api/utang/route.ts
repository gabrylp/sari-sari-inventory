import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const customerId = url.searchParams.get('customer_id');
  const status = url.searchParams.get('status');

  if (!customerId) {
    return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
  }

  const admin = getAdmin();
  let query = admin
    .from('utang')
    .select(
      `id,
       customer_id,
       product_id,
       quantity,
       total_price,
       status,
       created_at,
       paid_at,
       products!inner(product_name)`
    )
    .eq('customer_id', customerId);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = (data ?? []).map((u) => ({
    id: u.id,
    customer_id: u.customer_id,
    product_id: u.product_id,
    product_name: u.products?.[0]?.product_name ?? 'Unknown',
    quantity: u.quantity,
    total_price: u.total_price,
    status: u.status,
    created_at: u.created_at,
    paid_at: u.paid_at,
  }));

  return NextResponse.json({ data: entries });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const customerId = body.customer_id;
  const items = body.items as
    | { product_id: string | number; quantity: number }[]
    | undefined;

  if (!customerId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Customer and at least one item are required' }, { status: 400 });
  }

  const admin = getAdmin();

  const ids = items.map((i) => i.product_id);
  const { data: products, error: productsError } = await admin
    .from('products')
    .select('id, product_name, selling_price, stock_quantity')
    .in('id', ids as never);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  const productMap = new Map((products ?? []).map((p) => [String(p.id), p]));

  const utangRows: Record<string, unknown>[] = [];
  const receiptItems = [];
  let total = 0;

  for (const item of items) {
    const product = productMap.get(String(item.product_id));
    if (!product) {
      return NextResponse.json({ error: 'One or more products no longer exist' }, { status: 400 });
    }

    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: `Invalid quantity for ${product.product_name}` }, { status: 400 });
    }

    const lineTotal = product.selling_price * qty;
    utangRows.push({
      customer_id: customerId,
      product_id: product.id,
      quantity: qty,
      total_price: lineTotal,
      status: 'unpaid',
    });
    receiptItems.push({
      product_id: product.id,
      product_name: product.product_name,
      quantity: qty,
      unit_price: product.selling_price,
      total: lineTotal,
    });
    total += lineTotal;

    // Best-effort stock decrement.
    if (typeof product.stock_quantity === 'number') {
      await admin
        .from('products')
        .update({ stock_quantity: Math.max(0, product.stock_quantity - qty) })
        .eq('id', product.id);
    }
  }

  const { data: inserted, error } = await admin.from('utang').insert(utangRows).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const insertedRows = inserted ?? [];
  const createdAt = insertedRows[0]?.created_at ?? new Date().toISOString();

  return NextResponse.json({
    receipt: {
      transaction_id: null,
      utang_ids: insertedRows.map((r) => String(r.id)),
      created_at: createdAt,
      payment_method: 'utang',
      items: receiptItems,
      total: Number(total.toFixed(2)),
    },
  });
}