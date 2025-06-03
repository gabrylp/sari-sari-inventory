// src/types/next.d.ts
import 'next';

declare module 'next' {
  interface NextApiRequest {
    cookies: Partial<{
      [key: string]: string;
    }>;
  }
}