import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const productName = String(body.product_name ?? '').trim();
  const sellingPrice = Number(body.selling_price);
  const groceryPrice = Number(body.grocery_price);

  if (!productName || !Number.isFinite(sellingPrice) || !Number.isFinite(groceryPrice)) {
    return NextResponse.json({ error: 'Missing or invalid product fields' }, { status: 400 });
  }

  const admin = getAdmin();
  const updatePayload: Record<string, unknown> = {
    product_name: productName,
    selling_price: sellingPrice,
    grocery_price: groceryPrice,
  };

  const stockQuantity = Number(body.stock_quantity);
  if (body.stock_quantity !== undefined && body.stock_quantity !== '' && !Number.isNaN(stockQuantity)) {
    updatePayload.stock_quantity = stockQuantity;
  }
  if (body.stock_quantity === '' || body.stock_quantity === null) {
    updatePayload.stock_quantity = null;
  }

  const productCode = String(body.product_code ?? '').trim();
  updatePayload.product_code = productCode || null;

  const category = String(body.category ?? '').trim();
  updatePayload.category = category || null;

  const { data, error } = await admin
    .from('products')
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
  const { error } = await admin.from('products').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}