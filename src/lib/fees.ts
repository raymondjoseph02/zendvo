export interface FeeConfig {
  type: "flat" | "percentage";
  value: number;
  minFee?: number;
  maxFee?: number;
}

const DEFAULT_FEE_CONFIG: FeeConfig = {
  type: "percentage",
  value: 2.5,
  minFee: 50,
  maxFee: 5000,
};

export function calculateProcessingFee(
  amount: number,
  config: FeeConfig = DEFAULT_FEE_CONFIG,
): number {
  let fee: number;

  if (config.type === "flat") {
    fee = config.value;
  } else {
    fee = (amount * config.value) / 100;
  }

  if (config.minFee !== undefined && fee < config.minFee) {
    fee = config.minFee;
  }

  if (config.maxFee !== undefined && fee > config.maxFee) {
    fee = config.maxFee;
  }

  return Math.round(fee * 100) / 100;
}

/**
 * Calculate Zendvo platform fee (2% of gift amount)
 * @param amount - The base gift amount
 * @returns The platform fee amount (2% of the input amount)
 */
export function calculateFee(amount: number): number {
  const fee = (amount * 2) / 100;
  return Math.round(fee * 100) / 100;
}
