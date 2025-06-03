'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // adjust the path as needed

export default function SupabaseTest() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testFetch() {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error('❌ Supabase fetch error:', error);
        setError(error.message);
      } else {
        console.log('✅ Data:', data);
      }
    }
    testFetch();
  }, []);

  return (
    <div>
      {error ? <p className="text-red-500">Error: {error}</p> : <p>Check console for data</p>}
    </div>
  );
}
