'use client';

import { useState } from 'react';
import { api } from '@/lib/clientApi';
import { Button, Card, Input } from '@/components/ui';

export default function AddProductPage() {
  const [productName, setProductName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [category, setCategory] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [groceryPrice, setGroceryPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!productName || !sellingPrice || !groceryPrice) {
      setMessage('Please fill in all fields');
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
      });
      setMessage('Product added successfully!');
      setProductName('');
      setProductCode('');
      setCategory('');
      setSellingPrice('');
      setGroceryPrice('');
      setStockQuantity('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error adding product');
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  const messageClass = isError ? 'text-warn' : 'text-ok';

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-8">
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
              <label className="block mb-1.5 text-ink font-semibold">Grocery Price (₱)</label>
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

          <div>
            <label className="block mb-1.5 text-ink font-semibold">Stock Quantity</label>
            <Input
              type="number"
              step="1"
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              placeholder="e.g. 50"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full py-3 text-lg">
            {isSubmitting ? 'Adding…' : 'Add Product'}
          </Button>
        </form>

        {message && (
          <p className={`mt-6 text-center font-semibold ${messageClass}`}>{message}</p>
        )}
      </Card>
    </div>
  );
}