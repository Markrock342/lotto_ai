import { DEFAULT_LIMITS, type RiskLimitsConfig } from "./limits";
import { DEFAULT_RATES, type PayoutRates } from "./rates";

const RATES_KEY = "lotto_rates_v1";
const PRICE_KEY = "lotto_price_per_set_v1";
const HOUSE_KEY = "lotto_house_name_v1";
const LIMITS_KEY = "lotto_limits_v1";

export function loadRates(): PayoutRates {
  if (typeof window === "undefined") return DEFAULT_RATES;
  try {
    const raw = localStorage.getItem(RATES_KEY);
    if (!raw) return DEFAULT_RATES;
    return { ...DEFAULT_RATES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_RATES;
  }
}

export function saveRates(rates: PayoutRates): void {
  localStorage.setItem(RATES_KEY, JSON.stringify(rates));
}

export function loadPricePerSet(): number {
  if (typeof window === "undefined") return 1;
  const v = localStorage.getItem(PRICE_KEY);
  return v ? Math.max(1, Number(v)) : 1;
}

export function savePricePerSet(price: number): void {
  localStorage.setItem(PRICE_KEY, String(Math.max(1, price)));
}

export function loadHouseName(): string {
  if (typeof window === "undefined") return "บ้านของคุณ";
  return localStorage.getItem(HOUSE_KEY) || "บ้านของคุณ";
}

export function saveHouseName(name: string): void {
  localStorage.setItem(HOUSE_KEY, name.trim() || "บ้านของคุณ");
}

export function loadLimits(): RiskLimitsConfig {
  if (typeof window === "undefined") return DEFAULT_LIMITS;
  try {
    const raw = localStorage.getItem(LIMITS_KEY);
    if (!raw) return DEFAULT_LIMITS;
    const parsed = JSON.parse(raw) as RiskLimitsConfig;
    return {
      ...DEFAULT_LIMITS,
      ...parsed,
      perNumber: parsed.perNumber ?? {},
    };
  } catch {
    return DEFAULT_LIMITS;
  }
}

export function saveLimits(limits: RiskLimitsConfig): void {
  localStorage.setItem(LIMITS_KEY, JSON.stringify(limits));
}

export function setNumberCap(
  number: string,
  cap: { maxRisk?: number | null; maxSets?: number | null },
): RiskLimitsConfig {
  const limits = loadLimits();
  const key = number.padStart(4, "0");
  const existing = limits.perNumber[key] ?? {
    maxRisk: null,
    maxSets: null,
  };
  const next: RiskLimitsConfig = {
    ...limits,
    perNumber: {
      ...limits.perNumber,
      [key]: {
        maxRisk: cap.maxRisk !== undefined ? cap.maxRisk : existing.maxRisk,
        maxSets: cap.maxSets !== undefined ? cap.maxSets : existing.maxSets,
      },
    },
  };
  saveLimits(next);
  return next;
}

export function clearNumberCap(number: string): RiskLimitsConfig {
  const limits = loadLimits();
  const key = number.padStart(4, "0");
  const { [key]: _, ...rest } = limits.perNumber;
  const next = { ...limits, perNumber: rest };
  saveLimits(next);
  return next;
}
