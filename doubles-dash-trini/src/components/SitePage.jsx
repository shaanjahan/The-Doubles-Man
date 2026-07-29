import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SiteFooter from './SiteFooter';

// Public site shell for the legal/support pages: dark theme, ~700px readable
// column, sets the browser tab title, and carries the shared footer.
export default function SitePage({ title, children }) {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = title;
  }, [title]);

  // In-app visitors reach these pages by tapping a link, so there is history
  // to return to. Cold web visitors (direct URL / refresh) usually don't, so
  // fall back to the site root — or to the game hub when running natively, so
  // a player inside the WebView never lands on the marketing page.
  const goBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate(window.NativeIAP?.available ? '/home' : '/');
  };

  return (
    <div className="min-h-[100dvh] bg-doubles-night text-foreground flex flex-col">
      <div className="max-w-[700px] mx-auto w-full px-5 pt-6">
        <button
          type="button"
          onClick={goBack}
          className="text-xs font-bold text-white/60 hover:text-tropic-gold transition"
        >
          ← Back
        </button>
      </div>
      <main className="max-w-[700px] mx-auto w-full px-5 pb-8 flex-1">
        {children}
      </main>
      <div className="max-w-[700px] mx-auto w-full px-5 pb-10">
        <SiteFooter />
      </div>
    </div>
  );
}