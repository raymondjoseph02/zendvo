"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#F7F7FC] p-8 flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-20 h-20 bg-[#ECEFFE] rounded-full flex items-center justify-center text-[#5A42DE]">
        <Settings size={40} />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-[#18181B]">Account Settings</h1>
        <p className="text-[#717182] max-w-md mx-auto">
          We&apos;re fine-tuning the controls. You&apos;ll soon be able to customize your
          profile, safety preferences, and notification settings right here.
        </p>
      </div>

      <div className="pt-4">
        <Link
          href="/dashboard/sender"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#5A42DE] text-white rounded-xl font-medium hover:bg-[#4b35e5] transition-all shadow-lg shadow-[#5A42DE]/20"
        >
          <ChevronLeft size={20} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
