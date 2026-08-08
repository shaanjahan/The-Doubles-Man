import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { MALE_CHARACTER, FEMALE_CHARACTER } from '@/lib/game/characters';
import AppleIcon from '@/components/AppleIcon';
import { TriniFlag } from '@/components/game/art/icons';

// Social-friendly download landing page (thedoublesman.com/get) — the link to
// post on Instagram/TikTok instead of a raw apps.apple.com URL (which social
// apps mangle or block). Web-only: never linked from inside the game, and the
// native shell redirects it to /home. Country-neutral store URL so every
// visitor lands on their own storefront.
// Same-origin path that Netlify 302s to the App Store listing (netlify.toml).
// A server-side redirect needs no JS and survives every in-app browser
// (Instagram/TikTok/Facebook) — schemes and window.location tricks don't.
const APP_STORE_LINK = '/app';

export default function GetApp() {
  useEffect(() => {
    document.title = 'Get The Doubles Man';
  }, []);

  if (typeof window !== 'undefined' && window.NativeIAP?.available) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-doubles-night text-white flex flex-col items-center justify-center px-6 py-12 text-center relative overflow-hidden">
      {/* Warm glow behind the hero */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] rounded-full bg-tropic-carnival opacity-25 blur-3xl pointer-events-none" />

      <div className="relative flex items-end justify-center gap-0 -mb-2">
        <Image
          src={MALE_CHARACTER}
          alt="The Doubles Man vendor"
          fittingType="fit"
          className="w-36 sm:w-44 animate-[float-soft_3s_ease-in-out_infinite]"
        />
        <Image
          src={FEMALE_CHARACTER}
          alt="The Doubles Man vendor"
          fittingType="fit"
          className="w-36 sm:w-44 -ml-6 animate-[float-soft_3s_ease-in-out_1.5s_infinite]"
        />
      </div>

      <h1 className="relative font-heading text-5xl sm:text-6xl tracking-wide text-shadow-soft mt-4">
        The Doubles Man
      </h1>
      <p className="relative mt-3 text-base sm:text-lg font-extrabold text-white/90 max-w-sm">
        Run de doubles stand. Serve de line. Build yuh empire.
      </p>
      <p className="relative mt-1 text-sm text-white/60 max-w-xs">
        The Trini street-food tycoon game — climb the boards, win real prizes in-game, and mind yuh pepper.
      </p>

      <a
        href={APP_STORE_LINK}
        className="relative mt-8 inline-flex items-center gap-3 bg-white text-black rounded-2xl px-7 py-4 shadow-2xl hover:scale-105 active:scale-95 transition"
      >
        <AppleIcon className="w-8 h-8" color="#000000" />
        <span className="flex flex-col items-start leading-tight">
          <span className="text-[11px] font-semibold tracking-wide">Download on the</span>
          <span className="text-2xl font-bold -mt-0.5">App Store</span>
        </span>
      </a>

      <p className="relative mt-4 text-xs font-bold text-white/50 flex items-center gap-1.5">
        Free · iPhone · Made in de culture <TriniFlag size={14} />
      </p>
    </div>
  );
}
