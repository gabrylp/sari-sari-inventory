'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Product {
  id: number;
  product_name: string;
  selling_price: number;
  grocery_price: number;
}

export default function ManageProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Product;
    direction: 'ascending' | 'descending';
  } | null>(null);

  // Form states for edit
  const [formProduct, setFormProduct] = useState<Omit<Product, 'id'> & { id?: number }>({
    product_name: '',
    selling_price: 0,
    grocery_price: 0,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Track selected products for bulk delete
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const allSelected = filteredProducts.length > 0 && selectedIds.length === filteredProducts.length;

  async function fetchProducts() {
    setLoading(true);
    const { data, error } = await supabase.from('products').select('*');
    if (error) setError(error.message);
    else {
      setProducts(data || []);
      setFilteredProducts(data || []);
    }
    setLoading(false);
    setSelectedIds([]); // Reset selection after fetch
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  // Apply search filter whenever searchTerm changes
  useEffect(() => {
    const filtered = products.filter(product =>
      product.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  // Handle sorting
  const requestSort = (key: keyof Product) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });

    const sortedProducts = [...filteredProducts].sort((a, b) => {
      if (a[key] < b[key]) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
    setFilteredProducts(sortedProducts);
  };

  // Get sort indicator for table headers
  const getSortIndicator = (key: keyof Product) => {
    if (!sortConfig || sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormProduct((prev) => ({
      ...prev,
      [name]: name.includes('price') ? parseFloat(value) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { product_name, selling_price, grocery_price, id } = formProduct;

    if (!product_name || !selling_price || !grocery_price) {
      setMessage('Please fill in all fields');
      return;
    }

    if (isEditing && id) {
      const { error } = await supabase
        .from('products')
        .update({
          product_name,
          selling_price,
          grocery_price,
        })
        .eq('id', id);

      if (error) setMessage('Error updating product: ' + error.message);
      else {
        setMessage('Product updated successfully!');
        setIsEditing(false);
        setFormProduct({ product_name: '', selling_price: 0, grocery_price: 0 });
        fetchProducts();
      }
    }
  }

  function handleEdit(product: Product) {
    setIsEditing(true);
    setFormProduct(product);
    setMessage(null);
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) setMessage('Error deleting product: ' + error.message);
    else {
      setMessage('Product deleted successfully!');
      fetchProducts();
    }
  }

  // Handle select checkbox change per row
  function handleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  }

  // Handle select all toggle
  function handleSelectAll() {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(filteredProducts.map((p) => p.id));
  }

  // Delete all selected products
  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected product(s)?`)) return;

    const { error } = await supabase.from('products').delete().in('id', selectedIds);
    if (error) setMessage('Error deleting selected products: ' + error.message);
    else {
      setMessage('Selected products deleted successfully!');
      fetchProducts();
    }
  }

  // Delete all products in table
  async function handleDeleteAll() {
    if (!confirm('Are you sure you want to delete ALL products? This cannot be undone.')) return;

    const { error } = await supabase.from('products').delete().neq('id', 0);
    if (error) setMessage('Error deleting all products: ' + error.message);
    else {
      setMessage('All products deleted successfully!');
      fetchProducts();
    }
  }

  if (loading) return <p className="text-yellow-400">Loading products...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg text-white">
      <h1 className="text-3xl font-bold mb-6 text-yellow-400">
        Manage Products
      </h1>

      {/* Search and Sort Controls */}
      <div className="flex justify-between mb-6">
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <svg
            className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => requestSort('product_name')}
            className="flex items-center bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md transition"
          >
            Sort by Name {getSortIndicator('product_name')}
          </button>
          <button
            onClick={() => requestSort('selling_price')}
            className="flex items-center bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-md transition"
          >
            Sort by Price {getSortIndicator('selling_price')}
          </button>
        </div>
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="mb-8 bg-gray-700 p-6 rounded-md shadow-md max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-yellow-300">Edit Product</h2>

          <div className="mb-4">
            <label className="block mb-1 font-semibold">Product Name</label>
            <input
              type="text"
              name="product_name"
              value={formProduct.product_name}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Product name"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-semibold">Selling Price</label>
            <input
              type="number"
              step="0.01"
              name="selling_price"
              value={formProduct.selling_price}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Selling price"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-1 font-semibold">Grocery Price</label>
            <input
              type="number"
              step="0.01"
              name="grocery_price"
              value={formProduct.grocery_price}
              onChange={handleChange}
              className="w-full p-2 rounded bg-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              placeholder="Grocery price"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-yellow-400 hover:bg-yellow-500 font-bold py-3 rounded-md text-gray-900 transition"
          >
            Update Product
          </button>

          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setFormProduct({ product_name: '', selling_price: 0, grocery_price: 0 });
              setMessage(null);
            }}
            className="w-full mt-3 bg-gray-600 hover:bg-gray-700 font-bold py-3 rounded-md text-yellow-400 transition"
          >
            Cancel
          </button>

          {message && (
            <p className="mt-4 text-center text-yellow-300 font-medium">{message}</p>
          )}
        </form>
      )}

      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={handleDeleteSelected}
          disabled={selectedIds.length === 0}
          className={`bg-red-600 hover:bg-red-700 font-bold py-2 px-4 rounded-md text-white transition ${
            selectedIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Delete Selected ({selectedIds.length})
        </button>

        <button
          onClick={handleDeleteAll}
          disabled={products.length === 0}
          className={`bg-red-800 hover:bg-red-900 font-bold py-2 px-4 rounded-md text-white transition ${
            products.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          Delete All
        </button>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {searchTerm ? 'No products match your search.' : 'No products found.'}
        </div>
      ) : (
        <table className="w-full table-auto text-left border-collapse border border-gray-700">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-4 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  className="w-5 h-5 text-yellow-400 rounded"
                />
              </th>
              <th 
                className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                onClick={() => requestSort('product_name')}
              >
                <div className="flex items-center">
                  Product Name
                  <span className="ml-1 text-yellow-400">
                    {getSortIndicator('product_name')}
                  </span>
                </div>
              </th>
              <th 
                className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                onClick={() => requestSort('selling_price')}
              >
                <div className="flex items-center">
                  Selling Price
                  <span className="ml-1 text-yellow-400">
                    {getSortIndicator('selling_price')}
                  </span>
                </div>
              </th>
              <th 
                className="px-4 py-2 cursor-pointer hover:bg-gray-700"
                onClick={() => requestSort('grocery_price')}
              >
                <div className="flex items-center">
                  Grocery Price
                  <span className="ml-1 text-yellow-400">
                    {getSortIndicator('grocery_price')}
                  </span>
                </div>
              </th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const isSelected = selectedIds.includes(product.id);
              return (
                <tr key={product.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelect(product.id)}
                      className="w-5 h-5 text-yellow-400 rounded"
                    />
                  </td>
                  <td className="px-4 py-2">{product.product_name}</td>
                  <td className="px-4 py-2">₱{product.selling_price.toFixed(2)}</td>
                  <td className="px-4 py-2">₱{product.grocery_price.toFixed(2)}</td>
                  <td className="px-4 py-2 space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}