'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/clientApi';
import { formatMoney, toLocalDateString } from '@/lib/format';
import { roundMoney, type GcashTier } from '@/lib/gcash';
import { Badge, Button, Card, EmptyState, Input } from '@/components/ui';

type GcashTxn = {
  id: number;
  type: 'cashin' | 'cashout';
  amount: number;
  fee: number;
  customer_name: string | null;
  note: string | null;
  created_at: string;
};

const fmtP = formatMoney;

const emptyTier = () => ({ id: 'new', min_amount: '', max_amount: '', fee: '' });

export default function GcashPage() {
  const [tiers, setTiers] = useState<GcashTier[]>([]);
  const [ranges, setRanges] = useState<{ [key: string]: { min_amount: string; max_amount: string; fee: string } }>({});
  const [drafts, setDrafts] = useState<ReturnType<typeof emptyTier>[]>([]);
  const [txns, setTxns] = useState<GcashTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, x] = await Promise.all([
        api.get('/api/gcash/tiers'),
        api.get('/api/gcash'),
      ]);
      const tierRows = normalizeTiers(t.data ?? []);
      setTiers(tierRows);
      const rangeMap: Record<string, { min_amount: string; max_amount: string; fee: string }> = {};
      tierRows.forEach((tier) => {
        rangeMap[String(tier.id)] = {
          min_amount: String(tier.min_amount),
          max_amount: String(tier.max_amount),
          fee: String(tier.fee),
        };
      });
      setRanges(rangeMap);
      setTxns((x.data ?? []).map(normalizeTxn));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load GCash data');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function normalizeTxn(t: GcashTxn): GcashTxn {
    return { ...t, amount: Number(t.amount), fee: Number(t.fee) };
  }

  function normalizeTiers(rows: Record<string, unknown>[]): GcashTier[] {
    return rows.map((r) => ({
      id: r.id as number,
      min_amount: Number(r.min_amount),
      max_amount: Number(r.max_amount),
      fee: Number(r.fee),
    }));
  }

  const today = toLocalDateString(new Date());
  const summary = useMemo(() => {
    const todayRows = txns.filter((t) => toLocalDateString(new Date(t.created_at)) === today);
    const byType = {
      cashin: { count: 0, volume: 0, fees: 0 },
      cashout: { count: 0, volume: 0, fees: 0 },
    } as Record<'cashin' | 'cashout', { count: number; volume: number; fees: number }>;
    for (const t of todayRows) {
      const slot = byType[t.type];
      slot.count += 1;
      slot.volume += t.amount;
      slot.fees += t.fee;
    }
    return byType;
  }, [txns, today]);

  function validTier(min: string, max: string, fee: string): boolean {
    const minN = parseFloat(min);
    const maxN = parseFloat(max);
    const feeN = parseFloat(fee);
    return (
      Number.isFinite(minN) &&
      minN >= 0 &&
      Number.isFinite(maxN) &&
      maxN >= minN &&
      Number.isFinite(feeN) &&
      feeN >= 0
    );
  }

  async function addDraft() {
    if (drafts.some((d) => d.min_amount !== '' || d.max_amount !== '' || d.fee !== '')) {
      setMessage('Fill or clear the pending new tier first');
      setIsError(true);
      return;
    }
    setDrafts([emptyTier()]);
    setMessage('');
    setIsError(false);
  }

  async function saveDraft() {
    const d = drafts[0];
    if (!d || !validTier(d.min_amount, d.max_amount, d.fee)) {
      setMessage('Invalid tier — numbers only, min ≤ max, fee ≥ 0');
      setIsError(true);
      return;
    }
    try {
      await api.post('/api/gcash/tiers', {
        min_amount: parseFloat(d.min_amount),
        max_amount: parseFloat(d.max_amount),
        fee: parseFloat(d.fee),
      });
      setDrafts([]);
      setMessage('Tier added');
      setIsError(false);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add tier');
      setIsError(true);
    }
  }

  async function updateTier(id: string | number) {
    const range = ranges[String(id)];
    if (!range || !validTier(range.min_amount, range.max_amount, range.fee)) {
      setMessage('Invalid tier — numbers only, min ≤ max, fee ≥ 0');
      setIsError(true);
      return;
    }
    try {
      await api.put(`/api/gcash/tiers/${id}`, {
        min_amount: parseFloat(range.min_amount),
        max_amount: parseFloat(range.max_amount),
        fee: parseFloat(range.fee),
      });
      setMessage('Tier updated');
      setIsError(false);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to update tier');
      setIsError(true);
    }
  }

  async function deleteTier(id: string) {
    if (!confirm('Delete this fee tier?')) return;
    try {
      await api.del(`/api/gcash/tiers/${id}`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete tier');
      setIsError(true);
    }
  }

  async function removeTxn(id: number) {
    if (!confirm('Delete this GCash transaction?')) return;
    try {
      await api.del(`/api/gcash/${id}`);
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete transaction');
      setIsError(true);
    }
  }

  const msgClass = isError ? 'text-warn' : 'text-ok';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-ink">GCash Service</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="p-4 text-center">
          <p className="text-sub text-sm font-semibold">Cash-In (today)</p>
          <p className="text-xl font-bold text-ink">
            {summary.cashin.count} · {fmtP(summary.cashin.volume)}
          </p>
          <p className="text-ok text-sm font-semibold">Fees {fmtP(summary.cashin.fees)}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sub text-sm font-semibold">Cash-Out (today)</p>
          <p className="text-xl font-bold text-ink">
            {summary.cashout.count} · {fmtP(summary.cashout.volume)}
          </p>
          <p className="text-ok text-sm font-semibold">Fees {fmtP(summary.cashout.fees)}</p>
        </Card>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-ink">Fee Tiers</h2>
          <Button variant="ghost" onClick={addDraft}>
            + Add Tier
          </Button>
        </div>
        <p className="text-sm text-sub">
          The till shows these tiers when logging a cash-in / cash-out. Amounts not covered by any
          row are rejected, and you may charge a higher fee per transaction — never lower.
        </p>

        {loading ? (
          <p className="text-ink">Loading…</p>
        ) : tiers.length === 0 && drafts.length === 0 ? (
          <EmptyState>No fee tiers yet — add your first one above.</EmptyState>
        ) : (
          <div className="overflow-auto max-h-[45vh] pr-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-sub text-xs">
                  <th className="p-2 text-right">Min Amount (₱)</th>
                  <th className="p-2 text-right">Max Amount (₱)</th>
                  <th className="p-2 text-right">Fee (₱)</th>
                  <th className="p-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => {
                  const range = ranges[String(tier.id)] ?? { min_amount: '', max_amount: '', fee: '' };
                  return (
                    <tr key={tier.id} className="border-b border-line text-ink text-sm">
                      <td className="p-2 w-40">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-right"
                          value={range.min_amount}
                          onChange={(e) =>
                            setRanges((prev) => ({
                              ...prev,
                              [String(tier.id)]: { ...range, min_amount: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="p-2 w-40">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-right"
                          value={range.max_amount}
                          onChange={(e) =>
                            setRanges((prev) => ({
                              ...prev,
                              [String(tier.id)]: { ...range, max_amount: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="p-2 w-40">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-right"
                          value={range.fee}
                          onChange={(e) =>
                            setRanges((prev) => ({
                              ...prev,
                              [String(tier.id)]: { ...range, fee: e.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        <Button variant="ok" className="py-1 px-3 text-sm" onClick={() => updateTier(String(tier.id))}>
                          Save
                        </Button>
                        <Button variant="danger" className="py-1 px-3 text-sm ml-2" onClick={() => deleteTier(String(tier.id))}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {drafts.map((d, i) => (
                  <tr key={i} className="border-b border-line text-ink text-sm">
                    <td className="p-2 w-40">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right"
                        placeholder="0.00"
                        value={d.min_amount}
                        onChange={(e) =>
                          setDrafts((prev) => prev.map((row, j) => (j === i ? { ...row, min_amount: e.target.value } : row)))
                        }
                      />
                    </td>
                    <td className="p-2 w-40">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right"
                        placeholder="0.00"
                        value={d.max_amount}
                        onChange={(e) =>
                          setDrafts((prev) => prev.map((row, j) => (j === i ? { ...row, max_amount: e.target.value } : row)))
                        }
                      />
                    </td>
                    <td className="p-2 w-40">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right"
                        placeholder="0.00"
                        value={d.fee}
                        onChange={(e) =>
                          setDrafts((prev) => prev.map((row, j) => (j === i ? { ...row, fee: e.target.value } : row)))
                        }
                      />
                    </td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button className="py-1 px-3 text-sm" onClick={saveDraft}>
                        Save Tier
                      </Button>
                      <Button
                        variant="ghost"
                        className="py-1 px-3 text-sm ml-2"
                        onClick={() => setDrafts([])}
                      >
                        Cancel
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-4 flex flex-col min-h-0">
        <h2 className="text-xl font-bold text-ink mb-3">Transactions</h2>
        {loading ? (
          <p className="text-ink">Loading…</p>
        ) : txns.length === 0 ? (
          <EmptyState>No GCash transactions yet — log them from the till.</EmptyState>
        ) : (
          <div className="overflow-auto max-h-[45vh] pr-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-line text-sub text-xs">
                  <th className="p-2">Type</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-right">Fee</th>
                  <th className="p-2 text-right">Net</th>
                  <th className="p-2">Customer</th>
                  <th className="p-2">When</th>
                  <th className="p-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-b border-line text-ink text-sm">
                    <td className="p-2">
                      <Badge tone={t.type === 'cashout' ? 'purple' : 'ok'}>
                        {t.type === 'cashout' ? 'Cash-Out' : 'Cash-In'}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">{fmtP(t.amount)}</td>
                    <td className="p-2 text-right text-sub">{fmtP(t.fee)}</td>
                    <td className="p-2 text-right font-semibold">
                      {fmtP(roundMoney(t.amount - t.fee))}
                    </td>
                    <td className="p-2 text-sub">{t.customer_name ?? '—'}</td>
                    <td className="p-2 text-sub">
                      {new Date(t.created_at).toLocaleString('en-US')}
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => removeTxn(t.id)}
                        className="text-sub hover:text-warn font-bold"
                        aria-label="Delete"
                      >
                        &times;
                      </button>
                    </td>
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