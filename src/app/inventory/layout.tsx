'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/inventory/log-sales', label: 'Log Sales' },
  { href: '/inventory/add-product', label: 'Add Products' },
  { href: '/inventory/manage-products', label: 'Manage Products' },
  { href: '/inventory/utang-system', label: 'Utang System' },
  { href: '/inventory/kita-overview', label: 'Kita Overview' },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <aside className="w-64 bg-gray-800 p-6 flex flex-col">
        <h2 className="text-3xl font-extrabold mb-8 text-yellow-400">
          Divina's Store Inventory
        </h2>
        <nav className="flex flex-col space-y-2">
          {links.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`block px-4 py-3 rounded-md font-semibold transition
                  ${isActive
                    ? 'bg-yellow-400 text-gray-900 shadow-lg border-l-4 border-yellow-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-yellow-400'}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <footer className="mt-auto p-4 text-center text-gray-500 text-xs">
          © 2025 Divina's Store
        </footer>
      </aside>

      <main className="flex-1 p-6 bg-gray-900">{children}</main>
    </div>
  );
}
