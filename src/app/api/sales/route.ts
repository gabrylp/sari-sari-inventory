import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const items = body.items as { product_id: string | number; quantity: number }[] | undefined;
  const paymentMethod = body.payment_method === 'gcash' ? 'gcash' : 'cash';

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  const admin = getAdmin();

  // Resolve products once to validate + compose the receipt.
  const ids = items.map((i) => i.product_id);
  const { data: products, error: productsError } = await admin
    .from('products')
    .select('id, product_name, selling_price, stock_quantity')
    .in('id', ids as never);

  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }

  const productMap = new Map((products ?? []).map((p) => [String(p.id), p]));

  const saleRows: Record<string, unknown>[] = [];
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

    saleRows.push({
      product_id: product.id,
      quantity: qty,
      sale_type: 'sale',
      payment_method: paymentMethod,
    });
    total += product.selling_price * qty;

    // Best-effort stock decrement (tolerates a missing stock_quantity column).
    if (typeof product.stock_quantity === 'number') {
      await admin
        .from('products')
        .update({ stock_quantity: Math.max(0, product.stock_quantity - qty) })
        .eq('id', product.id);
    }
  }

  const { data: inserted, error } = await admin.from('sales').insert(saleRows).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const insertedRows = inserted ?? [];
  const receiptItems = saleRows.map((row) => {
    const product = productMap.get(String(row.product_id));
    return {
      product_id: row.product_id,
      product_name: product?.product_name ?? 'Unknown',
      quantity: row.quantity as number,
      unit_price: product?.selling_price ?? 0,
      total: (product?.selling_price ?? 0) * (row.quantity as number),
    };
  });

  const saleIds = insertedRows.map((r) => String(r.id));
  const createdAt = insertedRows[0]?.created_at ?? new Date().toISOString();

  return NextResponse.json({
    receipt: {
      transaction_id: saleIds.length <= 1 ? saleIds[0] ?? null : `${saleIds[0]}…`,
      sale_ids: saleIds,
      created_at: createdAt,
      payment_method: paymentMethod,
      items: receiptItems,
      total: Number(total.toFixed(2)),
    },
  });
}