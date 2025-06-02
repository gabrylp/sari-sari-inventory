'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Customer = {
  id: string;
  name: string;
  created_at: string;
};

type UtangEntry = {
  id: string;
  product_id: string | null;
  product_name?: string;
  quantity: number;
  total_price: number;
  status: 'unpaid' | 'paid';
  created_at: string;
  paid_at: string | null;
};

type Product = {
  id: string;
  product_name: string;
};

export default function UtangSystemPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [utangEntries, setUtangEntries] = useState<UtangEntry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid'>('all');

  // For editing utang
  const [editingUtangId, setEditingUtangId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editStatus, setEditStatus] = useState<'unpaid' | 'paid'>('unpaid');

  // Fetch all customers
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  // Fetch utang entries when selected customer or filter changes
  useEffect(() => {
    if (selectedCustomerId) {
      fetchUtangEntries(selectedCustomerId);
    } else {
      setUtangEntries([]);
    }
  }, [selectedCustomerId, filterStatus]);

  async function fetchCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, created_at')
      .order('name', { ascending: true });

    if (error) {
      setMessage('Error fetching customers: ' + error.message);
      return;
    }

    setCustomers(data || []);
  }

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('id, product_name');

    if (error) {
      setMessage('Error fetching products: ' + error.message);
      return;
    }

    setProducts(data || []);
  }

  async function fetchUtangEntries(customerId: string) {
    setLoading(true);

    let query = supabase
      .from('utang')
      .select(
  `
    id,
    product_id,
    quantity,
    total_price,
    status,
    created_at,
    paid_at,
    products!inner(product_name)
  `
)
      .eq('customer_id', customerId);

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;

    if (error) {
      setMessage('Error fetching utang entries: ' + error.message);
      setLoading(false);
      return;
    }

    // Map product_name from joined products table
    const utangWithProductNames = (data || []).map((u) => ({
  id: u.id,
  product_id: u.product_id,
  product_name: u.products[0]?.product_name ?? 'Unknown',
  quantity: u.quantity,
  total_price: u.total_price,
  status: u.status,
  created_at: u.created_at,
  paid_at: u.paid_at,
}));


    setUtangEntries(utangWithProductNames);
    setLoading(false);
  }

  async function addCustomer() {
    if (!newCustomerName.trim()) {
      setMessage('Customer name cannot be empty');
      return;
    }
    const { data, error } = await supabase
      .from('customers')
      .insert([{ name: newCustomerName.trim() }])
      .select();

    if (error) {
      setMessage('Error adding customer: ' + error.message);
      return;
    }

    setNewCustomerName('');
    fetchCustomers();
    setMessage('Customer added successfully');
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Are you sure you want to delete this customer and all their utang?')) return;

    const { error } = await supabase.from('customers').delete().eq('id', id);

    if (error) {
      setMessage('Error deleting customer: ' + error.message);
      return;
    }

    if (selectedCustomerId === id) {
      setSelectedCustomerId(null);
      setUtangEntries([]);
    }

    fetchCustomers();
    setMessage('Customer deleted');
  }

  async function markUtangPaid(utangId: string) {
    // Update utang status and paid_at
    const now = new Date().toISOString();

    const { data: utangData, error: fetchUtangError } = await supabase
      .from('utang')
      .select('*')
      .eq('id', utangId)
      .single();

    if (fetchUtangError) {
      setMessage('Error fetching utang: ' + fetchUtangError.message);
      return;
    }

    if (utangData.status === 'paid') {
      setMessage('Utang already paid');
      return;
    }

    const { error } = await supabase
      .from('utang')
      .update({ status: 'paid', paid_at: now })
      .eq('id', utangId);

    if (error) {
      setMessage('Error marking utang paid: ' + error.message);
      return;
    }

    // Optionally, add a sale record for paid utang
    const { error: saleError } = await supabase.from('sales').insert([
      {
        product_id: utangData.product_id,
        quantity: utangData.quantity,
        sale_type: 'utang-paid',
      },
    ]);

    if (saleError) {
      setMessage('Utang marked paid but failed to add sale: ' + saleError.message);
    } else {
      setMessage('Utang marked as paid and sale recorded');
    }

    fetchUtangEntries(selectedCustomerId!);
  }

  async function deleteUtang(utangId: string) {
    if (!confirm('Are you sure you want to delete this utang entry?')) return;

    const { error } = await supabase.from('utang').delete().eq('id', utangId);

    if (error) {
      setMessage('Error deleting utang: ' + error.message);
      return;
    }

    fetchUtangEntries(selectedCustomerId!);
    setMessage('Utang deleted');
  }

  function startEditUtang(utang: UtangEntry) {
    setEditingUtangId(utang.id);
    setEditQuantity(utang.quantity.toString());
    setEditStatus(utang.status);
    setMessage('');
  }

  async function saveEditUtang() {
    if (!editingUtangId) return;
    const qtyNum = Number(editQuantity);
    if (!qtyNum || qtyNum <= 0) {
      setMessage('Quantity must be a positive number');
      return;
    }

    const updateData: any = { quantity: qtyNum, status: editStatus };
    if (editStatus === 'paid') {
      updateData.paid_at = new Date().toISOString();
    } else {
      updateData.paid_at = null;
    }

    const { error } = await supabase.from('utang').update(updateData).eq('id', editingUtangId);

    if (error) {
      setMessage('Error updating utang: ' + error.message);
      return;
    }

    setEditingUtangId(null);
    fetchUtangEntries(selectedCustomerId!);
    setMessage('Utang updated');
  }

  function cancelEdit() {
    setEditingUtangId(null);
    setMessage('');
  }

  // Calculate total unpaid
  const totalUnpaid = utangEntries
    .filter((u) => u.status === 'unpaid')
    .reduce((sum, u) => sum + Number(u.total_price), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold mb-6 text-yellow-400">Utang System</h1>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2 text-yellow-300">Customers</h2>
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            placeholder="New customer name"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            className="px-4 py-2 rounded-md bg-gray-800 text-white border border-gray-600 focus:outline-yellow-400"
          />
          <button
            onClick={addCustomer}
            className="bg-yellow-400 px-4 py-2 rounded-md font-semibold text-gray-900 hover:bg-yellow-500 transition"
          >
            Add Customer
          </button>
        </div>

        <ul className="max-h-40 overflow-auto border border-gray-700 rounded-md bg-gray-800 text-white">
          {customers.map((cust) => (
            <li
              key={cust.id}
              className={`cursor-pointer px-4 py-2 flex justify-between items-center hover:bg-yellow-400 hover:text-gray-900 transition ${
                selectedCustomerId === cust.id ? 'bg-yellow-400 text-gray-900 font-semibold' : ''
              }`}
              onClick={() => setSelectedCustomerId(cust.id)}
            >
              <span>{cust.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCustomer(cust.id);
                }}
                className="text-red-600 hover:text-red-400 font-bold"
                title="Delete customer"
              >
                &times;
              </button>
            </li>
          ))}
          {customers.length === 0 && (
            <li className="px-4 py-2 text-gray-400">No customers found.</li>
          )}
        </ul>
      </div>

      {selectedCustomerId && (
        <>
          <h2 className="text-2xl font-semibold mb-2 text-yellow-300">
            Utang Entries for{' '}
            {customers.find((c) => c.id === selectedCustomerId)?.name || ''}
          </h2>

          <div className="mb-4">
            <label className="mr-4 text-white font-semibold">Filter Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-1 rounded-md bg-gray-800 text-white border border-gray-600 focus:outline-yellow-400"
            >
              <option value="all">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {loading ? (
            <p className="text-white">Loading utang entries...</p>
          ) : (
            <table className="w-full text-left border-collapse bg-gray-800 rounded-md overflow-hidden shadow-lg">
              <thead className="bg-yellow-400 text-gray-900">
                <tr>
                  <th className="py-3 px-6">Product</th>
                  <th className="py-3 px-6">Quantity</th>
                  <th className="py-3 px-6">Total Price</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Created At</th>
                  <th className="py-3 px-6">Paid At</th>
                  <th className="py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {utangEntries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-400">
                      No utang entries found.
                    </td>
                  </tr>
                )}

                {utangEntries.map((u) => (
                  <tr key={u.id} className="border-b border-gray-700">
                    <td className="py-3 px-6">{u.product_name || 'Unknown'}</td>

                    <td className="py-3 px-6">
                      {editingUtangId === u.id ? (
                        <input
                          type="number"
                          min="1"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="w-20 px-2 py-1 rounded-md bg-gray-700 text-white focus:outline-yellow-400"
                        />
                      ) : (
                        u.quantity
                      )}
                    </td>

                    <td className="py-3 px-6">{u.total_price.toFixed(2)}</td>

                    <td className="py-3 px-6">
                      {editingUtangId === u.id ? (
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as 'paid' | 'unpaid')}
                          className="px-2 py-1 rounded-md bg-gray-700 text-white focus:outline-yellow-400"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                        </select>
                      ) : (
                        u.status
                      )}
                    </td>

                    <td className="py-3 px-6">
                      {new Date(u.created_at).toLocaleDateString('en-US')}
                    </td>

                    <td className="py-3 px-6">
                      {u.paid_at ? new Date(u.paid_at).toLocaleDateString('en-US') : '-'}
                    </td>

                    <td className="py-3 px-6 space-x-2">
                      {editingUtangId === u.id ? (
                        <>
                          <button
                            onClick={saveEditUtang}
                            className="bg-yellow-400 px-3 py-1 rounded-md text-gray-900 font-semibold hover:bg-yellow-500 transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-400 hover:text-yellow-400"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {u.status === 'unpaid' && (
                            <button
                              onClick={() => markUtangPaid(u.id)}
                              className="bg-green-600 px-3 py-1 rounded-md text-white font-semibold hover:bg-green-700 transition"
                            >
                              Mark Paid
                            </button>
                          )}
                          <button
                            onClick={() => startEditUtang(u)}
                            className="bg-yellow-400 px-3 py-1 rounded-md text-gray-900 font-semibold hover:bg-yellow-500 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteUtang(u.id)}
                            className="bg-red-600 px-3 py-1 rounded-md text-white font-semibold hover:bg-red-700 transition"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-4 text-yellow-400 font-semibold text-lg">
            Total Unpaid: ₱{totalUnpaid.toFixed(2)}
          </div>
        </>
      )}

      {message && (
        <p className="mt-6 text-center text-yellow-300 font-semibold">{message}</p>
      )}
    </div>
  );
}
