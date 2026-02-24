"use client";

import React from "react";
import Button from "@/components/Button";
import Card from "@/components/Card";

interface ReviewGiftDetailsProps {
  recipientName: string;
  recipientPhone: string;
  giftAmount: number;
  message?: string;
  unlockDate?: string;
  onEdit: () => void;
  onProceed: () => void;
  isLoading?: boolean;
}

const ReviewGiftDetails: React.FC<ReviewGiftDetailsProps> = ({
  recipientName,
  recipientPhone,
  giftAmount,
  message,
  unlockDate,
  onEdit,
  onProceed,
  isLoading = false,
}) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Review Gift Details
        </h1>
        <p className="text-gray-600">
          Please review your gift details before sending
        </p>
      </div>

      <Card className="mb-6">
        <div className="space-y-6">
          {/* Gift Amount */}
          <div className="text-center py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500 mb-2">Gift Amount</p>
            <p className="text-4xl font-bold text-[#6c5ce7]">
              {formatAmount(giftAmount)}
            </p>
          </div>

          {/* Recipient Details */}
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 mb-1">Recipient</p>
                <p className="font-semibold text-gray-900">{recipientName}</p>
                <p className="text-sm text-gray-600">{recipientPhone}</p>
              </div>
              <button
                onClick={onEdit}
                className="text-sm text-[#6c5ce7] hover:underline font-medium"
                disabled={isLoading}
              >
                Edit
              </button>
            </div>

            {/* Unlock Date */}
            {unlockDate && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Unlock Date</p>
                <p className="font-medium text-gray-900">{unlockDate}</p>
              </div>
            )}

            {/* Message */}
            {message && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Message</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {message}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={onProceed}
        isLoading={isLoading}
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : "Proceed to Payment"}
      </Button>
    </div>
  );
};

export default ReviewGiftDetails;
