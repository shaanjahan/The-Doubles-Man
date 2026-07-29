import React from 'react';
import { Play as PlayIcon } from 'lucide-react';
import { TapBadge } from './PageTour';
import CoinIcon from '@/components/CoinIcon';

// All page walkthroughs live here so the Hub's "How to Play" button can replay
// any of them on demand. Each `visual` is a faithful mock of the real screen
// button (same classes/tokens) with a 👆 "Tap here" badge on the exact spot.

export const PLAY_TOUR_STEPS = [
  {
    title: 'Customers arrive hungry',
    body: 'A customer walks up with an order bubble showing bara, channa, sauces and toppings. Read it fast!',
    visual: (
      <div className="bg-white rounded-2xl px-3 py-2 shadow border border-amber-100 w-full max-w-[230px]">
        <div className="text-[11px] font-bold text-slate-700">Order</div>
        <div className="flex gap-1 text-lg">🥖 🟡 🌶️ 🧅</div>
      </div>
    ),
  },
  {
    title: 'Tap ingredients to prep',
    body: 'Tap each item in the bottom tray to stack it on your prep board. Match the customer\u2019s order.',
    visual: (
      <div className="flex flex-col gap-2 w-full max-w-[240px]">
        <div className="bg-black/40 rounded-full px-3 py-1.5 border border-white/10 flex gap-1 text-lg">🌶️ 🧅 🟡</div>
        <div className="flex gap-1.5 justify-center">
          {['🥖', '🟡', '🟤', '🧅', '🌶️'].map((e, i) => (
            <div key={i} className={`w-9 h-9 rounded-2xl flex items-center justify-center text-lg ${i === 3 ? 'bg-tropic-coral/30 ring-2 ring-tropic-coral animate-[wiggle_1.5s_ease-in-out_infinite]' : 'bg-white/10'}`}>{e}</div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: 'Tap Serve to deliver',
    body: 'When the prep board matches the order, tap the big Serve button. Wrong combo = a strike and your combo resets.',
    visual: (
      <div className="relative w-full max-w-[220px]">
        <button className="w-full bg-gradient-to-r from-tropic-magenta to-tropic-sea font-extrabold text-white py-3 rounded-2xl shadow-lg ring-4 ring-tropic-magenta/30 animate-[wiggle_1.5s_ease-in-out_infinite]">
          Serve ⤵
        </button>
        <span className="absolute -top-2 -right-2"><TapBadge /></span>
      </div>
    ),
  },
  {
    title: 'Watch patience & 3 strikes',
    body: 'Each customer has a draining patience bar. Let it run out and they leave angry — 3 strikes ends the round.',
    visual: (
      <div className="flex items-center gap-2">
        <span className="text-tropic-coral">❤️❤️</span><span className="text-tropic-coral/25">❤️</span>
      </div>
    ),
  },
];

export const HUB_TOUR_STEPS = [
  {
    title: 'Tap "Start Serving"',
    body: 'The big gold button opens a service round. Tap it to start cooking doubles for hungry customers.',
    visual: (
      <div className="inline-flex items-center gap-2 bg-tropic-gold text-black font-extrabold px-5 py-2.5 rounded-full shadow-lg ring-4 ring-tropic-gold/40 animate-[wiggle_1.5s_ease-in-out_infinite]">
        <PlayIcon size={16} /> Start Serving <TapBadge />
      </div>
    ),
  },
  {
    title: 'Quick links',
    body: 'These jump tiles take you straight to Upgrades, My Business, Leaderboards, and the Store.',
    visual: (
      <div className="grid grid-cols-2 gap-1.5 w-full max-w-[220px]">
        {['Upgrade', 'My Biz', 'Leaderboards', 'Store'].map((l, i) => (
          <div key={l} className={`bg-black/30 rounded-xl px-2 py-2 text-center border ${i === 0 ? 'border-tropic-gold ring-2 ring-tropic-gold' : 'border-white/10'}`}>
            <div className="font-heading text-tropic-gold text-base">{l}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Your Empire bar',
    body: "This bar fills as you level up. Reach the next tier to unlock a new stall look and bigger businesses.",
    visual: (
      <div className="w-full max-w-[230px]">
        <div className="text-[10px] text-white/60 text-right mb-1">Next: Side Man</div>
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-tropic-gold" style={{ width: '45%' }} />
        </div>
        <div className="text-[10px] text-white/60 mt-1">Lvl 1 → 5</div>
      </div>
    ),
  },
  {
    title: 'Your wallet is up top',
    body: 'Coins and gems live in the top-right bar. You\u2019ll spend them in Upgrades and the Store.',
    visual: (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-tropic-gold rounded-full px-2.5 py-1 text-sm font-bold text-black">🪙 1.2K</div>
        <div className="flex items-center gap-1 bg-tropic-coral rounded-full px-2.5 py-1 text-sm font-bold text-black">💎 12</div>
      </div>
    ),
  },
];

export const STORE_TOUR_STEPS = [
  {
    title: 'Tap Buy on a pack',
    body: 'Each row is a dollar or gem pack. Tap the blue Buy button to purchase — secure checkout runs through Base44 Payments.',
    visual: (
      <div className="w-full max-w-[260px] bg-white rounded-2xl p-2.5 flex items-center gap-2 shadow border border-amber-100">
        <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center bg-black">
          <CoinIcon className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <div className="font-extrabold text-slate-800 text-xs">Side Man Money</div>
          <div className="text-[10px] text-slate-500">6,000 +500 bonus</div>
        </div>
        <div className="relative">
          <button className="px-3 py-1.5 rounded-full text-xs font-extrabold bg-sky-500 text-white ring-4 ring-sky-400/30 animate-[wiggle_1.5s_ease-in-out_infinite]">$4.99</button>
          <span className="absolute -top-2 -right-2"><TapBadge>Buy</TapBadge></span>
        </div>
      </div>
    ),
  },
  {
    title: 'Browse by category',
    body: 'Packs are grouped into Dollar Packs, Gem Packs, and Bundles — scroll the page to see every group.',
    visual: (
      <div className="w-full max-w-[240px] space-y-2">
        {['Dollar Packs', 'Gem Packs', 'Bundles'].map((l, i) => (
          <div key={l} className={`text-[10px] uppercase font-extrabold tracking-wide ${i === 0 ? 'text-amber-700' : 'text-amber-700/50'}`}>{l}</div>
        ))}
      </div>
    ),
  },
  {
    title: 'Magic Sauces & VIP',
    body: 'Scroll further to buy sauce packs. At the bottom, the one-time VIP pass unlocks cosmetics and a leaderboard crown.',
    visual: (
      <div className="relative">
        <button className="bg-yellow-300 text-red-800 font-extrabold px-4 py-2 rounded-full ring-4 ring-yellow-300/30 animate-[wiggle_1.5s_ease-in-out_infinite] text-xs">Unlock VIP · $4.99</button>
        <span className="absolute -top-2 -right-2"><TapBadge>VIP</TapBadge></span>
      </div>
    ),
  },
];

export const LEADERBOARD_TOUR_STEPS = [
  {
    title: 'Switch categories',
    body: 'Tap these pills at the top to move between Best Round, Customers, and Longest Combo boards.',
    visual: (
      <div className="flex gap-1.5 flex-wrap justify-center">
        {[['🏆', 'Best Round'], ['🛎️', 'Customers'], ['🔥', 'Longest Combo']].map(([e, l], i) => (
          <div key={l} className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold ${i === 0 ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-300/30 animate-[wiggle_1.5s_ease-in-out_infinite]' : 'bg-white text-slate-500 border border-amber-100'}`}>
            {e} {l}
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Read the board',
    body: 'Vendors rank by score. The top 3 get medals, and your own row is highlighted with "(you)".',
    visual: (
      <div className="w-full max-w-[240px] bg-white rounded-xl overflow-hidden border border-amber-100">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-50">
          <div className="w-5 text-center text-xs">🥇</div>
          <div className="w-7 h-7 rounded-full bg-amber-200 flex items-center justify-center text-sm">🧑‍🍳</div>
          <div className="flex-1">
            <div className="font-bold text-xs text-slate-800">Chen (you)</div>
            <div className="text-[9px] text-slate-500">Lvl 12</div>
          </div>
          <div className="font-extrabold text-amber-700 text-xs">2,540</div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <div className="w-5 text-center text-xs text-slate-400">2</div>
          <div className="w-7 h-7 rounded-full bg-sky-200 flex items-center justify-center text-sm">🧑‍💼</div>
          <div className="flex-1">
            <div className="font-bold text-xs text-slate-800">Ria</div>
            <div className="text-[9px] text-slate-500">Lvl 8</div>
          </div>
          <div className="font-extrabold text-amber-700 text-xs">1,990</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Share your rank',
    body: 'When you make the board, a share card appears so you can flex your rank to friends.',
    visual: (
      <div className="bg-gradient-to-br from-tropic-magenta to-tropic-sea text-white rounded-xl px-4 py-2.5 text-center w-full max-w-[220px]">
        <div className="font-extrabold text-lg">#3</div>
        <div className="text-[10px]">Leaderboard Rank</div>
      </div>
    ),
  },
];

export const UPGRADES_TOUR_STEPS = [
  {
    title: 'Tap Buy on an upgrade',
    body: 'Each upgrade boosts your stall. Tap the amber Buy button to spend dollars and level it up.',
    visual: (
      <div className="w-full max-w-[260px] bg-white rounded-2xl p-2.5 flex items-center gap-2 shadow border border-amber-100">
        <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-xl shrink-0">💪</div>
        <div className="flex-1">
          <div className="font-extrabold text-slate-800 text-xs">Tanty Power</div>
          <div className="text-[10px] text-slate-500">+12% prep flow per level</div>
          <div className="flex gap-1 mt-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className={`w-4 h-1 rounded-full ${i < 2 ? 'bg-amber-400' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>
        <div className="relative">
          <button className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-amber-400 text-white ring-4 ring-amber-300/30 animate-[wiggle_1.5s_ease-in-out_infinite]">Buy</button>
          <span className="absolute -top-2 -right-2"><TapBadge /></span>
        </div>
      </div>
    ),
  },
  {
    title: 'Level pips',
    body: 'The little bars under each upgrade show how many levels you own vs. the maximum for that upgrade.',
    visual: (
      <div className="flex gap-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className={`w-5 h-1 rounded-full ${i < 3 ? 'bg-amber-400' : 'bg-slate-200'}`} />
        ))}
      </div>
    ),
  },
  {
    title: 'Greyed out = can\u2019t afford',
    body: 'When you\u2019re short on dollars, the Buy button greys out — earn more in service rounds first.',
    visual: (
      <div className="flex flex-col items-center gap-1">
        <button className="text-xs font-extrabold px-3 py-1.5 rounded-full bg-slate-100 text-slate-400 cursor-not-allowed">Buy</button>
        <div className="flex items-center gap-0.5 text-[10px] text-slate-400">
          <CoinIcon className="w-3 h-3 inline-block" /> need 475
        </div>
      </div>
    ),
  },
];

export const BUSINESS_TOUR_STEPS = [
  {
    title: 'Tap Collect',
    body: "Your businesses earn idle dollars while you're away. Tap Collect to bank what's piled up.",
    visual: (
      <div className="w-full max-w-[260px] bg-tropic-carnival rounded-2xl p-2.5 flex items-center justify-between">
        <div>
          <div className="text-[9px] uppercase font-extrabold opacity-80">Ready to collect</div>
          <div className="flex items-center gap-1 text-lg font-extrabold">1,250 <CoinIcon className="w-4 h-4" /></div>
        </div>
        <div className="relative">
          <button className="px-4 py-2 rounded-2xl font-extrabold text-xs bg-white text-tropic-palm ring-4 ring-white/40 animate-[wiggle_1.5s_ease-in-out_infinite]">Collect</button>
          <span className="absolute -top-2 -right-2"><TapBadge /></span>
        </div>
      </div>
    ),
  },
  {
    title: 'Tap Buy on a business',
    body: 'Each business earns dollars per minute and adds a per-round bonus. Tap Buy (with the dollar cost) to add one.',
    visual: (
      <div className="w-full max-w-[260px] bg-white rounded-2xl p-2.5 flex items-center gap-2 border border-amber-100">
        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-xl shrink-0">🛒</div>
        <div className="flex-1">
          <div className="font-extrabold text-slate-800 text-xs">Doubles Bike</div>
          <div className="text-[10px] text-slate-600">Each earns 200/min</div>
        </div>
        <div className="relative">
          <button className="flex flex-col items-end px-3 py-1.5 rounded-2xl text-[10px] font-extrabold bg-tropic-magenta text-white ring-4 ring-tropic-magenta/30 animate-[wiggle_1.5s_ease-in-out_infinite]">
            <span className="flex items-center gap-1"><CoinIcon className="w-3 h-3" /> 500</span>
            <span>Buy</span>
          </button>
          <span className="absolute -top-2 -right-2"><TapBadge /></span>
        </div>
      </div>
    ),
  },
  {
    title: 'Locked businesses',
    body: 'Higher-tier businesses unlock at higher levels — locked ones show a padlock and the level they open at.',
    visual: (
      <div className="flex flex-col items-center gap-1 text-slate-400">
        <div className="text-2xl">🔒</div>
        <div className="text-[10px] font-bold">Unlocks at Level 5</div>
      </div>
    ),
  },
];