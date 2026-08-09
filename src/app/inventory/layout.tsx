'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { applyTheme, getStoredTheme } from '@/lib/theme';

const links = [
  { href: '/inventory', label: 'POS Till', shortcut: 'F1' },
  { href: '/inventory/dashboard', label: 'Dashboard' },
  { href: '/inventory/add-product', label: 'Add Products' },
  { href: '/inventory/manage-products', label: 'Manage Products' },
  { href: '/inventory/utang-system', label: 'Utang System' },
  { href: '/inventory/gcash', label: 'GCash Service' },
  { href: '/inventory/kita-overview', label: 'Kita Overview' },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    document.documentElement.dataset.theme = getStoredTheme();
  }, []);

  function toggleTheme() {
    const next = getStoredTheme() === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
  }

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen bg-surface text-ink">
      <aside className="w-64 bg-card border-r border-line p-6 flex flex-col">
        <h2 className="text-2xl leading-tight font-extrabold mb-8 text-accent">
          Divina&apos;s Store
        </h2>
        <nav className="flex flex-col space-y-2">
          {links.map(({ href, label, shortcut }) => {
            const isActive =
              href === '/inventory' ? pathname === '/inventory' : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex justify-between items-center px-4 py-3 rounded-md font-semibold transition
                  ${
                    isActive
                      ? 'bg-accent text-accent-ink shadow-lg'
                      : 'text-sub hover:bg-card2 hover:text-ink'
                  }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span>{label}</span>
                {shortcut ? <kbd className="text-xs opacity-60">{shortcut}</kbd> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3">
          <button
            onClick={toggleTheme}
            className="w-full px-4 py-2 rounded-md font-semibold bg-card2 hover:bg-card hover:text-ink text-sub transition"
          >
            Theme: Light / Dark
          </button>
          <button
            onClick={handleSignOut}
            className="w-full px-4 py-2 rounded-md font-semibold bg-card2 hover:bg-warn hover:text-warn-ink text-sub transition"
          >
            Sign Out
          </button>
          <footer className="p-2 text-center text-sub text-xs">
            © 2026 Divina&apos;s Store
          </footer>
        </div>
      </aside>

      <main className="flex-1 p-6 bg-surface">{children}</main>
    </div>
  );
}