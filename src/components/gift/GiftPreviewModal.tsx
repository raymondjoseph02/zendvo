"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, Lock, EyeOff, Calendar } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface GiftPreviewData {
  recipientName: string;
  senderName?: string;
  amount: string;
  currency?: string;
  message: string;
  hideAmount: boolean;
  unlockDate?: string;
  unlockTime?: string;
}

interface GiftPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: GiftPreviewData;
}

const GiftPreviewModal: React.FC<GiftPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // The close button is the natural first focus target when the modal opens —
  // this gives keyboard users an immediate, discoverable way to dismiss it.
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // ── Focus trap: constrains Tab/Shift+Tab to the modal panel ──────────────
  useFocusTrap(modalRef, isOpen, { initialFocusRef: closeButtonRef });

  // ── Escape key + body-scroll lock ─────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const amountNum = parseFloat(data.amount) || 0;
  const formattedAmount = amountNum.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const currency = data.currency ?? "USD";

  const hasSchedule = !!(data.unlockDate || data.unlockTime);
  const scheduleLabel = [data.unlockDate, data.unlockTime]
    .filter(Boolean)
    .join(" at ");

  return (
    <AnimatePresence>
      {isOpen && (
        /* ── Backdrop ── */
        <motion.div
          key="preview-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          // Clicking the backdrop closes the modal
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          // Prevent focus from escaping to the backdrop itself
          aria-hidden="true"
        >
          {/* ── Modal panel ── */}
          <motion.div
            key="preview-panel"
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.93, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[420px] bg-white rounded-3xl shadow-2xl overflow-hidden focus:outline-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-modal-title"
            // tabIndex={-1} lets the container receive programmatic focus as a
            // fallback if no focusable child is found inside.
            tabIndex={-1}
            // Stop clicks inside the panel from bubbling to the backdrop
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header bar ── */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#EEEEF3]">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#5A42DE] mb-0.5">
                  Preview
                </p>
                <h2
                  id="preview-modal-title"
                  className="text-[18px] font-semibold text-[#18181B] leading-tight"
                >
                  Recipient&apos;s View
                </h2>
              </div>

              {/* Close button — receives initial focus when modal opens */}
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="p-1.5 rounded-full text-[#717182] hover:text-[#18181B] hover:bg-[#F4F4F6] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5A42DE]/30"
                aria-label="Close preview"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* ── Recipient card (the "gift envelope") ── */}
            <div className="px-5 pt-5 pb-6 space-y-4">

              {/* Gift top visual */}
              <div className="relative w-full h-[140px] rounded-2xl bg-gradient-to-br from-[#5A42DE] via-[#7B63F0] to-[#9B7FF8] flex flex-col items-center justify-center overflow-hidden">
                {/* Decorative ribbon */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/20" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-white/20" />
                {/* Bow node */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white/40 rounded-full ring-2 ring-white/60" />

                <Gift size={40} className="text-white/90 mb-2" strokeWidth={1.5} />
                <p className="text-white/80 text-[12px] font-medium tracking-wide">
                  You received a gift!
                </p>
              </div>

              {/* To line */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#9CA3AF]">To:</span>
                <span className="text-[14px] font-semibold text-[#18181B]">
                  {data.recipientName || "Recipient"}
                </span>
              </div>

              {/* From line */}
              {data.senderName && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-[#9CA3AF]">From:</span>
                  <span className="text-[14px] font-medium text-[#18181B]">
                    {data.senderName}
                  </span>
                </div>
              )}

              {/* Amount panel */}
              <div className="rounded-2xl border border-[#EEEEF3] bg-[#FAFAFB] p-4">
                {data.hideAmount ? (
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#F1EDFF] flex items-center justify-center shrink-0">
                      <EyeOff size={16} className="text-[#5A42DE]" />
                    </div>
                    <div>
                      <p className="text-[12px] text-[#717182]">Gift amount</p>
                      <p className="text-[13px] font-semibold text-[#18181B]">
                        Hidden until unlock
                      </p>
                    </div>
                  </div>
                ) : amountNum > 0 ? (
                  <div>
                    <p className="text-[11px] text-[#9CA3AF] mb-1">Gift amount</p>
                    <p className="text-[32px] font-bold text-[#18181B] leading-none tracking-tight">
                      {currency === "USD" ? "$" : currency}{" "}
                      {formattedAmount}
                    </p>
                  </div>
                ) : (
                  <p className="text-[13px] text-[#C6C7CF] italic">
                    Amount not set yet
                  </p>
                )}
              </div>

              {/* Scheduled delivery badge */}
              {hasSchedule && (
                <div className="flex items-center gap-2.5 rounded-xl bg-[#FFF7ED] border border-[#FDE8C8] px-3.5 py-2.5">
                  <Lock size={14} className="text-[#F59E0B] shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-[#92400E]">
                      Scheduled delivery
                    </p>
                    <p className="text-[11px] text-[#B45309] flex items-center gap-1 mt-0.5">
                      <Calendar size={10} />
                      {scheduleLabel}
                    </p>
                  </div>
                </div>
              )}

              {/* Message */}
              {data.message ? (
                <div>
                  <p className="text-[11px] text-[#9CA3AF] mb-1.5 px-1">
                    Message
                  </p>
                  <div className="rounded-xl border border-[#EEEEF3] bg-white px-4 py-3">
                    <p className="text-[13px] text-[#18181B] leading-relaxed whitespace-pre-wrap">
                      {data.message}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#EEEEF3] bg-white px-4 py-3">
                  <p className="text-[13px] text-[#C6C7CF] italic">
                    No message yet…
                  </p>
                </div>
              )}

              {/* Claim button (non-functional – decorative) */}
              <button
                disabled
                className="w-full h-11 rounded-xl bg-[#5A42DE] text-white text-[14px] font-semibold opacity-60 cursor-not-allowed select-none"
                // Explicitly excluded from tab order since it is non-functional
                tabIndex={-1}
                aria-hidden="true"
              >
                Claim Gift
              </button>

              <p className="text-center text-[10px] text-[#9CA3AF]">
                This is a preview — the recipient will see this after you pay.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GiftPreviewModal;