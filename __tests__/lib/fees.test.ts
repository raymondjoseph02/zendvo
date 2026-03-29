import { calculateProcessingFee, calculateFee, FeeConfig } from "@/lib/fees";

describe("calculateProcessingFee", () => {
  describe("percentage-based fees", () => {
    const config: FeeConfig = {
      type: "percentage",
      value: 2.5,
      minFee: 50,
      maxFee: 5000,
    };

    it("should calculate percentage fee correctly", () => {
      expect(calculateProcessingFee(10000, config)).toBe(250);
      expect(calculateProcessingFee(20000, config)).toBe(500);
      expect(calculateProcessingFee(100000, config)).toBe(2500);
    });

    it("should apply minimum fee when calculated fee is below minimum", () => {
      expect(calculateProcessingFee(1000, config)).toBe(50);
      expect(calculateProcessingFee(500, config)).toBe(50);
    });

    it("should apply maximum fee when calculated fee exceeds maximum", () => {
      expect(calculateProcessingFee(300000, config)).toBe(5000);
      expect(calculateProcessingFee(500000, config)).toBe(5000);
    });
  });

  describe("flat fees", () => {
    const config: FeeConfig = {
      type: "flat",
      value: 100,
    };

    it("should return flat fee regardless of amount", () => {
      expect(calculateProcessingFee(1000, config)).toBe(100);
      expect(calculateProcessingFee(10000, config)).toBe(100);
      expect(calculateProcessingFee(100000, config)).toBe(100);
    });
  });

  describe("default configuration", () => {
    it("should use default config when none provided", () => {
      expect(calculateProcessingFee(10000)).toBe(250);
      expect(calculateProcessingFee(1000)).toBe(50);
      expect(calculateProcessingFee(300000)).toBe(5000);
    });
  });

  describe("edge cases", () => {
    it("should handle zero amount", () => {
      expect(calculateProcessingFee(0)).toBe(50);
    });

    it("should round to 2 decimal places", () => {
      const config: FeeConfig = {
        type: "percentage",
        value: 2.75,
      };
      expect(calculateProcessingFee(1000, config)).toBe(27.5);
    });
  });
});

describe("calculateFee", () => {
  describe("2% platform fee calculation", () => {
    it("should calculate 2% fee correctly for whole numbers", () => {
      expect(calculateFee(100)).toBe(2);
      expect(calculateFee(1000)).toBe(20);
      expect(calculateFee(10000)).toBe(200);
    });

    it("should calculate 2% fee correctly for decimal amounts", () => {
      expect(calculateFee(100.5)).toBe(2.01);
      expect(calculateFee(99.99)).toBe(2);
      expect(calculateFee(123.45)).toBe(2.47);
    });

    it("should handle zero amount", () => {
      expect(calculateFee(0)).toBe(0);
    });

    it("should handle very small amounts", () => {
      expect(calculateFee(0.01)).toBe(0);
      expect(calculateFee(0.5)).toBe(0.01);
      expect(calculateFee(1)).toBe(0.02);
    });

    it("should handle large amounts", () => {
      expect(calculateFee(100000)).toBe(2000);
      expect(calculateFee(1000000)).toBe(20000);
    });

    it("should round to 2 decimal places to avoid floating-point errors", () => {
      // Test cases that might cause floating-point precision issues
      expect(calculateFee(0.1 + 0.2)).toBe(0.01); // 0.3 * 0.02 = 0.006, rounds to 0.01
      expect(calculateFee(33.33)).toBe(0.67); // 33.33 * 0.02 = 0.6666, rounds to 0.67
      expect(calculateFee(66.66)).toBe(1.33); // 66.66 * 0.02 = 1.3332, rounds to 1.33
    });

    it("should maintain precision for common gift amounts", () => {
      expect(calculateFee(50)).toBe(1);
      expect(calculateFee(75)).toBe(1.5);
      expect(calculateFee(150)).toBe(3);
      expect(calculateFee(250)).toBe(5);
      expect(calculateFee(500)).toBe(10);
      expect(calculateFee(1000)).toBe(20);
    });
  });
});
