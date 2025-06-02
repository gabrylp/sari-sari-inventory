'use client';

import React from 'react';

type Tab = 
  | 'addProducts' 
  | 'logSales' 
  | 'kitaOverview' 
  | 'utangSystem' 
  | 'manageProducts';

interface SidebarProps {
  selectedTab: Tab;
  onSelectTab: (tab: Tab) => void;
}

const tabs: { label: string; value: Tab }[] = [
  { label: 'Add Products', value: 'addProducts' },
  { label: 'Log Sales', value: 'logSales' },
  { label: 'Kita Overview', value: 'kitaOverview' },
  { label: 'Utang System', value: 'utangSystem' },
  { label: 'Manage Products', value: 'manageProducts' },
];

export default function Sidebar({ selectedTab, onSelectTab }: SidebarProps) {
  return (
    <aside className="w-64 bg-gradient-to-b from-gray-900 to-gray-800 shadow-xl text-white flex flex-col h-screen sticky top-0">
      <div className="px-8 py-6 border-b border-gray-700">
        <h1 className="text-3xl font-extrabold tracking-tight text-yellow-400">
          Divina's Store
        </h1>
        <p className="mt-1 text-sm text-gray-400">Inventory Management</p>
      </div>

      <nav className="flex-1 flex flex-col mt-8 px-4 space-y-2">
        {tabs.map(({ label, value }) => {
          const isSelected = selectedTab === value;
          return (
            <button
              key={value}
              onClick={() => onSelectTab(value)}
              className={`text-left px-5 py-3 rounded-md font-semibold transition
                ${
                  isSelected
                    ? 'bg-yellow-400 text-gray-900 shadow-lg border-l-4 border-yellow-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-yellow-400'
                }`}
              aria-current={isSelected ? 'page' : undefined}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <footer className="p-4 text-center text-gray-500 text-xs">
        © 2025 Divina's Store
      </footer>
    </aside>
  );
}
