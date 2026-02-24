"use client";

import React, { useState } from "react";
import ReviewGiftDetails from "@/components/gift/ReviewGiftDetails";

export default function CreateGiftPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = () => {
    console.log("Edit clicked - navigate back to form");
  };

  const handleProceed = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Proceeding to payment...");
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ReviewGiftDetails
        recipientName="John Doe"
        recipientPhone="+234 801 234 5678"
        giftAmount={214}
        message="Happy Birthday! Hope you have an amazing day filled with joy and laughter. Can't wait to celebrate with you!"
        unlockDate="December 25, 2026 at 12:00 PM"
        onEdit={handleEdit}
        onProceed={handleProceed}
        isLoading={isLoading}
      />
    </div>
  );
}
