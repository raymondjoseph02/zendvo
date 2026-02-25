"use client";

import React from "react";
import Button from "@/components/Button";

interface ReviewGiftDetailsProps {
  recipientName: string;
  recipientPhone: string;
  amount: number;
  processingFee: number;
  hideAmountUntilUnlock: boolean;
  anonymousUntilUnlock: boolean;
  unlockLabel: string;
  message: string;
  onProceed: () => void;
  isLoading?: boolean;
}

const rowLabel = "text-[12px] text-[#18181B]";
const rowValue = "text-[12px] text-[#717182] text-right";

const ReviewGiftDetails: React.FC<ReviewGiftDetailsProps> = ({
  recipientName,
  recipientPhone,
  amount,
  processingFee,
  hideAmountUntilUnlock,
  anonymousUntilUnlock,
  unlockLabel,
  message,
  onProceed,
  isLoading = false,
}) => {
  const total = amount + processingFee;

  return (
    <div className="w-full px-3 py-6 md:py-8">
      <div className="w-full max-w-[360px] mx-auto rounded-3xl bg-[#FAFAFB] border border-[#EEEEF3] p-4 md:p-5">
        <h2 className="text-[32px] leading-7 font-semibold text-[#18181B]">
          Review Gift details
        </h2>
        <p className="text-[10px] leading-4 text-[#717182] mt-2">
          Please review all details carefully, transactions once completed are
          irreversible
        </p>

        <div className="mt-4 rounded-2xl border border-[#EEEEF3] bg-white p-3 space-y-2">
          <div className="flex justify-between items-start">
            <p className={rowLabel}>Recipient</p>
            <div className={rowValue}>
              <p>{recipientName}</p>
              <p>{recipientPhone}</p>
            </div>
          </div>
          <div className="flex justify-between">
            <p className={rowLabel}>Amount</p>
            <p className={rowValue}>${amount}</p>
          </div>
          <div className="flex justify-between">
            <p className={rowLabel}>Processing Fee</p>
            <p className={rowValue}>${processingFee}</p>
          </div>
          <div className="flex justify-between items-end border-t border-[#EEEEF3] pt-2">
            <p className={rowLabel}>Total Amount</p>
            <p className="text-[40px] leading-8 text-[#18181B] font-medium">
              ${total}
            </p>
          </div>
          <div className="flex justify-between pt-2 border-t border-[#EEEEF3]">
            <p className={rowLabel}>Amount Privacy</p>
            <p className={rowValue}>
              {hideAmountUntilUnlock ? "Hide amount sent" : "Visible"}
            </p>
          </div>
          <div className="flex justify-between">
            <p className={rowLabel}>Sender Privacy</p>
            <p className={rowValue}>
              {anonymousUntilUnlock ? "Anonymous" : "Identified"}
            </p>
          </div>
          <div className="flex justify-between">
            <p className={rowLabel}>Unlock date and time</p>
            <p className={rowValue}>{unlockLabel}</p>
          </div>
          <div className="space-y-1">
            <p className={rowLabel}>Message for the sender</p>
            <p className="text-[12px] text-[#717182]">{message || "-"}</p>
          </div>
        </div>

        <p className="text-[10px] text-[#717182] mt-4">
          By proceeding, you have accepted{" "}
          <span className="text-[#5A42DE] font-medium">Zendvo terms</span> and{" "}
          <span className="text-[#5A42DE] font-medium">Privacy Policy</span>
        </p>

        <Button
          onClick={onProceed}
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full mt-3 h-8 rounded-[8px] bg-[#5A42DE] hover:bg-[#4E37CC] text-[11px]"
        >
          Proceed
        </Button>
      </div>
    </div>
  );
};

export default ReviewGiftDetails;
