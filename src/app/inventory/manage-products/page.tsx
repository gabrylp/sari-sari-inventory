'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/clientApi';
import { formatMoney } from '@/lib/format';
import { Badge, Button, Card, EmptyState, Input } from '@/components/ui';

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
  created_at?: string | null;
  bought_count?: number | null;
};

type SortConfig = { key: keyof Product; direction: 'ascending' | 'descending' };

const LOW_STOCK_THRESHOLD = 10;
const fmtP = formatMoney;

type EditField =
  | 'product_name'
  | 'product_code'
  | 'category'
  | 'selling_price'
  | 'grocery_price'
  | 'stock_quantity'
  | 'pack';

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

  const [editingCell, setEditingCell] = useState<{ id: string; field: EditField } | null>(null);
  const [cellDraft, setCellDraft] = useState('');
  const [packDraft, setPackDraft] = useState({ pieces: '', cost: '' });
  const packPiecesRef = useRef<HTMLInputElement>(null);
  const packCostRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/products', { ttl: 30000 });
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
          : key === 'created_at'
            ? 'descending'
            : 'ascending',
    }));
  };

  const sortIndicator = (key: keyof Product) =>
    sortConfig?.key === key ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : '↕';

  function cellValue(p: Product, field: EditField): string {
    switch (field) {
      case 'product_name':
        return p.product_name;
      case 'product_code':
        return p.product_code ?? '';
      case 'category':
        return p.category ?? '';
      case 'selling_price':
        return String(p.selling_price);
      case 'grocery_price':
        return String(p.grocery_price);
      case 'stock_quantity':
        return p.stock_quantity === null || p.stock_quantity === undefined
          ? ''
          : String(p.stock_quantity);
      case 'pack':
        return '';
    }
  }

  function startCell(p: Product, field: EditField) {
    setEditingCell({ id: String(p.id), field });
    setCellDraft(cellValue(p, field));
  }

  function startPack(p: Product) {
    setEditingCell({ id: String(p.id), field: 'pack' });
    setPackDraft({
      pieces: p.pieces_per_pack?.toString() ?? '',
      cost: p.pack_cost?.toString() ?? '',
    });
  }

  function cancelCell() {
    setEditingCell(null);
    setCellDraft('');
    setPackDraft({ pieces: '', cost: '' });
  }

  const editingHere = (p: Product, field: EditField) =>
    editingCell?.id === String(p.id) && editingCell?.field === field;

  async function commitCell() {
    const cell = editingCell;
    if (!cell || cell.field === 'pack') return;
    const product = products.find((x) => String(x.id) === cell.id);
    if (!product) return cancelCell();

    const original = cellValue(product, cell.field);
    const draft = cellDraft.trim();
    if (draft === original) return cancelCell();

    let value: unknown = draft;
    if (cell.field === 'selling_price' || cell.field === 'grocery_price') {
      const n = Number(draft);
      if (draft === '' || !Number.isFinite(n)) {
        setMessage({ text: 'Enter a valid price', isError: true });
        return cancelCell();
      }
      value = n;
    } else if (cell.field === 'stock_quantity') {
      value = draft === '' ? null : Number(draft);
    }

    cancelCell();
    try {
      await api.put(`/api/products/${product.id}`, { [cell.field]: value });
      setMessage({ text: 'Product updated', isError: false });
      fetchProducts();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Update failed', isError: true });
    }
  }

  async function commitPack() {
    const cell = editingCell;
    if (!cell || cell.field !== 'pack') return;
    const product = products.find((x) => String(x.id) === cell.id);
    if (!product) return cancelCell();

    if (packDraft.pieces === '' || packDraft.cost === '') return cancelCell();
    const pieces = Number(packDraft.pieces);
    const cost = Number(packDraft.cost);
    if (!Number.isInteger(pieces) || pieces < 2 || !Number.isFinite(cost) || cost < 0) {
      setMessage({ text: 'Pack needs at least 2 pieces and a valid cost', isError: true });
      return cancelCell();
    }

    cancelCell();
    try {
      await api.put(`/api/products/${product.id}`, {
        pieces_per_pack: pieces,
        pack_cost: cost,
        grocery_price: Math.round((cost / pieces) * 100) / 100,
      });
      setMessage({ text: 'Product updated', isError: false });
      fetchProducts();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Update failed', isError: true });
    }
  }

  const onPackBlur = (side: 'pieces' | 'cost') => () => {
    const other = side === 'pieces' ? packCostRef.current : packPiecesRef.current;
    if (document.activeElement === other) return;
    commitPack();
  };

  const onPackKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitPack();
    } else if (e.key === 'Escape') {
      cancelCell();
    }
  };

  const onCellKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      cancelCell();
    }
  };

  const cellInputClass = (field: EditField) =>
    'bg-card border border-line rounded px-1.5 py-0.5 text-sm outline-none focus:border-accent ' +
    (field === 'product_name' ? 'font-semibold ' : '') +
    (field === 'product_name' || field === 'product_code' || field === 'category' ? 'w-full ' : '') +
    (field === 'selling_price' || field === 'grocery_price' || field === 'stock_quantity'
      ? 'text-right '
      : '');

  function editableCell(
    p: Product,
    field: EditField,
    className: string,
    content: React.ReactNode
  ) {
    if (!editingHere(p, field)) {
      return (
        <td
          className={`${className} cursor-cell`}
          title="Double-click to edit"
          onDoubleClick={() => (field === 'pack' ? startPack(p) : startCell(p, field))}
        >
          {content}
        </td>
      );
    }

    if (field === 'pack') {
      return (
        <td className={`${className} cursor-cell`}>
          <div className="flex items-center justify-end gap-1.5">
            <input
              ref={packPiecesRef}
              autoFocus
              type="number"
              min="2"
              step="1"
              value={packDraft.pieces}
              onChange={(e) => setPackDraft((d) => ({ ...d, pieces: e.target.value }))}
              onBlur={onPackBlur('pieces')}
              onKeyDown={onPackKey}
              placeholder="pcs"
              className={`${cellInputClass('pack')} w-16`}
            />
            <input
              ref={packCostRef}
              type="number"
              min="0"
              step="0.01"
              value={packDraft.cost}
              onChange={(e) => setPackDraft((d) => ({ ...d, cost: e.target.value }))}
              onBlur={onPackBlur('cost')}
              onKeyDown={onPackKey}
              placeholder="₱0.00"
              className={`${cellInputClass('pack')} w-20`}
            />
          </div>
        </td>
      );
    }

    const isText = field === 'product_name' || field === 'product_code' || field === 'category';
    return (
      <td className={className}>
        <input
          autoFocus
          type={isText ? 'text' : 'number'}
          step={field === 'stock_quantity' ? '1' : '0.01'}
          min={field === 'stock_quantity' ? 0 : undefined}
          value={cellDraft}
          onChange={(e) => setCellDraft(e.target.value)}
          onBlur={commitCell}
          onKeyDown={onCellKey}
          style={
            isText ? undefined : { width: `${Math.max(cellDraft.length, 4) + 2}ch` }
          }
          className={cellInputClass(field)}
        />
      </td>
    );
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
          {(['bought_count', 'created_at', 'product_name', 'selling_price', 'stock_quantity'] as const).map((key) => (
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
                    : key === 'created_at'
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
                    {editableCell(p, 'product_name', 'p-2 font-semibold', p.product_name)}
                    {editableCell(p, 'product_code', 'p-2 text-sub', p.product_code ?? '—')}
                    {editableCell(p, 'category', 'p-2 text-sub', p.category ?? '—')}
                    {editableCell(
                      p,
                      'pack',
                      'p-2 text-right text-sub',
                      p.pieces_per_pack ? `${p.pieces_per_pack} / pack` : '—'
                    )}
                    {editableCell(p, 'selling_price', 'p-2 text-right', fmtP(p.selling_price))}
                    {editableCell(p, 'grocery_price', 'p-2 text-right', fmtP(p.grocery_price))}
                    {editableCell(
                      p,
                      'stock_quantity',
                      'p-2 text-right',
                      p.stock_quantity === null || p.stock_quantity === undefined ? (
                        <span className="text-sub">—</span>
                      ) : (
                        <Badge tone={low ? 'warn' : 'ok'}>{p.stock_quantity}</Badge>
                      )
                    )}
                    <td className="p-2 text-right">
                      <Badge tone="muted">×{p.bought_count ?? 0}</Badge>
                    </td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button variant="danger" className="py-1 px-2 text-sm" onClick={() => handleDelete(p.id)}>
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
    </div>
  );
}