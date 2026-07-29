// A scroll-to-acknowledge legal modal: shows the full Terms or Privacy text in
// a scroll box, enables the "I Acknowledge" button only once the reader reaches
// the bottom, and calls onAcknowledge.
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AgreementModal({ open, onOpenChange, title, content, onAcknowledge }) {
  const scrollRef = useRef(null);
  const [reached, setReached] = useState(false);

  // Reset scroll state every time the modal opens.
  useEffect(() => {
    if (open) {
      setReached(false);
      const el = scrollRef.current;
      if (el) {
        // Short content could already fit without scrolling — count it as read.
        requestAnimationFrame(() => {
          if (el.scrollHeight - el.clientHeight <= 8) setReached(true);
        });
      }
    }
  }, [open]);

  const handleScroll = (e) => {
    const el = e.currentTarget;
    if (!reached && el.scrollHeight - el.scrollTop - el.clientHeight <= 16) {
      setReached(true);
    }
  };

  const acknowledge = () => {
    onAcknowledge?.();
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] w-[calc(100vw-1.5rem)] max-h-[88dvh] p-0 gap-0 rounded-2xl overflow-hidden bg-zinc-950 border-white/10 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-2 shrink-0">
          <DialogTitle className="text-tropic-gold font-heading tracking-wide">{title}</DialogTitle>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="doc-content px-5 overflow-y-auto flex-1 max-h-[64dvh] touch-pan-y"
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        <div className="shrink-0 border-t border-white/10 p-3 bg-zinc-950">
          <p className="text-[11px] text-white/50 text-center mb-2">
            {reached ? 'You have read this document.' : 'Scroll to the bottom to acknowledge.'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              className="flex-1 rounded-full px-4 py-3 text-sm font-bold bg-white/10 text-white hover:bg-white/20 transition"
            >
              Close
            </button>
            <button
              type="button"
              onClick={acknowledge}
              disabled={!reached}
              className="flex-1 rounded-full px-4 py-3 text-sm font-extrabold bg-tropic-gold text-black hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              I Acknowledge
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}