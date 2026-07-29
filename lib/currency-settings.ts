export type CurrencyCode = "USD" | "KES";

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export const currencies: Record<CurrencyCode, Currency> = {
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
  },
  KES: {
    code: "KES",
    symbol: "KSh",
    name: "Kenyan Shilling",
  },
};

const STORAGE_KEY = "active-currency";

/**
 * Backwards compatible.
 * Can be called as:
 * isCurrencySwitcherEnabled()
 * isCurrencySwitcherEnabled(settings)
 */
export function isCurrencySwitcherEnabled(settings?: any): boolean {
  if (!settings) return true;

  if (typeof settings.currency_switcher_enabled === "boolean") {
    return settings.currency_switcher_enabled;
  }

  return true;
}

/**
 * Backwards compatible.
 * Can be called as:
 * getDefaultCurrency()
 * getDefaultCurrency(settings)
 */
export function getDefaultCurrency(settings?: any): CurrencyCode {
  const value = settings?.default_currency;

  if (value === "USD" || value === "KES") {
    return value;
  }

  return "USD";
}

export function getStoredCurrency(
  settings?: any
): CurrencyCode {
  if (typeof window === "undefined") {
    return getDefaultCurrency(settings);
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === "USD" || stored === "KES") {
    return stored;
  }

  return getDefaultCurrency(settings);
}

export function setStoredCurrency(
  currency: CurrencyCode
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORAGE_KEY, currency);
}

/**
 * NEW
 * Returns the Currency object.
 */
export function getCurrency(
  code: CurrencyCode
): Currency {
  return currencies[code];
}

/**
 * Backwards compatible.
 * Returns the currency CODE.
 *
 * Existing code:
 * const activeCurrency = resolveActiveCurrency(...)
 *
 * will continue working.
 */
export function resolveActiveCurrency(
  settings?: any,
  userPreference?: CurrencyCode,
  localCurrency?: CurrencyCode
): CurrencyCode {
  if (userPreference) return userPreference;

  if (localCurrency) return localCurrency;

  return getStoredCurrency(settings);
}

export function getCurrencySymbol(
  currency: CurrencyCode
) {
  return currencies[currency].symbol;
}

export function getCurrencyName(
  currency: CurrencyCode
) {
  return currencies[currency].name;
}

export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "USD"
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}