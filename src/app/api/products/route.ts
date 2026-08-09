import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim();

  const admin = getAdmin();
  let query = admin.from('products').select('*');

  if (q) {
    query = query.or(`product_name.ilike.%${q}%,product_code.ilike.%${q}%`);
  }

  const { data, error } = await query.order('product_name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: soldRows, error: soldError } = await admin
    .from('sales')
    .select('product_id, quantity');

  if (soldError) return NextResponse.json({ error: soldError.message }, { status: 500 });

  const boughtCount = new Map<string, number>();
  for (const row of soldRows ?? []) {
    const key = String(row.product_id);
    boughtCount.set(key, (boughtCount.get(key) ?? 0) + Number(row.quantity ?? 0));
  }

  const withCounts = (data ?? []).map((p) => ({
    ...p,
    bought_count: boughtCount.get(String(p.id)) ?? 0,
  }));

  return NextResponse.json({ data: withCounts });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const productName = String(body.product_name ?? '').trim();
  const sellingPrice = Number(body.selling_price);
  const groceryPrice = Number(body.grocery_price);

  if (!productName || !Number.isFinite(sellingPrice) || !Number.isFinite(groceryPrice)) {
    return NextResponse.json({ error: 'Missing or invalid product fields' }, { status: 400 });
  }

  const admin = getAdmin();
  const insertPayload: Record<string, unknown> = {
    product_name: productName,
    selling_price: sellingPrice,
    grocery_price: groceryPrice,
  };

  if (body.stock_quantity !== undefined && body.stock_quantity !== '') {
    insertPayload.stock_quantity = Number(body.stock_quantity);
  }
  const productCode = String(body.product_code ?? '').trim();
  if (productCode) insertPayload.product_code = productCode;
  const category = String(body.category ?? '').trim();
  if (category) insertPayload.category = category;

  const { data, error } = await admin
    .from('products')
    .insert([insertPayload])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const { ids, all } = body ?? {};

  const admin = getAdmin();
  let query = admin.from('products').delete();

  if (all) {
    query = query.neq('id', 0);
  } else if (Array.isArray(ids) && ids.length > 0) {
    query = query.in('id', ids);
  } else {
    return NextResponse.json({ error: 'No products selected for deletion' }, { status: 400 });
  }

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}