import { createPaymentSummary } from "@/lib/paymentSummary";

describe("createPaymentSummary", () => {
  it("calculates a complete Stripe fee breakdown for USD", () => {
    expect(createPaymentSummary(100, "usd", "stripe")).toEqual({
      baseAmount: { amount: 100, currency: "USD" },
      platformFee: { amount: 5, currency: "USD" },
      providerFee: { amount: 3.2, currency: "USD" },
      totalAmount: { amount: 108.2, currency: "USD" },
    });
  });

  it("applies Paystack percentage and flat NGN fee", () => {
    expect(createPaymentSummary(10000, "ngn", "paystack")).toEqual({
      baseAmount: { amount: 10000, currency: "NGN" },
      platformFee: { amount: 350, currency: "NGN" },
      providerFee: { amount: 250, currency: "NGN" },
      totalAmount: { amount: 10600, currency: "NGN" },
    });
  });

  it("falls back to the default platform rate for unsupported currencies", () => {
    expect(createPaymentSummary(50, "eur", "stripe")).toEqual({
      baseAmount: { amount: 50, currency: "EUR" },
      platformFee: { amount: 2, currency: "EUR" },
      providerFee: { amount: 1.45, currency: "EUR" },
      totalAmount: { amount: 53.45, currency: "EUR" },
    });
  });

  it("rounds fractional amounts consistently", () => {
    expect(createPaymentSummary(12.345, "usd", "stripe")).toEqual({
      baseAmount: { amount: 12.35, currency: "USD" },
      platformFee: { amount: 0.62, currency: "USD" },
      providerFee: { amount: 0.66, currency: "USD" },
      totalAmount: { amount: 13.63, currency: "USD" },
    });
  });

  it("rejects invalid base amounts", () => {
    expect(() => createPaymentSummary(-1, "usd", "stripe")).toThrow(
      "Base amount must be a non-negative finite number",
    );
  });

  it("rejects blank currencies", () => {
    expect(() => createPaymentSummary(10, "   ", "stripe")).toThrow(
      "Currency is required",
    );
  });
});
