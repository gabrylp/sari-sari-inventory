export type GcashTier = {
  id: number | string;
  min_amount: number;
  max_amount: number;
  fee: number;
};

export function findGcashTier(tiers: GcashTier[], amount: number): GcashTier | undefined {
  return tiers.find((t) => amount >= t.min_amount && amount <= t.max_amount);
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}