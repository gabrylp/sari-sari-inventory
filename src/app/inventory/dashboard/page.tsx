'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/clientApi';
import { formatMoney, saleTypeLabel } from '@/lib/format';
import { Badge, Button, Card, StatCard } from '@/components/ui';

const fmtP = formatMoney;

type RecentSale = {
  id: string;
  product_name: string;
  selling_price: number;
  quantity: number;
  sale_type: string;
  created_at: string;
};

type LowStockItem = { id: number; product_name: string; stock_quantity: number };
type Day = { id: number; date: string; profit: number };

export default function DashboardPage() {
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [hasStockColumn, setHasStockColumn] = useState(false);
  const [today, setToday] = useState({ count: 0, total: 0, utang: 0 });
  const [outstandingUtang, setOutstandingUtang] = useState(0);
  const [profitDays, setProfitDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
    });

    Promise.all([
      api.get(`/api/dashboard?${params.toString()}`),
      api.get('/api/profit'),
    ])
      .then(([d, p]) => {
        setRecentSales(d.recentSales ?? []);
        setLowStock(d.lowStock ?? []);
        setHasStockColumn(d.hasStockColumn ?? false);
        setToday(d.today ?? { count: 0, total: 0, utang: 0 });
        setOutstandingUtang(d.outstandingUtang ?? 0);
        const days: Day[] = (p.data ?? [])
          .slice(0, 7)
          .reverse()
          .map((row: Day) => ({ id: row.id, date: row.date, profit: row.profit }));
        setProfitDays(days);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const maxProfit = useMemo(
    () => Math.max(1, ...profitDays.map((d) => d.profit)),
    [profitDays]
  );

  if (loading) return <p className="text-ink">Loading dashboard…</p>;
  if (error) return <p className="text-warn">Error: {error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-ink">Dashboard</h1>
        <Link href="/inventory">
          <Button>Open POS →</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Sales Today" value={fmtP(today.total)} />
        <StatCard label="Items Sold Today" value={String(today.count)} />
        <StatCard label="Utang Today" value={fmtP(today.utang)} tone="warn" />
        <StatCard label="Outstanding Utang" value={fmtP(outstandingUtang)} tone="ok" />
      </div>

      {lowStock.length > 0 && (
        <Card className="p-4 border-warn/50">
          <h2 className="text-lg font-semibold text-warn mb-3">
            Low Stock Alerts ({lowStock.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStock.map((p) => (
              <div key={p.id} className="flex justify-between bg-card rounded px-3 py-2">
                <span className="text-ink">{p.product_name}</span>
                <span className="text-warn font-semibold">{p.stock_quantity} left</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!hasStockColumn && (
        <div className="bg-yellow-500/10 border border-yellow-500 rounded p-4 text-sm text-ink">
          Stock tracking is inactive. Run <code className="font-mono">supabase/schema.sql</code>{' '}
          to enable low-stock alerts.
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-ink mb-4">Profit — Last 7 Days</h2>
          {profitDays.length === 0 ? (
            <p className="text-sub text-sm">No daily profit records yet. Use Kita Overview to update.</p>
          ) : (
            <div className="flex items-end gap-2 h-44">
              {profitDays.map((d) => (
                <div key={d.id} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-sub">{fmtP(d.profit)}</span>
                  <div
                    className="w-full bg-accent rounded-t"
                    style={{ height: `${Math.max(6, (d.profit / maxProfit) * 110)}px` }}
                    title={`${d.date}: ${fmtP(d.profit)}`}
                  />
                  <span className="text-[10px] text-sub">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-ink">Recent Transactions</h2>
            <Link href="/inventory" className="text-accent text-sm font-semibold hover:underline">
              Log a sale →
            </Link>
          </div>
          {recentSales.length === 0 ? (
            <p className="text-sub text-sm">No transactions yet.</p>
          ) : (
            <div className="overflow-auto max-h-[55vh] pr-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line text-sub text-xs">
                    <th className="p-2">Product</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((s) => (
                    <tr key={s.id} className="border-b border-line text-ink text-sm">
                      <td className="p-2">{s.product_name}</td>
                      <td className="p-2">
                        <Badge tone={s.sale_type === 'utang-paid' ? 'purple' : 'accent'}>
                          {saleTypeLabel(s.sale_type)}
                        </Badge>
                      </td>
                      <td className="p-2 text-right">{s.quantity}</td>
                      <td className="p-2 text-right">{fmtP(s.selling_price * s.quantity)}</td>
                      <td className="p-2 text-right text-sub">
                        {new Date(s.created_at).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}