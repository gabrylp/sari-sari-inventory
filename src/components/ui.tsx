'use client';

import { useEffect } from 'react';
import { formatMoney } from '@/lib/format';

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'ok' | 'purple';

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:opacity-90 font-bold',
  ghost: 'bg-card2 text-ink hover:opacity-90 font-semibold',
  ok: 'bg-ok text-ok-ink hover:opacity-90 font-bold',
  danger: 'bg-warn text-warn-ink hover:opacity-90 font-bold',
  purple: 'bg-purple text-purple-ink hover:opacity-90 font-bold',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed ${buttonStyles[variant]} ${className}`}
    />
  );
}

export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`bg-card border border-line rounded-xl shadow-sm ${className}`} />;
}

export function Badge({
  tone = 'accent',
  children,
  className = '',
}: {
  tone?: 'accent' | 'ok' | 'warn' | 'purple' | 'muted';
  children: React.ReactNode;
  className?: string;
}) {
  const tones: Record<string, string> = {
    accent: 'bg-accent text-accent-ink',
    ok: 'bg-ok text-ok-ink',
    warn: 'bg-warn text-warn-ink',
    purple: 'bg-purple text-purple-ink',
    muted: 'bg-card2 text-sub',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Input({
  className = '',
  ref,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
      {...props}
      className={`w-full px-3 py-2 rounded-md bg-card2 border border-line text-ink placeholder-sub focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
    />
  );
}

export function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`px-3 py-2 rounded-md bg-card2 border border-line text-ink focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg bg-card2 border border-line p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${
            value === opt.value ? 'bg-accent text-accent-ink' : 'text-sub hover:text-ink'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function StatCard({
  label,
  value,
  tone = 'accent',
}: {
  label: string;
  value: string;
  tone?: 'accent' | 'ok' | 'warn';
}) {
  const tones = {
    accent: 'text-accent',
    ok: 'text-ok',
    warn: 'text-warn',
  };
  return (
    <Card className="p-4 text-center">
      <p className="text-sub text-sm font-semibold mb-1">{label}</p>
      <p className={`text-2xl font-bold ${tones[tone]}`}>{value}</p>
    </Card>
  );
}

export function Money({ value, className = '' }: { value: number | null | undefined; className?: string }) {
  return <span className={className}>{formatMoney(value)}</span>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-center py-8 text-sub">{children}</p>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-card border border-line rounded-xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="text-xl font-bold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="text-sub hover:text-ink text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}