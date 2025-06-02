// src/app/test/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TestPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase.from('products').select('*');
      if (error) console.error('Error fetching products:', error);
      else setProducts(data || []);
      setLoading(false);
    }
    
    fetchProducts();
  }, []);

  return (
    <div className="text-white p-4">
      <h1 className="text-xl font-bold mb-2">Test Supabase Connection</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul className="list-disc pl-5">
          {products.map((product, index) => (
            <li key={index}>{product.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
