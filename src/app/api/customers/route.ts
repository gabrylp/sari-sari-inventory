import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

export async function GET() {
  const admin = getAdmin();
  const { data, error } = await admin
    .from('customers')
    .select('id, name, created_at')
    .order('name', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? '').trim();

  if (!name) {
    return NextResponse.json({ error: 'Customer name cannot be empty' }, { status: 400 });
  }

  const admin = getAdmin();
  const { data, error } = await admin
    .from('customers')
    .insert([{ name }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}