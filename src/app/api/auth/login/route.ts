import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createSessionToken, getSessionCookieName, getSessionCookieOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const password = body.password ?? '';
  const expected = process.env.AUTH_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: 'Server is not configured for authentication.' },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const token = await createSessionToken();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
  return response;
}