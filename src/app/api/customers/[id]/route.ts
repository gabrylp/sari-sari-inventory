import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;

  const admin = getAdmin();
  const { error } = await admin.from('customers').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}