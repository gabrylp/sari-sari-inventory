'use client';

import { useState } from 'react';
import { Card } from '@/components/ui';

type CalcOp = '+' | '-' | '×' | '÷';

type Action = { label: string; onPress: (value: number) => void };

function applyOp(a: number, b: number, op: CalcOp): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? NaN : a / b;
  }
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return 'Error';
  const r = Math.round(n * 1e6) / 1e6;
  return String(r);
}

const keyNum =
  'rounded-lg bg-card2 border border-line text-ink font-bold text-sm transition hover:border-accent active:scale-95 py-2.5';
const keyOp =
  'rounded-lg bg-accent/15 border border-accent/40 text-accent font-extrabold text-lg transition hover:bg-accent/25 active:scale-95 py-2.5';
const keyUtil =
  'rounded-lg bg-card border border-line text-sub font-bold text-sm transition hover:border-warn/60 hover:text-warn active:scale-95 py-2.5';

export function Calculator({ actions = [] }: { actions?: Action[] }) {
  const [display, setDisplay] = useState('0');
  const [acc, setAcc] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<CalcOp | null>(null);
  const [lastOperand, setLastOperand] = useState<number | null>(null);
  const [fresh, setFresh] = useState(true);

  const isError = display === 'Error';

  function reset() {
    setDisplay('0');
    setAcc(null);
    setPendingOp(null);
    setLastOperand(null);
    setFresh(true);
  }

  function digit(d: string) {
    if (isError) reset();
    if (fresh) {
      setDisplay(d === '.' ? '0.' : d);
      setFresh(false);
      return;
    }
    if (d === '.') {
      if (!display.includes('.')) setDisplay(display + '.');
      return;
    }
    if (display.replace('-', '').length >= 14) return;
    setDisplay(display === '0' ? d : display + d);
  }

  function back() {
    if (isError) return reset();
    const next = display.slice(0, -1);
    setDisplay(next || '0');
    if (!next) setFresh(true);
  }

  function operator(next: CalcOp) {
    const cur = Number(display);
    if (isError) return reset();
    if (acc === null) {
      setAcc(cur);
    } else if (!fresh && pendingOp !== null) {
      const r = applyOp(acc, cur, pendingOp);
      if (!Number.isFinite(r)) return fail();
      setAcc(r);
      setDisplay(fmt(r));
      setLastOperand(cur);
    } else {
      setLastOperand(lastOperand ?? cur);
    }
    setPendingOp(next);
    setFresh(true);
  }

  function equals() {
    if (pendingOp === null || isError) return;
    const cur = fresh && lastOperand !== null ? lastOperand : Number(display);
    const base = acc === null ? (lastOperand ?? cur) : acc;
    const r = applyOp(base, cur, pendingOp);
    if (!Number.isFinite(r)) return fail();
    setDisplay(fmt(r));
    setAcc(r);
    setFresh(true);
  }

  function fail() {
    setDisplay('Error');
    setAcc(null);
    setPendingOp(null);
    setLastOperand(null);
    setFresh(true);
  }

  return (
    <Card className="p-4 w-full">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-ink">Calculator</h2>
        <span className="text-[11px] text-sub">for quick costing</span>
      </div>

      <div
        className={`mb-3 px-3 py-2.5 rounded-xl bg-card2 border border-line text-right text-2xl font-extrabold break-all leading-none min-h-[2.75rem] flex items-center justify-end ${
          isError ? 'text-warn' : 'text-ink'
        }`}
      >
        {acc !== null && pendingOp !== null && (
          <span className="text-sm text-sub font-semibold mr-2 shrink-0">
            {fmt(acc)} {pendingOp}
          </span>
        )}
        <span className="truncate">{display}</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <button type="button" className={keyUtil} onClick={reset}>
          C
        </button>
        <button type="button" className={keyUtil} onClick={back}>
          ⌫
        </button>
        <div />
        <button type="button" className={keyOp} onClick={() => operator('÷')}>
          ÷
        </button>

        {['7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+'].map((k) =>
          ['×', '-', '+'].includes(k) ? (
            <button
              key={k}
              type="button"
              className={keyOp}
              onClick={() => operator(k as CalcOp)}
            >
              {k}
            </button>
          ) : (
            <button key={k} type="button" className={keyNum} onClick={() => digit(k)}>
              {k}
            </button>
          )
        )}

        <button type="button" className={`${keyNum} col-span-2`} onClick={() => digit('0')}>
          0
        </button>
        <button type="button" className={keyNum} onClick={() => digit('.')}>
          .
        </button>
        <button type="button" className={keyOp} onClick={equals}>
          =
        </button>
      </div>

      {actions.length > 0 && (
        <div className="mt-3 flex gap-1.5">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={isError}
              className="flex-1 rounded-lg bg-accent text-accent-ink font-bold text-sm transition hover:opacity-90 active:scale-95 py-2 disabled:opacity-40"
              onClick={() => a.onPress(Number(display))}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}