import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PullToRefresh from '@/components/PullToRefresh';
import { useRefreshCtx } from '@/lib/game/RefreshContext';
import Home from '@/pages/Home';
import Play from '@/pages/Play';
import Upgrades from '@/pages/Upgrades';
import MyBusiness from '@/pages/MyBusiness';
import Leaderboard from '@/pages/Leaderboard';
import StorePage from '@/pages/StorePage';

// Every main tab stays mounted; the active one fades/slides in. This keeps
// scroll position and in-flight state (e.g. an active service round) alive
// while the user toggles between screens.
const TABS = [
  { path: '/home',        Component: Home,        refresh: true },
  { path: '/play',        Component: Play },
  { path: '/upgrades',    Component: Upgrades },
  { path: '/business',    Component: MyBusiness, refresh: true },
  { path: '/leaderboard', Component: Leaderboard, refresh: true },
  { path: '/store',       Component: StorePage,  refresh: true },
];

function TabPane({ tab, active }) {
  const { trigger } = useRefreshCtx();
  const Comp = tab.Component;

  const body = tab.refresh ? (
    <PullToRefresh className="flex-1 min-h-0" onRefresh={() => trigger(tab.path) || Promise.resolve()}>
      <div className="pb-4">
        <Comp />
      </div>
    </PullToRefresh>
  ) : (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-4">
      <Comp />
    </div>
  );

  return (
    <div
      className={
        'absolute inset-0 flex flex-col transition-opacity duration-300 ease-out ' +
        (active ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')
      }
      aria-hidden={!active}
    >
      {body}
    </div>
  );
}

function scrollActivePaneToTop() {
  // Find the visible (aria-hidden="false") pane's scroll container — either a
  // PullToRefresh scroll surface or a plain overflow-y-auto wrapper — and
  // smooth-scroll it back to the top. Triggered by the bottom-nav reselect.
  const active = document.querySelector('[aria-hidden="false"] .overflow-y-auto');
  if (active) active.scrollTo({ top: 0, behavior: 'smooth' });
}

function PersistentTabs() {
  const { pathname } = useLocation();

  useEffect(() => {
    const handler = () => scrollActivePaneToTop();
    window.addEventListener('scroll-active-tab-to-top', handler);
    return () => window.removeEventListener('scroll-active-tab-to-top', handler);
  }, []);

  return (
    <div className="relative flex-1 min-h-0">
      {TABS.map((t) => (
        <TabPane key={t.path} tab={t} active={t.path === pathname} />
      ))}
    </div>
  );
}

// Tab routes render through the persistent stack; non-tab routes (e.g.
// /order-complete) fall back to the normal Outlet so they mount fresh.
export function TabStack() {
  const { pathname } = useLocation();
  const isTab = TABS.some((t) => t.path === pathname);
  if (!isTab) return <Outlet />;
  return <PersistentTabs />;
}