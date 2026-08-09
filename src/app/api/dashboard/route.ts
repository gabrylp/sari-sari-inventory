import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

const LOW_STOCK_THRESHOLD = 10;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const startIso = url.searchParams.get('start');
  const endIso = url.searchParams.get('end');

  const admin = getAdmin();

  const [salesResult, stockResult, customersResult, utangResult] = await Promise.all([
    admin
      .from('sales')
      .select('id, product_id, quantity, sale_type, created_at, products(product_name, selling_price)')
      .order('created_at', { ascending: false })
      .limit(10),
    admin
      .from('products')
      .select('id, product_name, stock_quantity')
      .order('stock_quantity', { ascending: true }),
    admin.from('customers').select('id, name'),
    admin.from('utang').select('total_price, status, created_at'),
  ]);

  if (salesResult.error) {
    return NextResponse.json({ error: salesResult.error.message }, { status: 500 });
  }
  if (customersResult.error) {
    return NextResponse.json({ error: customersResult.error.message }, { status: 500 });
  }

  const recentSales = (salesResult.data ?? []).map((s) => {
    const prod = Array.isArray(s.products) ? s.products[0] : s.products;
    return {
      id: s.id,
      product_name: prod?.product_name ?? 'Unknown',
      selling_price: Number(prod?.selling_price ?? 0),
      quantity: s.quantity,
      sale_type: s.sale_type,
      created_at: s.created_at,
    };
  });

  const hasStockColumn = !stockResult.error;
  const allProducts = stockResult.data ?? [];
  const lowStock = hasStockColumn
    ? allProducts.filter(
        (p) =>
          p.stock_quantity !== null &&
          p.stock_quantity !== undefined &&
          Number(p.stock_quantity) <= LOW_STOCK_THRESHOLD
      )
    : [];

  // Today's sales summary (client sends its local day in UTC span).
  const todaySales = (salesResult.data ?? []).filter((s) => {
    if (!startIso || !endIso) return false;
    const ts = new Date(s.created_at).getTime();
    return ts >= new Date(startIso).getTime() && ts < new Date(endIso).getTime();
  });
  const todayCount = todaySales.reduce((sum, s) => sum + s.quantity, 0);
  const todayTotal = todaySales.reduce((sum, s) => {
    const prod = Array.isArray(s.products) ? s.products[0] : s.products;
    return sum + s.quantity * Number(prod?.selling_price ?? 0);
  }, 0);

  // Outstanding utang (all unpaid).
  const allUtang = utangResult.data ?? [];
  const outstandingUtang = allUtang
    .filter((u) => u.status === 'unpaid')
    .reduce((sum, u) => sum + Number(u.total_price ?? 0), 0);

  // Unpaid utang created today.
  const todayUtangTotal = allUtang
    .filter((u) => {
      if (u.status !== 'unpaid' || !startIso || !endIso) return false;
      const ts = new Date(u.created_at).getTime();
      return ts >= new Date(startIso).getTime() && ts < new Date(endIso).getTime();
    })
    .reduce((sum, u) => sum + Number(u.total_price ?? 0), 0);

  return NextResponse.json({
    recentSales,
    lowStock,
    hasStockColumn,
    customerCount: customersResult.data?.length ?? 0,
    today: {
      count: todayCount,
      total: Number(todayTotal.toFixed(2)),
      utang: Number(todayUtangTotal.toFixed(2)),
    },
    outstandingUtang: Number(outstandingUtang.toFixed(2)),
  });
}