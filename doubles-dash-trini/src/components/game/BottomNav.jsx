import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Store, Trophy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/shop', icon: Store, label: 'Upgrades' },
  { to: '/inventory', icon: Sparkles, label: 'Sauces' },
  { to: '/leaderboard', icon: Trophy, label: 'Ranks' },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 max-w-md mx-auto bg-card/90 backdrop-blur-lg border-t border-border/70 px-2 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4 gap-1 py-1.5">
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'no-tap-highlight flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-2xl transition-all',
                active ? 'text-tropic-coral' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', active && 'drop-shadow-[0_2px_4px_hsl(14_93%_57%/0.4)]')} strokeWidth={active ? 2.6 : 2} />
              <span className="text-[10px] font-heading font-semibold">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}