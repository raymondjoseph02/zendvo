export type PaymentProvider = "stripe" | "paystack";

type MoneyBreakdown = {
  amount: number;
  currency: string;
};

export type PaymentSummary = {
  baseAmount: MoneyBreakdown;
  platformFee: MoneyBreakdown;
  providerFee: MoneyBreakdown;
  totalAmount: MoneyBreakdown;
};

type FeeRule = {
  percentage: number;
  flatByCurrency?: Partial<Record<string, number>>;
};

const DEFAULT_PLATFORM_RATE = 0.04;

const PLATFORM_RATE_BY_CURRENCY: Record<string, number> = {
  USD: 0.05,
  CAD: 0.045,
  GHS: 0.04,
  NGN: 0.035,
};

const PROVIDER_FEE_RULES: Record<PaymentProvider, FeeRule> = {
  stripe: {
    percentage: 0.029,
    flatByCurrency: {
      USD: 0.3,
      CAD: 0.3,
      GHS: 0,
      NGN: 0,
    },
  },
  paystack: {
    percentage: 0.015,
    flatByCurrency: {
      USD: 0,
      CAD: 0,
      GHS: 0,
      NGN: 100,
    },
  },
};

const roundCurrencyAmount = (amount: number): number =>
  Math.round((amount + Number.EPSILON) * 100) / 100;

const normalizeCurrency = (currency: string): string => currency.trim().toUpperCase();

export const createPaymentSummary = (
  baseAmount: number,
  currency: string,
  provider: PaymentProvider,
): PaymentSummary => {
  if (!Number.isFinite(baseAmount) || baseAmount < 0) {
    throw new Error("Base amount must be a non-negative finite number");
  }

  const normalizedCurrency = normalizeCurrency(currency);
  if (!normalizedCurrency) {
    throw new Error("Currency is required");
  }

  const providerRule = PROVIDER_FEE_RULES[provider];
  if (!providerRule) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  const platformRate =
    PLATFORM_RATE_BY_CURRENCY[normalizedCurrency] ?? DEFAULT_PLATFORM_RATE;
  const providerFlatFee = providerRule.flatByCurrency?.[normalizedCurrency] ?? 0;

  const roundedBaseAmount = roundCurrencyAmount(baseAmount);
  const platformFeeAmount = roundCurrencyAmount(roundedBaseAmount * platformRate);
  const providerFeeAmount = roundCurrencyAmount(
    roundedBaseAmount * providerRule.percentage + providerFlatFee,
  );
  const totalAmount = roundCurrencyAmount(
    roundedBaseAmount + platformFeeAmount + providerFeeAmount,
  );

  return {
    baseAmount: {
      amount: roundedBaseAmount,
      currency: normalizedCurrency,
    },
    platformFee: {
      amount: platformFeeAmount,
      currency: normalizedCurrency,
    },
    providerFee: {
      amount: providerFeeAmount,
      currency: normalizedCurrency,
    },
    totalAmount: {
      amount: totalAmount,
      currency: normalizedCurrency,
    },
  };
};
