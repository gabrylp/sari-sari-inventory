'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Product = {
  id: string;
  product_name: string;
  selling_price: number;
};

type Customer = {
  id: string;
  name: string;
};

export default function LogSalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [sortByAZ, setSortByAZ] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggingSaleId, setLoggingSaleId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [saleType, setSaleType] = useState<'sale' | 'utang'>('sale');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, product_name, selling_price');

    if (error) {
      setMessage('Error loading products: ' + error.message);
      setLoading(false);
      return;
    }

    setProducts(data || []);
    setLoading(false);
  }

  async function fetchCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      setMessage('Error loading customers: ' + error.message);
      return;
    }

    setCustomers(data || []);
  }

  const filteredProducts = products
    .filter((p) => p.product_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortByAZ) {
        return a.product_name.localeCompare(b.product_name);
      }
      return 0; // default no specific order
    });

  async function handleLogSale(productId: string) {
    if (!quantity || Number(quantity) <= 0) {
      setMessage('Enter a valid quantity');
      return;
    }

    const qty = Number(quantity);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      setMessage('Product not found');
      return;
    }

    if (saleType === 'sale') {
      const { error } = await supabase.from('sales').insert([
        {
          product_id: productId,
          quantity: qty,
          sale_type: 'sale',
        },
      ]);

      if (error) {
        setMessage('Error logging sale: ' + error.message);
      } else {
        setMessage('Sale logged successfully!');
        resetForm();
      }
    } else {
      if (!selectedCustomerId) {
        setMessage('Select a customer for utang');
        return;
      }

      const totalPrice = qty * product.selling_price;

      const { error } = await supabase.from('utang').insert([
        {
          customer_id: selectedCustomerId,
          product_id: productId,
          quantity: qty,
          total_price: totalPrice,
          status: 'unpaid',
        },
      ]);

      if (error) {
        setMessage('Error logging utang: ' + error.message);
      } else {
        setMessage('Utang logged successfully!');
        resetForm();
      }
    }
  }

  function resetForm() {
    setLoggingSaleId(null);
    setQuantity('');
    setSelectedCustomerId(null);
    setSaleType('sale');
    fetchProducts();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-4xl font-bold mb-6 text-yellow-400">Log Sales</h1>

      <div className="flex mb-4 items-center space-x-4">
        <input
          type="text"
          placeholder="Search product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-md border border-gray-600 bg-gray-800 text-white focus:outline-yellow-400"
        />

        <button
          onClick={() => setSortByAZ(!sortByAZ)}
          className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-md font-semibold hover:bg-yellow-500 transition"
        >
          Sort: {sortByAZ ? 'A-Z' : 'Default'}
        </button>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : (
        <table className="w-full text-left border-collapse bg-gray-800 rounded-md overflow-hidden shadow-lg">
          <thead className="bg-yellow-400 text-gray-900">
            <tr>
              <th className="py-3 px-6">Product Name</th>
              <th className="py-3 px-6">Price</th>
              <th className="py-3 px-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-6 text-gray-400">
                  No products found.
                </td>
              </tr>
            )}

            {filteredProducts.map((product) => (
              <tr key={product.id} className="border-b border-gray-700">
                <td className="py-3 px-6">{product.product_name}</td>
                <td className="py-3 px-6">{product.selling_price.toFixed(2)}</td>
                <td className="py-3 px-6">
                  {loggingSaleId === product.id ? (
                    <div className="flex space-x-2 items-center">
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-20 px-2 py-1 rounded-md bg-gray-700 text-white focus:outline-yellow-400"
                        placeholder="Qty"
                      />

                      <select
                        value={saleType}
                        onChange={(e) => setSaleType(e.target.value as 'sale' | 'utang')}
                        className="px-2 py-1 rounded-md bg-gray-700 text-white focus:outline-yellow-400"
                      >
                        <option value="sale">Sale</option>
                        <option value="utang">Utang</option>
                      </select>

                      {saleType === 'utang' && (
                        <select
                          value={selectedCustomerId || ''}
                          onChange={(e) => setSelectedCustomerId(e.target.value)}
                          className="px-2 py-1 rounded-md bg-gray-700 text-white focus:outline-yellow-400"
                        >
                          <option value="" disabled>
                            Select Customer
                          </option>
                          {customers.map((cust) => (
                            <option key={cust.id} value={cust.id}>
                              {cust.name}
                            </option>
                          ))}
                        </select>
                      )}

                      <button
                        onClick={() => handleLogSale(product.id)}
                        className="bg-yellow-400 px-3 py-1 rounded-md text-gray-900 font-semibold hover:bg-yellow-500 transition"
                      >
                        Save
                      </button>

                      <button
                        onClick={() => {
                          setLoggingSaleId(null);
                          setQuantity('');
                          setSelectedCustomerId(null);
                          setSaleType('sale');
                          setMessage('');
                        }}
                        className="text-gray-400 hover:text-yellow-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setLoggingSaleId(product.id);
                        setQuantity('');
                        setSaleType('sale');
                        setSelectedCustomerId(null);
                        setMessage('');
                      }}
                      className="bg-yellow-400 px-4 py-1 rounded-md text-gray-900 font-semibold hover:bg-yellow-500 transition"
                    >
                      Log Sale / Utang
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {message && (
        <p className="mt-4 text-center text-yellow-300 font-semibold">{message}</p>
      )}
    </div>
  );
}
