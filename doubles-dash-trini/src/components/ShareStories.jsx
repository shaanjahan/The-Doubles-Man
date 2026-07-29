import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import html2canvas from 'html2canvas';
import { Instagram, Loader2 } from 'lucide-react';
import { usePlayerState } from '@/lib/game/PlayerContext';

const GAME_NAME = 'The Doubles Man';

/**
 * ShareToStories — captures a branded 9:16 score/rank card and shares it.
 * Preferred path: native Web Share API (lets the user pick Instagram /
 * WhatsApp / etc.). Fallback: upload the card and open the Instagram
 * Stories deep link with it as the background image.
 *
 * Props:
 *  headline  — small uppercase label (e.g. "My Round Score")
 *  big       — the headline number / string (e.g. score or "#3")
 *  bigLabel  — caption under the big number (e.g. "points")
 *  subline   — supporting line (e.g. "Served 8 · Perfect 6 · 5x combo")
 *  emoji     — big mood emoji on the card
 *  footer    — chip text at the bottom (e.g. "Beat my score!")
 */
export default function ShareStories({
  headline,
  big,
  bigLabel,
  subline,
  footer = 'Beat my score!',
  emoji = '🥘',
}) {
  const cardRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const { trackInvite } = usePlayerState();

  async function buildBlob() {
    const el = cardRef.current;
    const canvas = await html2canvas(el, {
      useCORS: true,
      backgroundColor: '#0b0b0d',
      scale: 2,
    });
    return await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png')
    );
  }

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await buildBlob();
      const file = new File([blob], 'doubles_score.png', { type: 'image/png' });

      // Preferred: native share sheet with the image (reaches IG / WhatsApp / etc.)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: GAME_NAME,
            text: `${headline}: ${big} ${bigLabel || ''}`.trim(),
          });
          trackInvite?.();
          return;
        } catch (_) {
          // user dismissed the sheet — fall through to deep link
        }
      }

      // Fallback: Instagram Stories deep link with an uploaded background
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      trackInvite?.();
      window.location.href =
        `instagram-stories://share?background_image_url=${encodeURIComponent(file_url)}` +
        `&background_topcolor=b3382c&background-bottomcolor=b45309`;
    } catch (err) {
      console.error('Share failed:', err);
      alert('Sharing is not available on this device right now.');
    } finally {
      setBusy(false);
    }
  }

  // TikTok has no image deep link, so save the card to the device then open
  // the app/web — the user posts the saved image as a story / post.
  async function handleTikTok() {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await buildBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'doubles_score.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Best-effort open of the TikTok app; falls back to the web site.
      const start = Date.now();
      trackInvite?.();
      window.location.href = 'tiktok://';
      setTimeout(() => {
        if (Date.now() - start < 2200) window.open('https://www.tiktok.com', '_blank');
      }, 2000);
    } catch (err) {
      console.error('TikTok share failed:', err);
      alert('Sharing is not available on this device right now.');
    } finally {
      setBusy(false);
    }
  }

  // Facebook can't take a raw image via web link, so save the card to the
  // device then open the app/web for the user to attach and post.
  async function handleFacebook() {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await buildBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'doubles_score.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      const start = Date.now();
      trackInvite?.();
      window.location.href = 'fb://';
      setTimeout(() => {
        if (Date.now() - start < 2200) window.open('https://www.facebook.com', '_blank');
      }, 2000);
    } catch (err) {
      console.error('Facebook share failed:', err);
      alert('Sharing is not available on this device right now.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-2 w-full">
        <button
          onClick={handleShare}
          type="button"
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-500 to-amber-500 text-white font-extrabold py-2.5 rounded-xl shadow active:scale-95 transition disabled:opacity-70 no-tap-highlight"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Instagram size={18} />}
          {busy ? 'Preparing…' : 'Stories'}
        </button>
        <button
          onClick={handleTikTok}
          type="button"
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-extrabold py-2.5 rounded-xl shadow active:scale-95 transition disabled:opacity-70 no-tap-highlight"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.5 3c.3 2.1 1.5 3.8 3.5 4.2v3c-1.3 0-2.6-.4-3.6-1.1v6.2c0 3.2-2.6 5.7-5.8 5.7S4.8 18.5 4.8 15.3 7.4 9.6 10.6 9.6c.3 0 .6 0 .9.1v3.1c-.3-.1-.6-.1-.9-.1-1.4 0-2.6 1.1-2.6 2.6s1.1 2.6 2.6 2.6 2.6-1.1 2.6-2.6V3h3.3z"/>
            </svg>
          )}
          TikTok
        </button>
        <button
          onClick={handleFacebook}
          type="button"
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 bg-[#1877f2] text-white font-extrabold py-2.5 rounded-xl shadow active:scale-95 transition disabled:opacity-70 no-tap-highlight"
        >
          {busy ? <Loader2 size={18} className="animate-spin" /> : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.3-1.5 1.6-1.5h1.6V3.6c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4v2.4H8.1V13h2.2v8h3.2z"/>
            </svg>
          )}
          Facebook
        </button>
      </div>

      {/* Offscreen share card captured by html2canvas (no external images => no CORS taint) */}
      <div aria-hidden style={{ position: 'fixed', left: '-99999px', top: 0, pointerEvents: 'none' }}>
        <div
          ref={cardRef}
          className="w-[300px] h-[534px] rounded-[28px] p-6 flex flex-col items-center justify-between text-center"
          style={{
            fontFamily: 'Nunito, ui-sans-serif, system-ui, sans-serif',
            background: 'linear-gradient(160deg, #b3382c 0%, #d2691e 45%, #e6b94a 100%)',
            color: '#ffffff',
          }}
        >
          <div className="mt-1">
            <div className="text-4xl leading-none drop-shadow">{emoji}</div>
            <div className="font-extrabold text-xl tracking-wide drop-shadow mt-2">{GAME_NAME}</div>
          </div>
          <div className="my-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">{headline}</div>
            <div className="text-6xl font-extrabold leading-none drop-shadow mt-2">{big}</div>
            {bigLabel && <div className="text-sm font-bold text-white/85 mt-1">{bigLabel}</div>}
          </div>
          {subline && <div className="text-xs font-bold text-white/85 px-4 leading-snug">{subline}</div>}
          <div className="mb-1 mt-3 px-4 py-1.5 bg-black/30 rounded-full text-[11px] font-extrabold uppercase tracking-wide">
            {footer}
          </div>
        </div>
      </div>
    </>
  );
}