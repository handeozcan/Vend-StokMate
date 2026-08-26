'use client';

import { useEffect, useRef } from 'react';

/**
 * Minimal toast: parent owns the message string (null = hidden). Auto-hides
 * after 4s. onClose is kept in a ref so an unstable parent callback never
 * restarts the timer.
 */
export function Toast({ message, onClose }: { message: string | null; onClose: () => void }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onCloseRef.current(), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm text-white shadow-lg"
    >
      {message}
    </div>
  );
}
