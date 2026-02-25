"use client";

import React from "react";
import { ThumbsUp } from "lucide-react";
import Button from "@/components/Button";

interface EmailVerificationSuccessProps {
  email: string;
  onContinue: () => void;
  isLoading?: boolean;
}

export const EmailVerificationSuccess: React.FC<EmailVerificationSuccessProps> = ({
  email,
  onContinue,
  isLoading = false,
}) => {
  return (
    <div className="w-full flex-1 flex flex-col h-full lg:h-auto">
      <div className="flex-1 lg:flex-none flex flex-col items-center justify-center text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-[120px] h-[120px] bg-gradient-to-br from-[#A59AFF] to-[#7C6FFF] rounded-full flex items-center justify-center relative">
            <div className="w-[104px] h-[104px] bg-[#6C5CE7] rounded-full flex items-center justify-center shadow-lg">
              <ThumbsUp className="w-12 h-12 text-white" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="mb-8 md:mb-9">
          <h1 className="text-[22px] md:text-[24px] font-bold text-[#18181B] mb-3 md:mb-4 leading-tight">
            Email verified successfully!
          </h1>
          <p className="text-[14px] md:text-[15px] text-[#52525B] leading-relaxed px-2 max-w-md mx-auto">
            Your email address{" "}
            <span className="font-medium text-[#18181B]">{email}</span>{" "}
            has been verified. You can now access your account.
          </p>
        </div>
      </div>

      {/* Continue Button */}
      <div className="flex flex-col items-center gap-6 mt-auto lg:mt-0 w-full">
        <Button
          variant="primary"
          className="w-full py-[18px] md:py-5 text-[15px] md:text-[16px] font-semibold rounded-[14px] md:rounded-[16px] bg-[#6C5CE7] hover:bg-[#5B4BC4] transition-all duration-200"
          onClick={onContinue}
          isLoading={isLoading}
        >
          Create New Password
        </Button>
      </div>
    </div>
  );
};