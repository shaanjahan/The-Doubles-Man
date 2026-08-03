import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Instagram, Loader2 } from 'lucide-react';
import { usePlayerState } from '@/lib/game/PlayerContext';

const GAME_NAME = 'The Doubles Man';
const LOGO_URL = '/game/6b677e427_A36ED237-6A52-436C-A969-12B05F2D0EFD.webp';
const SCENE_URL = '/game/0d9719541_1336D320-FC46-4E41-BD87-2AACAC7E4A74.webp';

const BANGERS = "'Bangers', ui-sans-serif, system-ui, sans-serif";
const NUNITO = "'Nunito', ui-sans-serif, system-ui, sans-serif";

/**
 * ShareToStories — captures a branded 9:16 score/rank card and shares it.
 * Preferred path: native Web Share API (lets the user pick Instagram /
 * WhatsApp / etc.). Fallback: save the card to the device, then best-effort
 * open Instagram so the user can post it.
 *
 * Props:
 *  variant   — card art: 'score' (round finish, street-scene art) or
 *              'rank' (leaderboard, big logo badge). Default 'score'.
 *  headline  — small uppercase label (e.g. "My Round Score")
 *  big       — the headline number / string (e.g. score or "#3")
 *  bigLabel  — caption under the big number (e.g. "points")
 *  subline   — supporting line (e.g. "Served 8 · Perfect 6 · 5x combo")
 *  emoji     — mood emoji shown beside the headline
 *  footer    — chip text at the bottom (e.g. "Beat my score!")
 */
export default function ShareStories({
  variant = 'score',
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
    // The card leans on Bangers + same-origin art; make sure both are actually
    // loaded before the capture or html2canvas paints fallback fonts / blanks.
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load(`400 16px Bangers`).catch(() => {}),
      ...Array.from(el.querySelectorAll('img')).map((img) =>
        img.decode ? img.decode().catch(() => {}) : Promise.resolve()
      ),
    ]);
    const canvas = await html2canvas(el, {
      useCORS: true,
      backgroundColor: '#0b0b0d',
      scale: 2,
    });
    return await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png')
    );
  }

  function saveToDevice(blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'doubles_score.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
          // user dismissed the sheet — fall through to save + open Instagram
        }
      }

      // Fallback: save the card locally, then best-effort open Instagram.
      saveToDevice(blob);
      trackInvite?.();
      const start = Date.now();
      window.location.href = 'instagram://story-camera';
      setTimeout(() => {
        if (Date.now() - start < 2200) window.open('https://www.instagram.com', '_blank');
      }, 2000);
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
      saveToDevice(blob);

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
      saveToDevice(blob);

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

  const isRank = variant === 'rank';

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

      {/* Offscreen share card captured by html2canvas. All art is same-origin
          (/game/*) so the canvas never taints. Two looks: 'rank' = brand
          gradient + big logo badge; 'score' = sunset street scene. */}
      <div aria-hidden style={{ position: 'fixed', left: '-99999px', top: 0, pointerEvents: 'none' }}>
        <div
          ref={cardRef}
          className="w-[300px] h-[534px] rounded-[28px] overflow-hidden relative flex flex-col items-center text-center"
          style={{
            fontFamily: NUNITO,
            background: 'linear-gradient(165deg, #7f1d1d 0%, #b3382c 30%, #d2691e 65%, #e6b94a 100%)',
            color: '#ffffff',
          }}
        >
          {/* Score variant: full-bleed street scene under a legibility gradient */}
          {!isRank && (
            <>
              <img
                src={SCENE_URL}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(180deg, rgba(10,6,4,0.55) 0%, rgba(10,6,4,0.15) 38%, rgba(10,6,4,0.35) 62%, rgba(10,6,4,0.78) 100%)' }}
              />
            </>
          )}

          <div className="relative flex flex-col items-center justify-between h-full w-full p-5">
            {/* Header: logo badge + wordmark */}
            <div className="flex flex-col items-center">
              <div
                className="rounded-full overflow-hidden"
                style={{
                  width: isRank ? 128 : 84,
                  height: isRank ? 128 : 84,
                  border: '3px solid #fbbf24',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
                }}
              >
                <img src={LOGO_URL} alt={GAME_NAME} className="w-full h-full object-cover" />
              </div>
              <div
                className="mt-2 leading-none"
                style={{
                  fontFamily: BANGERS,
                  fontSize: 30,
                  letterSpacing: '0.06em',
                  textShadow: '2px 2px 0 rgba(0,0,0,0.55)',
                }}
              >
                {GAME_NAME.toUpperCase()}
              </div>
            </div>

            {/* Body: headline + big number */}
            <div className="flex flex-col items-center">
              <div
                className="uppercase font-extrabold"
                style={{ fontSize: 12, letterSpacing: '0.22em', color: '#fde68a', textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
              >
                {emoji} {headline} {emoji}
              </div>
              <div
                className="leading-none mt-2"
                style={{
                  fontFamily: BANGERS,
                  fontSize: isRank ? 96 : 72,
                  color: '#fbbf24',
                  textShadow: '4px 4px 0 rgba(0,0,0,0.55)',
                }}
              >
                {big}
              </div>
              {bigLabel && (
                <div className="font-extrabold mt-1" style={{ fontSize: 15, textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
                  {bigLabel}
                </div>
              )}
              {subline && (
                <div
                  className="font-bold mt-3 px-3 py-1.5 rounded-full"
                  style={{ fontSize: 12, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(251,191,36,0.5)' }}
                >
                  {subline}
                </div>
              )}
            </div>

            {/* Footer: challenge chip + handle */}
            <div className="flex flex-col items-center">
              <div
                className="px-5 py-2 rounded-full"
                style={{
                  fontFamily: BANGERS,
                  fontSize: 17,
                  letterSpacing: '0.05em',
                  background: 'rgba(0,0,0,0.45)',
                  border: '2px solid #fbbf24',
                  color: '#fde68a',
                  textShadow: '1px 1px 0 rgba(0,0,0,0.6)',
                }}
              >
                {footer}
              </div>
              <div className="mt-2 font-bold" style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>
                🇹🇹 thedoublesman.com 🇬🇾
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
