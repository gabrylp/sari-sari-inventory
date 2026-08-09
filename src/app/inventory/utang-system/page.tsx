'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/clientApi';
import { formatMoney } from '@/lib/format';
import { Badge, Button, Card, EmptyState, Input, Segmented } from '@/components/ui';

type Balance = { id: string; name: string; unpaid_total: number; unpaid_count: number };

type UtangEntry = {
  id: string;
  customer_id: string;
  product_id: string | null;
  product_name?: string;
  quantity: number;
  total_price: number;
  status: 'unpaid' | 'paid';
  created_at: string;
  paid_at: string | null;
};

const fmtP = formatMoney;

export default function UtangSystemPage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<UtangEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid'>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editStatus, setEditStatus] = useState<'unpaid' | 'paid'>('unpaid');

  const fetchBalances = useCallback(async () => {
    try {
      const { data } = await api.get('/api/utang/balances', { ttl: 30000 });
      setBalances(data ?? []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error fetching customers');
      setIsError(true);
    }
  }, []);

  const fetchEntries = useCallback(async (customerId: string) => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ customer_id: customerId });
      if (filterStatus !== 'all') query.set('status', filterStatus);
      const { data } = await api.get(`/api/utang?${query.toString()}`);
      setEntries(data ?? []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error fetching utang entries');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  useEffect(() => {
    if (selectedId) fetchEntries(selectedId);
    else setEntries([]);
  }, [selectedId, fetchEntries]);

  const filters: { value: 'all' | 'unpaid' | 'paid'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'paid', label: 'Paid' },
  ];

  const selectedBalance = balances.find((b) => b.id === selectedId);

  async function addCustomer() {
    if (!newCustomerName.trim()) {
      setMessage('Customer name cannot be empty');
      setIsError(true);
      return;
    }
    try {
      await api.post('/api/customers', { name: newCustomerName.trim() });
      setNewCustomerName('');
      fetchBalances();
      setMessage('Customer added successfully');
      setIsError(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error adding customer');
      setIsError(true);
    }
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Delete this customer and all their utang?')) return;
    try {
      await api.del(`/api/customers/${id}`);
      if (selectedId === id) {
        setSelectedId(null);
        setEntries([]);
      }
      fetchBalances();
      setMessage('Customer deleted');
      setIsError(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error deleting customer');
      setIsError(true);
    }
  }

  async function markPaid(utangId: string) {
    try {
      await api.put(`/api/utang/${utangId}`, { mark_paid: true });
      setMessage('Utang marked as paid and sale recorded');
      setIsError(false);
      fetchEntries(selectedId!);
      fetchBalances();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error marking utang paid');
      setIsError(true);
    }
  }

  async function deleteUtang(utangId: string) {
    if (!confirm('Delete this utang entry?')) return;
    try {
      await api.del(`/api/utang/${utangId}`);
      fetchEntries(selectedId!);
      fetchBalances();
      setMessage('Utang deleted');
      setIsError(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error deleting utang');
      setIsError(true);
    }
  }

  function startEdit(u: UtangEntry) {
    setEditingId(u.id);
    setEditQuantity(u.quantity.toString());
    setEditStatus(u.status);
    setMessage('');
    setIsError(false);
  }

  async function saveEdit() {
    if (!editingId) return;
    const qty = Number(editQuantity);
    if (!qty || qty <= 0) {
      setMessage('Quantity must be positive');
      setIsError(true);
      return;
    }
    try {
      await api.put(`/api/utang/${editingId}`, { quantity: qty, status: editStatus });
      setEditingId(null);
      fetchEntries(selectedId!);
      fetchBalances();
      setMessage('Utang updated');
      setIsError(false);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error updating utang');
      setIsError(true);
    }
  }

  const totalUnpaid = entries
    .filter((u) => u.status === 'unpaid')
    .reduce((sum, u) => sum + Number(u.total_price), 0);

  const msgClass = isError ? 'text-warn' : 'text-ok';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-ink">Utang System</h1>

      <div className="flex gap-2">
        <Input
          className="max-w-xs"
          placeholder="New customer name"
          value={newCustomerName}
          onChange={(e) => setNewCustomerName(e.target.value)}
        />
        <Button onClick={addCustomer}>Add Customer</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {balances.length === 0 ? (
          <EmptyState>No customers yet.</EmptyState>
        ) : (
          balances.map((b) => (
            <Card
              key={b.id}
              className={`p-4 cursor-pointer transition border ${
                selectedId === b.id ? 'border-accent' : 'hover:border-accent'
              }`}
              onClick={() => setSelectedId(b.id)}
            >
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="font-bold text-ink truncate">{b.name}</p>
                  <p className="text-xs text-sub">
                    {b.unpaid_count} utang item{b.unpaid_count === 1 ? '' : 's'}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCustomer(b.id);
                  }}
                  className="text-sub hover:text-warn font-bold px-1"
                  title="Delete customer"
                >
                  &times;
                </button>
              </div>
              <p className={`mt-2 text-xl font-extrabold ${b.unpaid_count > 0 ? 'text-warn' : 'text-ok'}`}>
                {fmtP(b.unpaid_total)}
              </p>
            </Card>
          ))
        )}
      </div>

      {selectedId && (
        <Card className="p-5">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-ink">
              {balances.find((b) => b.id === selectedId)?.name ?? 'Customer'} — {fmtP(totalUnpaid)} unpaid
            </h2>
            <Segmented<'all' | 'unpaid' | 'paid'>
              value={filterStatus}
              onChange={setFilterStatus}
              options={filters}
            />
          </div>

          {loading ? (
            <p className="text-ink">Loading entries…</p>
          ) : entries.length === 0 ? (
            <EmptyState>No utang entries.</EmptyState>
          ) : (
            <div className="overflow-auto max-h-[70vh] pr-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line text-sub text-xs">
                    <th className="p-2">Product</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Created</th>
                    <th className="p-2">Paid</th>
                    <th className="p-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((u) => (
                    <tr key={u.id} className="border-b border-line text-ink text-sm">
                      <td className="p-2 font-semibold">{u.product_name ?? 'Unknown'}</td>
                      <td className="p-2 text-right">
                        {editingId === u.id ? (
                          <Input
                            type="number"
                            min="1"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="w-20 px-2 py-1 text-right"
                          />
                        ) : (
                          u.quantity
                        )}
                      </td>
                      <td className="p-2 text-right">{fmtP(u.total_price)}</td>
                      <td className="p-2">
                        {editingId === u.id ? (
                          <Segmented<'unpaid' | 'paid'>
                            value={editStatus}
                            onChange={setEditStatus}
                            options={[
                              { value: 'unpaid', label: 'Unpaid' },
                              { value: 'paid', label: 'Paid' },
                            ]}
                          />
                        ) : (
                          <Badge tone={u.status === 'paid' ? 'ok' : 'warn'}>{u.status}</Badge>
                        )}
                      </td>
                      <td className="p-2 text-sub">
                        {new Date(u.created_at).toLocaleDateString('en-US')}
                      </td>
                      <td className="p-2 text-sub">
                        {u.paid_at ? new Date(u.paid_at).toLocaleDateString('en-US') : '-'}
                      </td>
                      <td className="p-2 text-right whitespace-nowrap">
                        {editingId === u.id ? (
                          <>
                            <Button variant="ok" className="py-1 px-3 text-sm" onClick={saveEdit}>
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              className="py-1 px-3 text-sm ml-2"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            {u.status === 'unpaid' && (
                              <Button variant="ok" className="py-1 px-3 text-sm" onClick={() => markPaid(u.id)}>
                                Collect
                              </Button>
                            )}
                            <Button variant="ghost" className="py-1 px-3 text-sm ml-2" onClick={() => startEdit(u)}>
                              Edit
                            </Button>
                            <Button variant="danger" className="py-1 px-3 text-sm ml-2" onClick={() => deleteUtang(u.id)}>
                              Delete
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {message && <p className={`text-center font-semibold ${msgClass}`}>{message}</p>}
    </div>
  );
}