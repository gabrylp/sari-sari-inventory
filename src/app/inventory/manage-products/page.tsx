'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/clientApi';
import { formatMoney } from '@/lib/format';
import { Badge, Button, Card, EmptyState, Input, Modal } from '@/components/ui';

type Product = {
  id: number;
  product_name: string;
  product_code?: string | null;
  category?: string | null;
  selling_price: number;
  grocery_price: number;
  stock_quantity?: number | null;
  pieces_per_pack?: number | null;
  pack_cost?: number | null;
  bought_count?: number | null;
};

type SortConfig = { key: keyof Product; direction: 'ascending' | 'descending' };

const LOW_STOCK_THRESHOLD = 10;
const fmtP = formatMoney;

const emptyForm = {
  product_name: '',
  product_code: '',
  category: '',
  selling_price: 0,
  grocery_price: 0,
  stock_quantity: '',
  pieces_per_pack: '',
  pack_cost: '',
};

export default function ManageProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'bought_count',
    direction: 'descending',
  });
  const [onlyLow, setOnlyLow] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/products');
      setProducts(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
      setSelectedIds([]);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = products.filter((p) => {
      const matchesSearch =
        !term ||
        p.product_name.toLowerCase().includes(term) ||
        (p.product_code ?? '').toLowerCase().includes(term);
      const matchesLow =
        !onlyLow ||
        (typeof p.stock_quantity === 'number' && p.stock_quantity <= LOW_STOCK_THRESHOLD);
      return matchesSearch && matchesLow;
    });

    if (!sortConfig) return filtered;

    const { key, direction } = sortConfig;
    const dir = direction === 'ascending' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const aVal = (a[key] ?? '') as never;
      const bVal = (b[key] ?? '') as never;
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      // Ties: frequently-bought first gets alphabetical order.
      return a.product_name.localeCompare(b.product_name);
    });
  }, [products, searchTerm, sortConfig, onlyLow]);

  const allSelected = filteredProducts.length > 0 && selectedIds.length === filteredProducts.length;

  const requestSort = (key: keyof Product) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev?.key === key
          ? prev.direction === 'ascending'
            ? 'descending'
            : 'ascending'
          : key === 'id'
            ? 'descending'
            : 'ascending',
    }));
  };

  const sortIndicator = (key: keyof Product) =>
    sortConfig?.key === key ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '↕';

  function openEdit(product: Product) {
    setEditProduct(product);
    setForm({
      product_name: product.product_name,
      product_code: product.product_code ?? '',
      category: product.category ?? '',
      selling_price: product.selling_price,
      grocery_price: product.grocery_price,
      stock_quantity: product.stock_quantity === null || product.stock_quantity === undefined
        ? ''
        : String(product.stock_quantity),
      pieces_per_pack:
        product.pieces_per_pack === null || product.pieces_per_pack === undefined
          ? ''
          : String(product.pieces_per_pack),
      pack_cost:
        product.pack_cost === null || product.pack_cost === undefined ? '' : String(product.pack_cost),
    });
    setMessage(null);
  }

  function setPackPieces(v: string) {
    setForm((prev) => {
      const pieces = Number(v);
      const cost = Number(prev.pack_cost);
      const grocery =
        v && prev.pack_cost && pieces >= 2 && cost > 0 ? (cost / pieces).toFixed(2) : prev.grocery_price;
      return { ...prev, pieces_per_pack: v, grocery_price: Number(grocery) };
    });
  }

  function setPackCost(v: string) {
    setForm((prev) => {
      const pieces = Number(prev.pieces_per_pack);
      const cost = Number(v);
      const grocery =
        prev.pieces_per_pack && v && pieces >= 2 && cost > 0 ? (cost / pieces).toFixed(2) : prev.grocery_price;
      return { ...prev, pack_cost: v, grocery_price: Number(grocery) };
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editProduct) return;

    if (!form.product_name || !form.selling_price || !form.grocery_price) {
      setMessage({ text: 'Please fill in all fields', isError: true });
      return;
    }

    try {
      await api.put(`/api/products/${editProduct.id}`, {
        product_name: form.product_name,
        product_code: form.product_code || null,
        category: form.category || null,
        selling_price: Number(form.selling_price),
        grocery_price: Number(form.grocery_price),
        stock_quantity: form.stock_quantity === '' ? null : Number(form.stock_quantity),
        pieces_per_pack: form.pieces_per_pack === '' ? null : Number(form.pieces_per_pack),
        pack_cost: form.pack_cost === '' ? null : Number(form.pack_cost),
      });
      setMessage({ text: 'Product updated successfully!', isError: false });
      setEditProduct(null);
      setForm(emptyForm);
      fetchProducts();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Error updating product', isError: true });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.del(`/api/products/${id}`);
      setMessage({ text: 'Product deleted successfully!', isError: false });
      fetchProducts();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Error deleting product', isError: true });
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(filteredProducts.map((p) => p.id));
  }

  async function deleteSelected() {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected product(s)?`)) return;
    try {
      await api.del('/api/products', { ids: selectedIds });
      setMessage({ text: 'Selected products deleted!', isError: false });
      fetchProducts();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Delete failed', isError: true });
    }
  }

  async function deleteAll() {
    if (!confirm('Delete ALL products? This cannot be undone.')) return;
    try {
      await api.del('/api/products', { all: true });
      setMessage({ text: 'All products deleted!', isError: false });
      fetchProducts();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Delete failed', isError: true });
    }
  }

  if (loading) return <p className="text-ink">Loading products…</p>;
  if (error) return <p className="text-warn">Error: {error}</p>;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex justify-between items-start mb-6">
        <h1 className="text-3xl font-bold text-ink">Manage Products</h1>
        <Button variant="ghost" onClick={fetchProducts}>
          Refresh
        </Button>
      </div>

      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded-md font-medium ${
            message.isError ? 'bg-warn/10 text-warn' : 'bg-ok/10 text-ok'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Input
          className="w-64"
          placeholder="Search name or code…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex gap-2">
          {(['bought_count', 'id', 'product_name', 'selling_price', 'stock_quantity'] as const).map((key) => (
            <button
              key={key}
              onClick={() => requestSort(key)}
              className={`px-3 py-2 rounded-md text-sm font-semibold transition ${
                sortConfig?.key === key
                  ? 'bg-accent text-accent-ink'
                  : 'bg-card border border-line text-sub hover:text-ink'
              }`}
            >
              Sort{' '}
              {key === 'product_name'
                ? 'Name'
                : key === 'selling_price'
                  ? 'Price'
                  : key === 'stock_quantity'
                    ? 'Stock'
                    : key === 'id'
                      ? 'Recent'
                      : 'Frequent'}{' '}
              {sortIndicator(key)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOnlyLow((v) => !v)}
          className={`px-3 py-2 rounded-md text-sm font-semibold transition ${
            onlyLow ? 'bg-warn text-warn-ink' : 'bg-card border border-line text-sub hover:text-ink'
          }`}
        >
          Low stock only
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <Button variant="danger" disabled={selectedIds.length === 0} onClick={deleteSelected}>
          Delete Selected ({selectedIds.length})
        </Button>
        <Button variant="danger" disabled={products.length === 0} onClick={deleteAll}>
          Delete All
        </Button>
      </div>

      {filteredProducts.length === 0 ? (
        <EmptyState>{searchTerm ? 'No products match.' : 'No products found.'}</EmptyState>
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-17rem)] pr-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-sub text-sm">
                <th className="p-2 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-accent"
                  />
                </th>
                <th className="p-2">Product</th>
                <th className="p-2">Code</th>
                <th className="p-2">Category</th>
                <th className="p-2 text-right">Pack</th>
                <th className="p-2 text-right">Selling</th>
                <th className="p-2 text-right">Grocery</th>
                <th className="p-2 text-right">Stock</th>
                <th className="p-2 text-right">Sold</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const low =
                  typeof p.stock_quantity === 'number' && p.stock_quantity <= LOW_STOCK_THRESHOLD;
                return (
                  <tr key={p.id} className="border-b border-line text-ink text-sm hover:bg-card">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        className="w-4 h-4 accent-accent"
                      />
                    </td>
                    <td className="p-2 font-semibold">{p.product_name}</td>
                    <td className="p-2 text-sub">{p.product_code ?? '—'}</td>
                    <td className="p-2 text-sub">{p.category ?? '—'}</td>
                    <td className="p-2 text-right text-sub">
                      {p.pieces_per_pack ? `${p.pieces_per_pack} / pack` : '—'}
                    </td>
                    <td className="p-2 text-right">{fmtP(p.selling_price)}</td>
                    <td className="p-2 text-right">{fmtP(p.grocery_price)}</td>
                    <td className="p-2 text-right">
                      {p.stock_quantity === null || p.stock_quantity === undefined ? (
                        <span className="text-sub">—</span>
                      ) : (
                        <Badge tone={low ? 'warn' : 'ok'}>{p.stock_quantity}</Badge>
                      )}
                    </td>
                    <td className="p-2 text-right">
                      <Badge tone="muted">×{p.bought_count ?? 0}</Badge>
                    </td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button variant="ghost" className="py-1 px-2 text-sm" onClick={() => openEdit(p)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="py-1 px-2 text-sm ml-2" onClick={() => handleDelete(p.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={editProduct !== null} onClose={() => setEditProduct(null)} title="Edit Product">
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="block mb-1 font-semibold text-ink">Product Name</label>
            <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-ink">Code</label>
              <Input
                value={form.product_code}
                onChange={(e) => setForm({ ...form, product_code: e.target.value })}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-ink">Category</label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-ink">Selling (₱)</label>
              <Input
                type="number"
                step="0.01"
                value={form.selling_price}
                onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-ink">Grocery (₱)</label>
              <Input
                type="number"
                step="0.01"
                value={form.grocery_price}
                onChange={(e) => setForm({ ...form, grocery_price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-ink">Stock</label>
              <Input
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                placeholder="—"
              />
            </div>
          </div>

<div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-ink">Pieces / pack</label>
              <Input
                type="number"
                step="1"
                min="2"
                value={form.pieces_per_pack}
                onChange={(e) => setPackPieces(e.target.value)}
                placeholder="e.g. 24"
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-ink">Pack cost (₱)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.pack_cost}
                onChange={(e) => setPackCost(e.target.value)}
                placeholder="e.g. 130"
              />
            </div>
          </div>

          {message && (
            <p className={`text-sm font-semibold ${message.isError ? 'text-warn' : 'text-ok'}`}>
              {message.text}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              Save
            </Button>
            <Button variant="ghost" type="button" onClick={() => setEditProduct(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}