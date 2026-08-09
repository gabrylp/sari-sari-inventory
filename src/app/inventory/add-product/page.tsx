'use client';

import { useState } from 'react';
import { api } from '@/lib/clientApi';
import { Calculator } from '@/components/Calculator';
import { Button, Card, Input } from '@/components/ui';

const fmtNum = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : '');

export default function AddProductPage() {
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [category, setCategory] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [groceryPrice, setGroceryPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [piecesPerPack, setPiecesPerPack] = useState('');
  const [packCost, setPackCost] = useState('');
  const [boxes, setBoxes] = useState('');
  const [extraPieces, setExtraPieces] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updatePieces(v: string) {
    setPiecesPerPack(v);
    const pieces = Number(v);
    const cost = Number(packCost);
    if (v && packCost && pieces >= 2 && cost > 0) setGroceryPrice(fmtNum(cost / pieces));
  }

  function updatePackCost(v: string) {
    setPackCost(v);
    const pieces = Number(piecesPerPack);
    const cost = Number(v);
    if (piecesPerPack && v && pieces >= 2 && cost > 0) setGroceryPrice(fmtNum(cost / pieces));
  }

  function updateBoxes(v: string) {
    setBoxes(v);
    const pieces = Number(piecesPerPack);
    if (pieces < 2) return;
    const total = Number(v) * pieces + (Number(extraPieces) || 0);
    if (total > 0) setStockQuantity(String(Math.round(total)));
  }

  function updateExtraPieces(v: string) {
    setExtraPieces(v);
    const pieces = Number(piecesPerPack);
    if (pieces < 2) return;
    const total = (Number(boxes) || 0) * pieces + Number(v);
    if (total > 0) setStockQuantity(String(Math.round(total)));
  }

  const packHints: string[] = [];
  const pieces = Number(piecesPerPack);
  const cost = Number(packCost);
  if (piecesPerPack || packCost) {
    if (pieces >= 2 && cost > 0) {
      packHints.push(`Unit cost auto-computed: ${fmtNum(cost / pieces)} / pc`);
      if (cost / pieces > Number(groceryPrice)) packHints.push('Check your selling price — you are below cost.');
    } else {
      packHints.push('Fill both pieces per pack and pack cost to auto-compute the unit cost.');
    }
  }

  const stockHint =
    pieces >= 2 && (boxes !== '' || extraPieces !== '')
      ? `${boxes || '0'} ${boxes === '1' ? 'box' : 'boxes'} × ${pieces} + ${extraPieces || '0'} = ${
          (Number(boxes) || 0) * pieces + (Number(extraPieces) || 0)
        } pcs`
      : pieces >= 2
        ? 'Stock is tracked in pieces — quick-fill by boxes below.'
        : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!productName || !sellingPrice || !groceryPrice) {
      setMessage('Please fill in all fields');
      setIsError(true);
      return;
    }

    const hasPack = piecesPerPack !== '';
    const hasCost = packCost !== '';
    if (hasPack !== hasCost) {
      setMessage('Fill both "Pieces per pack" and "Pack cost" — or leave both empty.');
      setIsError(true);
      return;
    }
    if (hasPack && (pieces < 2 || cost <= 0)) {
      setMessage('Pack needs at least 2 pieces and a positive cost.');
      setIsError(true);
      return;
    }

    setIsSubmitting(true);
    setIsError(false);
    setMessage('');

    try {
      await api.post('/api/products', {
        product_name: productName,
        product_code: productCode || undefined,
        category: category || undefined,
        selling_price: parseFloat(sellingPrice),
        grocery_price: parseFloat(groceryPrice),
        stock_quantity: stockQuantity === '' ? undefined : parseFloat(stockQuantity),
        pieces_per_pack: hasPack ? pieces : null,
        pack_cost: hasPack ? cost : null,
      });
      setMessage('Product added successfully!');
      setProductName('');
      setProductCode('');
      setCategory('');
      setSellingPrice('');
      setGroceryPrice('');
      setStockQuantity('');
      setPiecesPerPack('');
      setPackCost('');
      setBoxes('');
      setExtraPieces('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error adding product');
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  const messageClass = isError ? 'text-warn' : 'text-ok';

  return (
    <div className="flex flex-col xl:flex-row items-center xl:items-start justify-center gap-6 min-h-full py-8 px-4">
      <Card className="p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold mb-8 text-center text-accent">Add Product</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-1.5 text-ink font-semibold">Product Name</label>
            <Input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Lucky Me Pancit Canton"
              autoFocus
            />
          </div>

          <div>
            <label className="block mb-1.5 text-ink font-semibold">
              Product Code <span className="text-sub font-normal">(optional, for the POS scanner)</span>
            </label>
            <Input
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              placeholder="e.g. LC-001 or barcode number"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-ink font-semibold">
              Category <span className="text-sub font-normal">(optional, for POS filters)</span>
            </label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Snacks, Drinks, Canned Goods"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-ink font-semibold">Selling Price (₱)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block mb-1.5 text-ink font-semibold">Unit Grocery Cost (₱)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={groceryPrice}
                onChange={(e) => setGroceryPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="rounded-xl border border-line bg-card2 p-4 space-y-3">
            <p className="text-sm font-bold text-ink">Pack (optional — boxed goods)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-ink font-semibold text-sm">
                  Pieces per pack
                </label>
                <Input
                  type="number"
                  step="1"
                  min="2"
                  value={piecesPerPack}
                  onChange={(e) => updatePieces(e.target.value)}
                  placeholder="e.g. 24"
                />
              </div>
              <div>
                <label className="block mb-1 text-ink font-semibold text-sm">Pack cost (₱)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={packCost}
                  onChange={(e) => updatePackCost(e.target.value)}
                  placeholder="e.g. 130"
                />
              </div>
            </div>
            {packHints.map((hint) => (
              <p
                key={hint}
                className={`text-xs font-semibold ${
                  hint.startsWith('Check') ? 'text-warn' : 'text-ok'
                }`}
              >
                {hint}
              </p>
            ))}
          </div>

          <div>
            <label className="block mb-1.5 text-ink font-semibold">
              Stock Quantity{' '}
              <span className="text-sub font-normal">(in pieces)</span>
            </label>
            <Input
              type="number"
              step="1"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder="e.g. 50"
            />
            {pieces >= 2 && (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-ink font-semibold text-sm">Boxes</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={boxes}
                    onChange={(e) => updateBoxes(e.target.value)}
                    placeholder="e.g. 3"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-ink font-semibold text-sm">Extra pieces</label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={extraPieces}
                    onChange={(e) => updateExtraPieces(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>
              </div>
            )}
            {stockHint && <p className="mt-1.5 text-xs font-semibold text-ok">{stockHint}</p>}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full py-3 text-lg">
            {isSubmitting ? 'Adding…' : 'Add Product'}
          </Button>
        </form>

        {message && (
          <p className={`mt-6 text-center font-semibold ${messageClass}`}>{message}</p>
        )}
      </Card>

      <div className="w-full max-w-md xl:max-w-xs shrink-0 xl:sticky xl:top-8">
        <Calculator
          actions={[
            { label: '→ Grocery', onPress: (v) => setGroceryPrice(fmtNum(v)) },
            { label: '→ Selling', onPress: (v) => setSellingPrice(fmtNum(v)) },
          ]}
        />
      </div>
    </div>
  );
}