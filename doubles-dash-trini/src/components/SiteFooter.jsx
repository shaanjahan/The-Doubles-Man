import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const norm = (p) => (p || '/').replace(/\/$/, '') || '/';

export default function SiteFooter() {
  const { pathname } = useLocation();
  const cur = norm(pathname);
  // Players inside the native shell should never be sent to the marketing
  // landing page, so the Home entry targets the game hub when native IAP is on.
  const homeTo = window.NativeIAP?.available ? '/home' : '/';
  const links = [
    { to: homeTo, label: 'Home' },
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms of Service' },
    { to: '/support', label: 'Support' },
    { to: '/delete-account', label: 'Delete Account' },
  ].filter((l) => norm(l.to) !== cur);

  return (
    <footer className="border-t border-white/10 pt-5 text-sm text-white/70">
      <nav className="flex flex-wrap gap-x-3 gap-y-1.5">
        {links.map((l) => (
          <Link key={l.to} to={l.to} className="hover:text-tropic-gold transition">
            {l.label}
          </Link>
        ))}
        <a href="mailto:thedoublesmanapp@gmail.com" className="hover:text-tropic-gold transition">
          thedoublesmanapp@gmail.com
        </a>
      </nav>
      <p className="mt-3 text-[11px] text-white/40">
        © {new Date().getFullYear()} The Doubles Man · Made by Lamae Maharaj
      </p>
    </footer>
  );
}