import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AppleIcon from '@/components/AppleIcon';
import { APP_STORE_HTTPS, detectPlatform, trackLinkHit, openAppStore } from '@/lib/appStoreLink';

// thedoublesman.com/app — the smart social link. Detects the device, records
// the tap (?src=ig / story / whatsapp ... for attribution), then one-tap opens
// the App Store on iOS. Android/desktop visitors go to the /get landing page.
// A manual button stays on screen as the user-gesture fallback for in-app
// browsers that block the automatic attempt.
export default function AppRedirect() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    // Inside the native shell this page is meaningless — go home.
    if (window.NativeIAP?.available) {
      navigate('/home', { replace: true });
      return;
    }
    const src = (params.get('src') || 'direct').slice(0, 40);
    const platform = detectPlatform();
    trackLinkHit(src, platform);
    if (platform === 'ios') openAppStore();
    else navigate('/get', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function manualOpen(e) {
    e.preventDefault();
    openAppStore();
  }

  return (
    <div className="min-h-[100dvh] bg-doubles-night text-white flex flex-col items-center justify-center px-6 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-tropic-gold" />
      <h1 className="font-heading text-3xl tracking-wide mt-5">Opening the App Store…</h1>
      <p className="mt-2 text-sm text-white/60 max-w-xs">
        If nothing happens, tap the button below.
      </p>
      <a
        href={APP_STORE_HTTPS}
        onClick={manualOpen}
        className="mt-6 inline-flex items-center gap-3 bg-white text-black rounded-2xl px-6 py-3.5 shadow-2xl active:scale-95 transition"
      >
        <AppleIcon className="w-6 h-6" color="#000000" />
        <span className="text-lg font-bold">Open the App Store</span>
      </a>
    </div>
  );
}
