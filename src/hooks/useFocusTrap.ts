import { useEffect, useRef } from "react";

/**
 * Selectors for all natively focusable elements.
 * Excludes disabled elements and elements with tabIndex < 0.
 */
const FOCUSABLE_SELECTORS = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  "details > summary",
].join(", ");

/**
 * Returns all focusable elements within a container, in DOM order.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.closest("[hidden]") && getComputedStyle(el).display !== "none"
  );
}

/**
 * useFocusTrap
 *
 * Traps keyboard focus within `containerRef` while `isActive` is true.
 *
 * Behaviour:
 * - On activation: saves the previously focused element and moves focus to
 *   the first focusable child (or the container itself as a fallback).
 * - While active: Tab / Shift+Tab cycle strictly within the container.
 * - On deactivation: restores focus to the element that was focused before
 *   the trap was activated.
 *
 * @param containerRef  Ref to the modal/dialog DOM node.
 * @param isActive      Whether the trap should be engaged.
 * @param options.initialFocusRef  Optional ref to the element that should
 *                                 receive initial focus (overrides first-focusable).
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  options?: { initialFocusRef?: React.RefObject<HTMLElement | null> }
) {
  // Remember what was focused before the modal opened
  const previouslyFocusedRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // 1. Save current focus so we can restore it on close
    previouslyFocusedRef.current = document.activeElement;

    // 2. Move focus into the modal
    const moveFocusIn = () => {
      const preferredEl = options?.initialFocusRef?.current;
      if (preferredEl) {
        preferredEl.focus();
        return;
      }
      const focusable = getFocusableElements(container);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        // Fallback: focus the container itself
        container.focus();
      }
    };

    // Small delay lets AnimatePresence finish mounting before we steal focus
    const rafId = requestAnimationFrame(moveFocusIn);

    // 3. Intercept Tab / Shift+Tab
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if focus is on (or before) the first element, wrap to last
        if (document.activeElement === firstEl || !container.contains(document.activeElement)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        // Tab: if focus is on (or after) the last element, wrap to first
        if (document.activeElement === lastEl || !container.contains(document.activeElement)) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    // Listen on the container so it works even when the backdrop intercepts events
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", handleKeyDown);

      // 4. Restore focus to the element that was active before the modal opened
      if (
        previouslyFocusedRef.current &&
        typeof (previouslyFocusedRef.current as HTMLElement).focus === "function"
      ) {
        (previouslyFocusedRef.current as HTMLElement).focus();
      }
    };
  }, [isActive, containerRef, options?.initialFocusRef]);
}