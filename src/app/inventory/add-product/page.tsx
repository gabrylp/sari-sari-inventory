'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AddProductPage() {
  const [productName, setProductName] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [groceryPrice, setGroceryPrice] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!productName || !sellingPrice || !groceryPrice) {
      setMessage('Please fill in all fields');
      return;
    }

    const { data, error } = await supabase.from('products').insert([
      {
        product_name: productName,
        selling_price: parseFloat(sellingPrice),
        grocery_price: parseFloat(groceryPrice),
      },
    ]);

    if (error) {
      setMessage('Error adding product: ' + error.message);
    } else {
      setMessage('Product added successfully!');
      setProductName('');
      setSellingPrice('');
      setGroceryPrice('');
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full">
      <div className="bg-gray-800 rounded-lg shadow-lg p-10 max-w-md w-full">
        <h1 className="text-4xl font-bold mb-8 text-center text-yellow-400">
          Add Product
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block mb-2 text-gray-300 font-semibold">
              Product Name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="block mb-2 text-gray-300 font-semibold">
              Selling Price
            </label>
            <input
              type="number"
              step="0.01"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Enter selling price"
            />
          </div>

          <div>
            <label className="block mb-2 text-gray-300 font-semibold">
              Grocery Price
            </label>
            <input
              type="number"
              step="0.01"
              value={groceryPrice}
              onChange={(e) => setGroceryPrice(e.target.value)}
              className="w-full px-4 py-3 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Enter grocery price"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 transition-colors duration-300 font-bold py-3 rounded-md text-gray-900"
          >
            Add Product
          </button>
        </form>

        {message && (
          <p className="mt-6 text-center text-yellow-300 font-medium">{message}</p>
        )}
      </div>
    </div>
  );
}
