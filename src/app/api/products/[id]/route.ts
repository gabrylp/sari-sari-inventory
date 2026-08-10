import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const updatePayload: Record<string, unknown> = {};

  if ('product_name' in body) {
    const productName = String(body.product_name ?? '').trim();
    if (!productName) return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    updatePayload.product_name = productName;
  }

  if ('selling_price' in body) {
    const sellingPrice = Number(body.selling_price);
    if (!Number.isFinite(sellingPrice)) {
      return NextResponse.json({ error: 'Invalid selling price' }, { status: 400 });
    }
    updatePayload.selling_price = sellingPrice;
  }

  if ('grocery_price' in body) {
    const groceryPrice = Number(body.grocery_price);
    if (!Number.isFinite(groceryPrice)) {
      return NextResponse.json({ error: 'Invalid grocery price' }, { status: 400 });
    }
    updatePayload.grocery_price = groceryPrice;
  }

  if ('stock_quantity' in body) {
    const stockQuantity = Number(body.stock_quantity);
    if (body.stock_quantity !== '' && body.stock_quantity !== null && !Number.isNaN(stockQuantity)) {
      updatePayload.stock_quantity = stockQuantity;
    } else {
      updatePayload.stock_quantity = null;
    }
  }

  if ('product_code' in body) {
    const productCode = String(body.product_code ?? '').trim();
    updatePayload.product_code = productCode || null;
  }

  if ('category' in body) {
    const category = String(body.category ?? '').trim();
    updatePayload.category = category || null;
  }

  if ('pieces_per_pack' in body) {
    const piecesPerPack = body.pieces_per_pack;
    if (piecesPerPack !== undefined && piecesPerPack !== null && piecesPerPack !== '') {
      const pieces = Number(piecesPerPack);
      if (!Number.isInteger(pieces) || pieces < 2) {
        return NextResponse.json(
          { error: 'Pieces per pack must be a whole number of at least 2' },
          { status: 400 }
        );
      }
      updatePayload.pieces_per_pack = pieces;
    } else {
      updatePayload.pieces_per_pack = null;
    }
  }

  if ('pack_cost' in body) {
    const packCost = body.pack_cost;
    if (packCost !== undefined && packCost !== null && packCost !== '') {
      const cost = Number(packCost);
      if (!Number.isFinite(cost) || cost < 0) {
        return NextResponse.json({ error: 'Pack cost must be a positive amount' }, { status: 400 });
      }
      updatePayload.pack_cost = cost;
    } else {
      updatePayload.pack_cost = null;
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const admin = getAdmin();

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