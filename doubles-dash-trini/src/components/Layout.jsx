import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Gamepad2, Sparkles, Trophy, ShoppingBag, LogOut, Briefcase,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import TopHud from './TopHud';
import AchievementToast from './AchievementToast';
import LocationUnlockToast from './LocationUnlockToast';
import PrizeCelebration from './PrizeCelebration';
import AnnouncementModal from './AnnouncementModal';
import CharacterSetup from './CharacterSetup';
import { PlayerProvider, usePlayerState } from '@/lib/game/PlayerContext';
import { MusicProvider } from '@/lib/game/MusicContext';
import { TabStack } from '@/components/PersistentTabs';
import { RefreshProvider } from '@/lib/game/RefreshContext';
import { RefreshCw } from 'lucide-react';

const NAV = [
  { to: '/home',        label: 'Hub',        icon: Home },
  { to: '/play',        label: 'Play',       icon: Gamepad2 },
  { to: '/upgrades',    label: 'Upgrades',   icon: Sparkles },
  { to: '/business',    label: 'Business',   icon: Briefcase },
  { to: '/leaderboard', label: 'Boards',     icon: Trophy },
  { to: '/store',       label: 'Store',      icon: ShoppingBag },
];

function NavButton({ to, label, icon: Icon, onReselect }) {
  return (
    <NavLink
      to={to}
      end={to === '/home'}
      onClick={() => onReselect?.(to)}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-2 min-h-[44px] text-[9px] font-bold transition no-tap-highlight select-none min-w-0 ` +
        (isActive
          ? 'bg-primary text-primary-foreground shadow'
          : 'text-white/70 hover:bg-white/10')
      }
    >
      <Icon size={20} strokeWidth={2.4} />
      <span className="hidden min-[360px]:inline truncate max-w-full">{label}</span>
    </NavLink>
  );
}

function LayoutShell() {
  const { player, error: playerError, reload } = usePlayerState();
  const { pathname } = useLocation();

  // Tapping the already-active bottom tab scrolls the active view back to top.
  function handleReselect(to) {
    if (to === pathname) {
      window.dispatchEvent(new CustomEvent('scroll-active-tab-to-top'));
    }
  }

  function handleSignOut() {
    base44.auth.logout('/');
  }

  if (!player) {
    if (playerError) {
      return (
        <div className="min-h-screen bg-doubles-night flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-tropic-gold" />
          </div>
          <h1 className="text-xl font-extrabold text-foreground mb-1">Couldn't load your stall</h1>
          <p className="text-sm text-white/60 max-w-xs mb-5">We couldn't reach the kitchen. Tap to try again.</p>
          <button
            onClick={() => reload()}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-bold active:scale-95 transition"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-doubles-night flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/15 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (player.needsSetup) {
    return (
      <div className="min-h-screen bg-doubles-night">
        <CharacterSetup />
      </div>
    );
  }

  return (
    <div className="app-shell h-[100dvh] bg-doubles-night text-foreground flex flex-col">
      <TopHud />
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-24">
        <TabStack />
      </div>

      {/* Desktop sidebar */}
      <nav className="hidden md:flex fixed left-0 top-[calc(4rem+env(safe-area-inset-top))] bottom-0 w-24 flex-col gap-1.5 p-2 bg-black/60 backdrop-blur border-r border-white/10">
        {NAV.map((n) => (
          <NavButton key={n.to} {...n} />
        ))}
        <button
          onClick={handleSignOut}
          className="mt-auto flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-2 text-[11px] font-bold text-tropic-coral hover:bg-white/10"
        >
          <LogOut size={20} strokeWidth={2.4} />
          <span>Sign Out</span>
        </button>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex justify-around items-stretch bg-black/80 backdrop-blur border-t border-white/10 py-1.5 px-0.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] overflow-x-auto">
        {NAV.map((n) => (
          <NavButton key={n.to} {...n} onReselect={handleReselect} />
        ))}
      </nav>

      <AchievementToast />
      <LocationUnlockToast />
      <PrizeCelebration />
      <AnnouncementModal />
    </div>
  );
}

export default function Layout() {
  return (
    <MusicProvider>
      <PlayerProvider>
        <RefreshProvider>
          <LayoutShell />
        </RefreshProvider>
      </PlayerProvider>
    </MusicProvider>
  );
}