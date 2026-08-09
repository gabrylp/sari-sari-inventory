'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/clientApi';
import { addToCart, removeFromCart, setCartQty, type CartProduct } from '@/lib/cart';
import type { GcashTier } from '@/lib/gcash';
import { useHotkeys } from '@/lib/useHotkeys';
import { Button, Card, EmptyState, Input, Modal, Segmented, Select } from '@/components/ui';

type Product = CartProduct & {
  grocery_price: number;
  stock_quantity?: number | null;
  category?: string | null;
  bought_count?: number | null;
};

type Customer = { id: string; name: string };

type ReceiptItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type Receipt = {
  transaction_id: string | null;
  sale_ids: string[];
  created_at: string;
  payment_method: 'cash' | 'gcash' | 'utang';
  items: ReceiptItem[];
  total: number;
};

const fmtP = (n: number) => `₱${Number(n).toFixed(2)}`;

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 rounded bg-card2 border border-line font-semibold text-xs">
      {children}
    </kbd>
  );
}

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortMode, setSortMode] = useState<
    'freq' | 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc'
  >('freq');
  const [lines, setLines] = useState<{ product: CartProduct; qty: number }[]>([]);
  const [payment, setPayment] = useState<'cash' | 'gcash' | 'utang'>('cash');
  const [tendered, setTendered] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const lastAddedId = useRef<string | null>(null);
  const qaNameRef = useRef<HTMLInputElement>(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [qaName, setQaName] = useState('');
  const [qaCode, setQaCode] = useState('');
  const [qaPrice, setQaPrice] = useState('');
  const [qaCost, setQaCost] = useState('');
  const [qaStock, setQaStock] = useState('');
  const [qaCategory, setQaCategory] = useState('');
  const [qaBusy, setQaBusy] = useState(false);
  const [qaError, setQaError] = useState('');

  const [gcashOpen, setGcashOpen] = useState<'cashin' | 'cashout' | null>(null);
  const [gTiers, setGTiers] = useState<GcashTier[]>([]);
  const [gSelectedTier, setGSelectedTier] = useState<GcashTier | null>(null);
  const [gAmount, setGAmount] = useState('');
  const [gFee, setGFee] = useState('');
  const [gCustomer, setGCustomer] = useState('');
  const [gNote, setGNote] = useState('');
  const [gBusy, setGBusy] = useState(false);
  const [gMsg, setGMsg] = useState('');
  const [gMsgError, setGMsgError] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/api/products'), api.get('/api/customers')])
      .then(([p, c]) => {
        setProducts(p.data ?? []);
        setCustomers(c.data ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  const total = lines.reduce((sum, l) => sum + l.product.selling_price * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);
  const tenderedNum = parseFloat(tendered);
  const hasTendered = payment === 'cash' && Number.isFinite(tenderedNum) && tenderedNum >= 0;
  const change = hasTendered ? tenderedNum - total : 0;

  const term = search.trim().toLowerCase();

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ['all', ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const filteredList = products.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;
      if (!term) return true;
      return (
        p.product_name.toLowerCase().includes(term) ||
        (p.product_code ?? '').toLowerCase().includes(term)
      );
    });

    const byName = (a: Product, b: Product) => a.product_name.localeCompare(b.product_name);
    const sorted = [...filteredList];
    switch (sortMode) {
      case 'name-asc':
        sorted.sort(byName);
        break;
      case 'name-desc':
        sorted.sort((a, b) => byName(b, a));
        break;
      case 'price-asc':
        sorted.sort((a, b) => a.selling_price - b.selling_price || byName(a, b));
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.selling_price - a.selling_price || byName(a, b));
        break;
      default:
        sorted.sort(
          (a, b) => (b.bought_count ?? 0) - (a.bought_count ?? 0) || byName(a, b)
        );
    }
    return sorted;
  }, [products, category, term, sortMode]);

  const qtyById = useMemo(() => {
    const map = new Map<string, number>();
    lines.forEach((l) => map.set(String(l.product.id), l.qty));
    return map;
  }, [lines]);

  function addProduct(product: CartProduct) {
    lastAddedId.current = String(product.id);
    setLines((prev) => addToCart({ lines: prev }, product).lines);
  }

  function changeQty(productId: number | string, qty: number) {
    setLines((prev) => setCartQty({ lines: prev }, productId, qty).lines);
  }

  function removeLine(productId: number | string) {
    setLines((prev) => removeFromCart({ lines: prev }, productId).lines);
  }

  function adjustLastQty(by: number) {
    const id = lastAddedId.current;
    if (!id) return;
    const line = lines.find((l) => String(l.product.id) === id);
    if (line) changeQty(line.product.id, line.qty + by);
  }

  function newSale() {
    setLines([]);
    setTendered('');
    setCustomerId('');
    setPayment('cash');
    setSearch('');
    setCategory('all');
    lastAddedId.current = null;
    searchRef.current?.focus();
  }

  function closeReceipt() {
    newSale();
    setReceipt(null);
    setCopied(false);
  }

  function openQuickAdd(code = '') {
    setQaCode(code);
    setQaName('');
    setQaPrice('');
    setQaCost('');
    setQaStock('');
    setQaCategory('');
    setQaError('');
    setQuickAddOpen(true);
    setTimeout(() => qaNameRef.current?.focus(), 0);
  }

  async function saveQuickAdd() {
    const price = parseFloat(qaPrice);
    if (!qaName.trim() || !Number.isFinite(price) || price <= 0) {
      setQaError('Name and price are required');
      return;
    }
    setQaBusy(true);
    setQaError('');
    try {
      const res = await api.post('/api/products', {
        product_name: qaName.trim(),
        product_code: qaCode.trim() || undefined,
        category: qaCategory || undefined,
        selling_price: price,
        grocery_price: qaCost ? parseFloat(qaCost) : price,
        stock_quantity: qaStock === '' ? undefined : parseFloat(qaStock),
      });
      const created = res.data as Product | undefined;
      if (created) {
        setProducts((prev) => [...prev, { ...created, bought_count: 0 }]);
        addProduct(created);
      }
      setQuickAddOpen(false);
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 0);
    } catch (err) {
      setQaError(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setQaBusy(false);
    }
  }

  const showGcashTiles = term.length > 0 && /cash|gcash/.test(term);

  async function openGcash(type: 'cashin' | 'cashout') {
    setGAmount('');
    setGFee('');
    setGCustomer('');
    setGNote('');
    setGMsg('');
    setGMsgError(false);
    setGSelectedTier(null);
    setGcashOpen(type);
    try {
      const { data } = await api.get('/api/gcash/tiers');
      const rows: GcashTier[] = (data ?? []).map((t: Record<string, unknown>) => ({
        id: t.id as number,
        min_amount: Number(t.min_amount),
        max_amount: Number(t.max_amount),
        fee: Number(t.fee),
      }));
      setGTiers(rows);
      if (rows.length === 0) {
        setGMsg('No fee tiers yet — add them on the GCash Service page');
        setGMsgError(true);
      }
    } catch (err) {
      setGMsg(err instanceof Error ? err.message : 'Failed to load fee tiers');
      setGMsgError(true);
    }
  }

  function pickGcashTier(tier: GcashTier) {
    setGSelectedTier(tier);
    setGAmount(String(tier.max_amount));
    setGFee(String(tier.fee));
    setGMsg('');
    setGMsgError(false);
  }

  async function submitGcash() {
    const amountNum = parseFloat(gAmount);
    const feeNum = parseFloat(gFee) || 0;
    if (!gSelectedTier) {
      setGMsg('Pick a fee tier first');
      setGMsgError(true);
      return;
    }
    if (
      !Number.isFinite(amountNum) ||
      amountNum < gSelectedTier.min_amount ||
      amountNum > gSelectedTier.max_amount
    ) {
      setGMsg(
        `Amount must be between ₱${gSelectedTier.min_amount.toFixed(2)} and ₱${gSelectedTier.max_amount.toFixed(2)}`
      );
      setGMsgError(true);
      return;
    }
    if (feeNum < gSelectedTier.fee) {
      setGMsg(`Fee must be at least ₱${gSelectedTier.fee.toFixed(2)} for this tier`);
      setGMsgError(true);
      return;
    }
    setGBusy(true);
    setGMsg('');
    setGMsgError(false);
    try {
      await api.post('/api/gcash', {
        type: gcashOpen,
        amount: amountNum,
        fee: feeNum,
        customer_name: gCustomer.trim() || undefined,
        note: gNote.trim() || undefined,
      });
      setGMsg('Logged!');
      setGAmount('');
      setGFee('');
      setGCustomer('');
      setGNote('');
      setTimeout(() => setGcashOpen(null), 700);
    } catch (err) {
      setGMsg(err instanceof Error ? err.message : 'Failed to log transaction');
      setGMsgError(true);
    } finally {
      setGBusy(false);
    }
  }

  async function confirmSale() {
    if (lines.length === 0) return;
    setBusy(true);
    setError('');
    try {
      const items = lines.map((l) => ({ product_id: l.product.id, quantity: l.qty }));

      if (payment === 'utang') {
        if (!customerId) {
          setError('Pick a customer for utang');
          return;
        }
        const res = await api.post('/api/utang', { customer_id: customerId, items });
        setReceipt(res.receipt);
      } else {
        const res = await api.post('/api/sales', { items, payment_method: payment });
        setReceipt(res.receipt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setBusy(false);
    }
  }

  async function copyReceipt() {
    if (!receipt) return;
    const receiptLines = receipt.items
      .map((i) => `${i.quantity} × ${i.product_name}  ${fmtP(i.total)}`)
      .join('\n');
    const text = [
      "Divina's Store",
      `Date: ${new Date(receipt.created_at).toLocaleString('en-US')}`,
      `Payment: ${receipt.payment_method.toUpperCase()}`,
      `Txn: ${receipt.transaction_id ?? 'utang'}`,
      '------------------------',
      receiptLines,
      '------------------------',
      `TOTAL: ${fmtP(receipt.total)}`,
      'Thank you, come again!',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy the receipt');
    }
  }

  useHotkeys(
    {
      f1: () => setLines([]),
      f2: () => setPayment('cash'),
      f3: () => setPayment('gcash'),
      f4: () => setPayment('utang'),
      f5: confirmSale,
      f6: () => openQuickAdd(search.trim()),
      escape: () => {
        if (quickAddOpen) setQuickAddOpen(false);
        else if (helpOpen) setHelpOpen(false);
        else closeReceipt();
      },
      '?': () => setHelpOpen((v) => !v),
      '+': () => adjustLastQty(1),
      '-': () => adjustLastQty(-1),
      '/': () => searchRef.current?.focus(),
    },
    [lines, payment, customerId, tendered, filtered, total, helpOpen, quickAddOpen, search]
  );

  if (loading) return <p className="text-ink">Loading products…</p>;
  if (error && products.length === 0) return <p className="text-warn">Error: {error}</p>;

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col lg:flex-row gap-3">
      {/* Left: product grid */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center gap-2">
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              if (filtered[0]) addProduct(filtered[0]);
              else if (term) openQuickAdd(term);
            }}
            placeholder="Search by name or product code…"
            autoFocus
          />
          <Button
            variant="ghost"
            className="shrink-0 px-3 py-2 text-sm"
            onClick={() => openQuickAdd(search.trim())}
          >
            + Add <Kbd>F6</Kbd>
          </Button>
          <Button
            variant="ghost"
            className="shrink-0 px-3 py-2 text-sm"
            onClick={() => setHelpOpen(true)}
          >
            ?
          </Button>
        </div>
        {term && filtered.length === 0 && !quickAddOpen && (
          <p className="text-sm text-warn font-semibold">
            No match for “{term}” — press <Kbd>Enter</Kbd> or <Kbd>F6</Kbd> to add it.
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 items-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition border ${
                category === cat
                  ? 'bg-accent text-accent-ink border-accent'
                  : 'bg-card border-line text-sub hover:text-ink'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
          <Select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
            className="ml-auto w-40 text-xs py-1"
          >
            <option value="freq">Frequent ↓</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="price-asc">Price Low → High</option>
            <option value="price-desc">Price High → Low</option>
          </Select>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.length === 0 ? (
            <EmptyState>No products found.</EmptyState>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2">
              {showGcashTiles && (
                <div className="col-span-full grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      ['cashin', 'GCash Cash-In', 'Customer pays cash, you send to GCash'],
                      ['cashout', 'GCash Cash-Out', 'Customer pays via GCash, you give cash'],
                    ] as const
                  ).map(([kind, title, sub]) => (
                    <button
                      key={kind}
                      onClick={() => openGcash(kind)}
                      className="text-left p-3 rounded-lg border-2 border-dashed border-purple/50 bg-purple/10 hover:bg-purple/20 transition col-span-1"
                    >
                      <p className="text-sm font-extrabold text-purple-ink">{title}</p>
                      <p className="text-xs text-sub mt-0.5">{sub}</p>
                      <p className="text-xs text-purple mt-1.5 font-semibold">
                        Fee from your tier table · set at entry
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {filtered.map((p) => {
                const qtyInCart = qtyById.get(String(p.id)) ?? 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addProduct(p)}
                    className="relative bg-card border border-line rounded-lg p-2.5 text-left hover:border-accent transition min-h-[74px]"
                  >
                    {qtyInCart > 0 && (
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent text-accent-ink font-bold flex items-center justify-center text-sm shadow">
                        {qtyInCart}
                      </span>
                    )}
                    <p className="text-[15px] font-bold text-ink leading-tight line-clamp-2">{p.product_name}</p>
                    {p.product_code && (
                      <p className="text-[11px] text-sub mt-0.5 truncate">{p.product_code}</p>
                    )}
                    <div className="flex items-baseline justify-between mt-1.5 gap-1">
                      <p className="text-lg font-extrabold text-accent">{fmtP(p.selling_price)}</p>
                      {typeof p.stock_quantity === 'number' && (
                        <span
                          title={`${p.stock_quantity} in stock`}
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            p.stock_quantity <= 10 ? 'bg-warn' : 'bg-ok'
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: cart */}
      <Card className="w-full lg:w-80 flex flex-col max-h-[60vh] lg:max-h-none">
        <div className="px-3 py-2.5 border-b border-line flex justify-between items-center">
          <h2 className="font-bold text-lg text-ink">
            Cart {count > 0 && `(${count})`}
          </h2>
          <button
            onClick={() => setLines([])}
            className="text-sub hover:text-warn text-sm font-semibold"
          >
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-3 py-1.5">
          {lines.length === 0 ? (
            <EmptyState>Tap a product to add it here.</EmptyState>
          ) : (
            lines.map((line) => (
              <div key={line.product.id} className="py-2 border-b border-line last:border-0">
                <div className="flex justify-between gap-2">
                  <p className="text-sm font-semibold text-ink truncate">{line.product.product_name}</p>
                  <button
                    onClick={() => removeLine(line.product.id)}
                    className="text-sub hover:text-warn font-bold"
                    aria-label={`Remove ${line.product.product_name}`}
                  >
                    &times;
                  </button>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => changeQty(line.product.id, line.qty - 1)}
                      className="w-7 h-7 rounded-full bg-card2 text-ink font-bold hover:bg-accent hover:text-accent-ink"
                      aria-label="Decrease"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-semibold text-ink">{line.qty}</span>
                    <button
                      onClick={() => changeQty(line.product.id, line.qty + 1)}
                      className="w-7 h-7 rounded-full bg-card2 text-ink font-bold hover:bg-accent hover:text-accent-ink"
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-sm font-bold text-ink">{fmtP(line.product.selling_price * line.qty)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-3 py-2.5 border-t border-line space-y-2.5">
          <Segmented<'cash' | 'gcash' | 'utang'>
            value={payment}
            onChange={setPayment}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'gcash', label: 'GCash' },
              { value: 'utang', label: 'Utang' },
            ]}
          />

          {payment === 'utang' ? (
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="" disabled>
                Select customer…
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : payment === 'cash' ? (
            <div>
              <label className="block text-sm font-semibold text-sub mb-1">Amount Tendered</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                placeholder="0.00"
              />
              {hasTendered && (
                <p
                  className={`mt-1 text-sm font-bold ${
                    change < 0 ? 'text-warn' : 'text-ok'
                  }`}
                >
                  Change: {fmtP(Math.max(0, change))}
                  {change < 0 && ' (insufficient)'}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-sub">Collect payment via GCash QR.</p>
          )}

          <div className="flex justify-between items-center pt-1">
            <span className="text-sub font-semibold">Subtotal</span>
            <span className="text-2xl font-extrabold text-accent">{fmtP(total)}</span>
          </div>

          {error && <p className="text-warn text-sm font-semibold">{error}</p>}

          <Button
            variant={payment === 'utang' ? 'purple' : 'primary'}
            className="w-full py-3 text-lg"
            disabled={lines.length === 0 || busy || (payment === 'utang' && !customerId)}
            onClick={confirmSale}
          >
            {busy
              ? 'Processing…'
              : payment === 'utang'
                ? 'Record Utang'
                : payment === 'gcash'
                  ? 'Complete GCash'
                  : 'Complete Sale'}
          </Button>
        </div>
      </Card>

      {/* Receipt modal */}
      <Modal open={receipt !== null} onClose={closeReceipt} title="Receipt" wide>
        {receipt && (
          <div className="space-y-3 font-mono">
            <div className="text-center">
              <p className="text-lg font-bold text-ink">Divina&apos;s Store</p>
              <p className="text-sub text-sm">
                {new Date(receipt.created_at).toLocaleString('en-US')}
              </p>
              <p className="text-sub text-sm">Txn: {receipt.transaction_id ?? '—'}</p>
            </div>
            <div className="border-t border-line pt-2 space-y-1">
              {receipt.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm text-ink">
                  <span className="truncate mr-2">
                    {item.quantity} × {item.product_name}
                  </span>
                  <span className="shrink-0">{fmtP(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-line pt-2 flex justify-between font-bold text-ink">
              <span>TOTAL</span>
              <span>{fmtP(receipt.total)}</span>
            </div>
            <div className="flex justify-between text-sm text-sub">
              <span>Payment</span>
              <span className="uppercase font-semibold">{receipt.payment_method}</span>
            </div>
            <p className="text-center text-sm text-sub pt-2">Thank you! Babalik po kayo.</p>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={copyReceipt}>
                {copied ? 'Copied!' : 'Copy Receipt'}
              </Button>
              <Button className="flex-1" onClick={closeReceipt}>
                New Sale
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* GCash service modal */}
      <Modal
        open={gcashOpen !== null}
        onClose={() => setGcashOpen(null)}
        title={gcashOpen === 'cashout' ? 'GCash Cash-Out' : 'GCash Cash-In'}
      >
        {gSelectedTier ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitGcash();
            }}
            className="space-y-3"
          >
            <p className="text-sm text-sub">
              {gcashOpen === 'cashout'
                ? 'Customer pays you via GCash — you hand out cash.'
                : 'Customer gives you cash — you send to their GCash.'}
            </p>
            <div className="rounded-lg border border-line bg-card2 p-3 flex justify-between items-center">
              <div>
                <p className="text-xs text-sub font-semibold">Selected tier</p>
                <p className="text-sm font-bold text-ink">
                  ₱{gSelectedTier.min_amount.toFixed(2)} – ₱{gSelectedTier.max_amount.toFixed(2)}
                </p>
              </div>
              <p className="text-sm font-extrabold text-accent">Fee ₱{gSelectedTier.fee.toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-sub mb-1">
                  Amount (₱) — within tier
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={gAmount}
                  onChange={(e) => setGAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-sub mb-1">
                  Fee (₱) — optional raise
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={gFee}
                  onChange={(e) => setGFee(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-sub mb-1">
                  Customer (optional)
                </label>
                <Input
                  value={gCustomer}
                  onChange={(e) => setGCustomer(e.target.value)}
                  placeholder="name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-sub mb-1">Note (optional)</label>
                <Input value={gNote} onChange={(e) => setGNote(e.target.value)} placeholder="note" />
              </div>
            </div>
            {gMsg && (
              <p className={`text-sm font-semibold ${gMsgError ? 'text-warn' : 'text-ok'}`}>{gMsg}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setGSelectedTier(null)}
                disabled={gBusy}
              >
                ← Change tier
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setGcashOpen(null)}
                disabled={gBusy}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={gBusy}>
                {gBusy ? 'Logging…' : 'Log Transaction'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-sub">
              Pick the amount tier for this{' '}
              {gcashOpen === 'cashout' ? 'cash-out' : 'cash-in'}:
            </p>
            <div className="space-y-2">
              {gTiers.length === 0 ? (
                <p className="text-sm text-sub">
                  {gMsg || 'Loading tiers…'} — add tiers on the GCash Service page.
                </p>
              ) : (
                gTiers.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => pickGcashTier(tier)}
                    className="w-full text-left flex justify-between items-center p-3 rounded-lg border border-line bg-card2 hover:border-accent transition"
                  >
                    <span className="font-bold text-ink">
                      ₱{tier.min_amount.toFixed(2)} – ₱{tier.max_amount.toFixed(2)}
                    </span>
                    <span className="text-accent font-extrabold">Fee ₱{tier.fee.toFixed(2)}</span>
                  </button>
                ))
              )}
            </div>
            {gMsg && (
              <p className={`text-sm font-semibold ${gMsgError ? 'text-warn' : 'text-ok'}`}>{gMsg}</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" className="w-full" onClick={() => setGcashOpen(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick add product */}
      <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} title="Quick Add Product">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveQuickAdd();
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-sm font-semibold text-sub mb-1">Product Name</label>
            <Input
              ref={qaNameRef}
              value={qaName}
              onChange={(e) => setQaName(e.target.value)}
              placeholder="e.g. Kopiko 3in1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-sub mb-1">Selling Price</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={qaPrice}
                onChange={(e) => setQaPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sub mb-1">Cost Price</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={qaCost}
                onChange={(e) => setQaCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-sub mb-1">Product Code</label>
              <Input
                value={qaCode}
                onChange={(e) => setQaCode(e.target.value)}
                placeholder="barcode / code"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-sub mb-1">Initial Stock</label>
              <Input
                type="number"
                min="0"
                value={qaStock}
                onChange={(e) => setQaStock(e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-sub mb-1">Category</label>
            <Select value={qaCategory} onChange={(e) => setQaCategory(e.target.value)}>
              <option value="">— No category —</option>
              {categories
                .filter((c) => c !== 'all')
                .map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
            </Select>
          </div>
          {qaError && <p className="text-warn text-sm font-semibold">{qaError}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1" onClick={() => setQuickAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={qaBusy}>
              {qaBusy ? 'Saving…' : 'Save & Add to Cart'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Shortcut help */}
      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Shortcuts">
        <ul className="space-y-2 text-ink text-sm">
          {[
            ['F1', 'New sale (clear cart)'],
            ['F2 / F3 / F4', 'Payment: Cash / GCash / Utang'],
            ['F5', 'Complete payment'],
            ['F6', 'Quick add a product'],
            ['/ ', 'Focus search'],
            ['Enter (in search)', 'Add first match — or create if no match'],
            ['+ / -', 'Adjust the last item added'],
            ['Esc', 'Close dialog / clear cart'],
          ].map(([key, desc]) => (
            <li key={key} className="flex gap-3 justify-between">
              <Kbd>{key}</Kbd>
              <span className="flex-1 text-right text-sub">{desc}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}