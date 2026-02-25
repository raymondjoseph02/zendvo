"use client";

import React, { useState } from "react";
import Image from "next/image";
import Button from "@/components/Button";
import { Check, X } from "lucide-react";

type GiftSuccessModalProps = {
  recipientName: string;
  onClose: () => void;
};

const GiftSuccessModal: React.FC<GiftSuccessModalProps> = ({
  recipientName,
  onClose,
}) => {
  const [gifFailed, setGifFailed] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-[#4D4D52]/75 grid place-items-center p-4 sm:p-6">
      <div className="w-full max-w-63.75 sm:max-w-107.5 rounded-2xl bg-white px-4 py-3 sm:px-5 sm:py-4">
        <div className="sm:hidden">
          <div className="flex items-center justify-between">
            <h3
              className="text-[16px] leading-6 text-[#18181B]"
              style={{ fontFamily: "BR Firma, sans-serif", fontWeight: 500 }}
            >
              Modal Name
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="text-[#A1A1AA] hover:text-[#717182]"
              aria-label="Close modal"
            >
              <X size={14} />
            </button>
          </div>
          <div className="mt-2 border-t border-[#ECECF1]" />
        </div>

        <div className="hidden sm:block">
          <button
            type="button"
            onClick={onClose}
            className="text-[#717182] hover:text-[#52525B]"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="pt-5 sm:pt-4">
          <div className="size-12 sm:size-14 rounded-full border border-dashed border-[#3BC77E] grid place-items-center mx-auto">
            {!gifFailed ? (
              <Image
                src="/success-check.gif"
                alt="Success"
                width={36}
                height={36}
                className="size-8 sm:size-9 rounded-full object-cover"
                onError={() => setGifFailed(true)}
              />
            ) : (
              <div className="size-8 sm:size-9 rounded-full bg-[#22C55E] grid place-items-center">
                <Check size={18} className="text-white" />
              </div>
            )}
          </div>

          <h4
            className="text-center mt-4 sm:mt-5 text-[24px] sm:text-[30px] leading-7 text-[#18181B]"
            style={{ fontFamily: "BR Firma, sans-serif", fontWeight: 500 }}
          >
            Gift sent successfully
          </h4>
          <p className="text-center text-[10px] sm:text-[12px] text-[#717182] mt-2 px-2 sm:px-4">
            • You have successfully gifted {recipientName}. You will be
            receiving email shortly
          </p>

          <Button
            onClick={onClose}
            className="w-full mt-5 h-8 sm:h-9 rounded-[6px] sm:rounded-[8px] bg-[#5A42DE] hover:bg-[#4E37CC] text-[11px] sm:text-[12px]"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GiftSuccessModal;
