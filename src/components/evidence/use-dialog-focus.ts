'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableWithin(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

/**
 * Modal focus behaviour for the evidence drawer: move focus in on open, keep
 * Tab inside it, close on Escape, and put focus back where it came from.
 *
 * This is an acceptance criterion rather than a refinement — judges are told to
 * inspect the evidence by keyboard.
 */
export function useDialogFocus({
  open,
  containerRef,
  onClose,
}: {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}): void {
  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const initial = focusableWithin(container)[0];
    if (initial) initial.focus();
    else container.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = focusableWithin(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      const active = document.activeElement;
      const movingBackwards = event.shiftKey;

      if (!container.contains(active)) {
        event.preventDefault();
        (movingBackwards ? last : first).focus();
        return;
      }

      if (movingBackwards && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!movingBackwards && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [open, containerRef, onClose]);
}
