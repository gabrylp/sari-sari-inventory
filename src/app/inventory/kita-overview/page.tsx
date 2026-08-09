'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/clientApi';
import { formatMoney, toLocalDateString } from '@/lib/format';
import { Button, Card, EmptyState, Select, StatCard } from '@/components/ui';

type DailyProfit = { id: number; date: string; profit: number };

const fmtP = formatMoney;

export default function KitaOverview() {
  const [history, setHistory] = useState<DailyProfit[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [month, setMonth] = useState('');
  const [total7DaysProfit, setTotal7DaysProfit] = useState(0);
  const [profitToday, setProfitToday] = useState(0);

  const fetchProfitData = useCallback(async (defaultMonth?: string) => {
    setLoading(true);
    setMessage('');
    setIsError(false);
    try {
      const { data } = await api.get('/api/profit');
      const rows: DailyProfit[] = data ?? [];
      setHistory(rows);

      const todayStr = toLocalDateString(new Date());
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const last7 = rows.filter((d) => {
        const [y, m, day] = d.date.split('-').map(Number);
        const past = new Date(y, m - 1, day);
        const diffDays = Math.floor((startOfToday.getTime() - past.getTime()) / 86_400_000);
        return diffDays >= 0 && diffDays < 7;
      });
      setTotal7DaysProfit(last7.reduce((s, d) => s + d.profit, 0));
      setProfitToday(rows.find((d) => d.date === todayStr)?.profit ?? 0);

      if (!defaultMonth && rows.length > 0) setMonth(rows[0].date.slice(0, 7));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error loading profit data');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfitData();
  }, [fetchProfitData]);

  const months = useMemo(() => {
    const set = new Set<string>();
    history.forEach((d) => set.add(d.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [history]);

  const monthDays = useMemo(() => {
    if (!month) return [];
    return history.filter((d) => d.date.startsWith(month)).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [history, month]);
  const monthTotal = monthDays.reduce((s, d) => s + d.profit, 0);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function toggleSelectAll() {
    if (selectedIds.length === monthDays.length && monthDays.length > 0) setSelectedIds([]);
    else setSelectedIds(monthDays.map((d) => d.id));
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) {
      setMessage('No entries selected for deletion.');
      setIsError(true);
      return;
    }
    setLoading(true);
    setMessage('');
    setIsError(false);
    try {
      await api.post('/api/profit', { action: 'delete', ids: selectedIds });
      setMessage('Selected entries deleted.');
      setSelectedIds([]);
      fetchProfitData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error deleting entries');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfit() {
    setLoading(true);
    setMessage('');
    setIsError(false);
    try {
      await api.post('/api/profit', { action: 'update' });
      setMessage('Daily profit updated successfully!');
      fetchProfitData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error updating profit');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }

  const msgClass = isError ? 'text-warn' : 'text-ok';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-ink">Kita Overview</h1>
        <Button disabled={loading} onClick={handleUpdateProfit}>
          {loading ? 'Updating…' : 'Update Profit'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Profit (Last 7 Days)" value={fmtP(total7DaysProfit)} />
        <StatCard label="Profit Today" value={fmtP(profitToday)} />
        {month && <StatCard label={`${month} Total`} value={fmtP(monthTotal)} tone="ok" />}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold text-ink">Profit History</h2>
          <Select value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </div>

        {monthDays.length > 0 && (
          <div className="flex items-end gap-2 h-32 mb-6">
            {monthDays.map((d) => (
              <div key={d.id} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${fmtP(d.profit)}`}>
                <span className="text-[10px] text-sub">{fmtP(d.profit)}</span>
                <div
                  className="w-full bg-accent rounded-t"
                  style={{
                    height: `${Math.max(
                      4,
                      (d.profit / Math.max(1, ...monthDays.map((x) => x.profit))) * 80
                    )}px`,
                  }}
                />
                <span className="text-[10px] text-sub">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mb-2">
          <button
            onClick={toggleSelectAll}
            className="text-accent underline text-sm font-semibold hover:text-ink"
          >
            {selectedIds.length === monthDays.length && monthDays.length > 0
              ? 'Deselect All'
              : 'Select All'}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={loading || selectedIds.length === 0}
            className="text-warn font-bold text-sm disabled:opacity-40"
          >
            Delete Selected ({selectedIds.length})
          </button>
        </div>

        {monthDays.length === 0 ? (
          <EmptyState>No profit records for this month.</EmptyState>
        ) : (
          <div className="overflow-auto max-h-[70vh] pr-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-sub text-xs">
                  <th className="p-2 w-10"></th>
                  <th className="p-2">Date</th>
                  <th className="p-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {monthDays.map((d) => (
                  <tr
                    key={d.id}
                    className={`border-b border-line text-ink text-sm cursor-pointer hover:bg-card ${
                      selectedIds.includes(d.id) ? 'bg-accent/10' : ''
                    }`}
                    onClick={() => toggleSelect(d.id)}
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(d.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelect(d.id);
                        }}
                        className="w-4 h-4 accent-accent"
                      />
                    </td>
                    <td className="p-2">{d.date}</td>
                    <td className="p-2 text-right">{fmtP(d.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {message && <p className={`text-center font-semibold ${msgClass}`}>{message}</p>}
    </div>
  );
}