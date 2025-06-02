'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type DailyProfit = {
  id: number;
  date: string; // YYYY-MM-DD
  profit: number;
};

export default function KitaOverview() {
  const [profitHistory, setProfitHistory] = useState<DailyProfit[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [total7DaysProfit, setTotal7DaysProfit] = useState(0);
  const [profitToday, setProfitToday] = useState(0);

  // Fetch profit history and summary on mount
  useEffect(() => {
    fetchProfitData();
  }, []);

  async function fetchProfitData() {
    setLoading(true);
    setMessage('');

    try {
      // Fetch all profit records ordered by date descending
      let { data, error } = await supabase
        .from('daily_profit')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (!data) data = [];

      setProfitHistory(data);

      // Calculate total profit for past 7 days and today
      const todayStr = new Date().toISOString().slice(0, 10);

      // Filter last 7 days including today (assuming data.date format 'YYYY-MM-DD')
      const last7Days = data.filter((d) => {
        const dDate = new Date(d.date);
        const now = new Date();
        const diffDays = (now.getTime() - dDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays < 7;
      });

      const total7 = last7Days.reduce((sum, day) => sum + day.profit, 0);
      setTotal7DaysProfit(total7);

      const todayProfitRecord = data.find((d) => d.date === todayStr);
      setProfitToday(todayProfitRecord?.profit || 0);
    } catch (error: any) {
      setMessage('Error loading profit data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Select or deselect profit entry by id
  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  // Delete selected profit entries
  async function handleDeleteSelected() {
    if (selectedIds.length === 0) {
      setMessage('No entries selected for deletion.');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase
      .from('daily_profit')
      .delete()
      .in('id', selectedIds);

    if (error) {
      setMessage('Error deleting entries: ' + error.message);
    } else {
      setMessage('Selected entries deleted.');
      setSelectedIds([]);
      fetchProfitData();
    }

    setLoading(false);
  }

  // RPC call to update daily profit
  async function handleUpdateProfit() {
    setLoading(true);
    setMessage('');

    const { error } = await supabase.rpc('update_daily_profit');

    if (error) {
      setMessage('Error updating profit: ' + error.message);
    } else {
      setMessage('Daily profit updated successfully!');
      fetchProfitData();
    }

    setLoading(false);
  }

  // Select all entries toggle
  function toggleSelectAll() {
    if (selectedIds.length === profitHistory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(profitHistory.map((p) => p.id));
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-6 text-yellow-400">Kita Overview</h1>

      {/* Summary cards */}
      <div className="flex justify-between mb-8 space-x-4">
        <div className="bg-gray-800 p-6 rounded shadow flex-1 text-center">
          <p className="text-gray-400 font-semibold mb-2">Total Profit (Last 7 Days)</p>
          <p className="text-3xl font-bold text-yellow-400">
            ₱{total7DaysProfit.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800 p-6 rounded shadow flex-1 text-center">
          <p className="text-gray-400 font-semibold mb-2">Profit Today</p>
          <p className="text-3xl font-bold text-yellow-400">₱{profitToday.toFixed(2)}</p>
        </div>
        <div className="flex items-center">
          <button
            onClick={handleUpdateProfit}
            disabled={loading}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold px-6 py-3 rounded"
          >
            {loading ? 'Updating...' : 'Update Profit'}
          </button>
        </div>
      </div>

      {/* Profit History Table */}
      <div className="bg-gray-800 rounded shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-yellow-400">Profit History</h2>
          <button
            onClick={toggleSelectAll}
            className="text-yellow-400 underline hover:text-yellow-300"
          >
            {selectedIds.length === profitHistory.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={selectedIds.length === profitHistory.length && profitHistory.length > 0}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-3">Date</th>
              <th className="p-3 text-right">Profit (₱)</th>
            </tr>
          </thead>
          <tbody>
            {profitHistory.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-400">
                  No profit records found.
                </td>
              </tr>
            )}
            {profitHistory.map(({ id, date, profit }) => (
              <tr
                key={id}
                className={`border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${
                  selectedIds.includes(id) ? 'bg-yellow-700/30' : ''
                }`}
                onClick={() => toggleSelect(id)}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(id);
                    }}
                  />
                </td>
                <td className="p-3">{date}</td>
                <td className="p-3 text-right">₱{profit.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          onClick={handleDeleteSelected}
          disabled={loading || selectedIds.length === 0}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded disabled:opacity-50"
        >
          Delete Selected
        </button>

        {message && <p className="mt-4 text-yellow-400">{message}</p>}
      </div>
    </div>
  );
}
