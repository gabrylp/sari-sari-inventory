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

  const piecesPerPack = body.pieces_per_pack;
  const packCost = body.pack_cost;
  if (piecesPerPack !== undefined && piecesPerPack !== null && piecesPerPack !== '') {
    const pieces = Number(piecesPerPack);
    if (!Number.isInteger(pieces) || pieces < 2) {
      return NextResponse.json({ error: 'Pieces per pack must be a whole number of at least 2' }, { status: 400 });
    }
    updatePayload.pieces_per_pack = pieces;
  } else {
    updatePayload.pieces_per_pack = null;
  }
  if (packCost !== undefined && packCost !== null && packCost !== '') {
    const cost = Number(packCost);
    if (!Number.isFinite(cost) || cost < 0) {
      return NextResponse.json({ error: 'Pack cost must be a positive amount' }, { status: 400 });
    }
    updatePayload.pack_cost = cost;
  } else {
    updatePayload.pack_cost = null;
  }

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