"use client";

import React, { useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface FocusTrapProps {
  /** Whether the trap is currently active (modal is open). */
  isActive: boolean;
  /** The element that should receive focus first. Falls back to the first focusable child. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  className?: string;
}

/**
 * FocusTrap
 *
 * Drop-in wrapper that constrains keyboard focus to its children
 * while `isActive` is true, and restores it on deactivation.
 *
 * Usage:
 * ```tsx
 * <FocusTrap isActive={isOpen}>
 *   <dialog>…modal content…</dialog>
 * </FocusTrap>
 * ```
 */
export const FocusTrap: React.FC<FocusTrapProps> = ({
  isActive,
  initialFocusRef,
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useFocusTrap(containerRef, isActive, { initialFocusRef });

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
};

export default FocusTrap;