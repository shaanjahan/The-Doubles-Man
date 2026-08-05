import React from 'react';

// The Doubles Man drawn icon set — every glyph the game used to render as an
// emoji, hand-drawn as inline SVG in one comic style: dark maroon outlines,
// gold/red/green fills, matching the Bangers headings and the share-card art.
// Inline SVG renders pixel-identically on every device (platform emoji don't)
// and html2canvas rasterizes it cleanly for share cards.

const S = '#7f1d1d';            // outline
const GOLD = '#fbbf24';
const GOLDL = '#fde68a';
const RED = '#ef4444';
const ORANGE = '#f97316';
const GREEN = '#22c55e';
const BLUE = '#2563eb';
const BLUEL = '#93c5fd';
const CREAM = '#fef3c7';
const GRAY = '#94a3b8';

const P = { stroke: S, strokeWidth: 2.5, strokeLinejoin: 'round', strokeLinecap: 'round' };

function Svg({ size, className, children, vb = '0 0 48 48' }) {
  return (
    <svg width={size} height={size} viewBox={vb} className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export function IconCrown({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M8,32 L6,14 L16,24 L24,8 L32,24 L42,14 L40,32 Z" fill={GOLD} {...P} />
      <circle cx="6" cy="13" r="2.8" fill={GOLDL} {...P} strokeWidth="2" />
      <circle cx="24" cy="8" r="3" fill={GOLDL} {...P} strokeWidth="2" />
      <circle cx="42" cy="13" r="2.8" fill={GOLDL} {...P} strokeWidth="2" />
      <rect x="7" y="32" width="34" height="8" rx="2.5" fill={GOLD} {...P} />
      <circle cx="24" cy="36" r="2.4" fill={RED} stroke={S} strokeWidth="1.5" />
      <circle cx="15" cy="36" r="1.9" fill={GREEN} stroke={S} strokeWidth="1.5" />
      <circle cx="33" cy="36" r="1.9" fill={BLUE} stroke={S} strokeWidth="1.5" />
    </Svg>
  );
}

export function IconFlame({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M24,4 C30,12 38,17 38,29 A14,14 0 1,1 10,29 C10,20 17,15 18,8 C20,12 23,11 24,4 Z" fill={RED} {...P} />
      <path d="M24,15 C28,20 32,23 32,30 A8,8 0 1,1 16,30 C16,25 20,22 21,17 C22,19.5 23.4,19 24,15 Z" fill={ORANGE} />
      <path d="M24,25 C26,28 28,29 28,33 A4.5,4.5 0 1,1 19,33 C19,30 22,28.5 24,25 Z" fill={GOLDL} />
    </Svg>
  );
}

export function IconTrophy({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M12,8 h24 v10 a12,12 0 0 1 -24,0 Z" fill={GOLD} {...P} />
      <path d="M12,11 h-5 a2,2 0 0 0 -2,2 c0,5 3,8 8,9" fill="none" {...P} />
      <path d="M36,11 h5 a2,2 0 0 1 2,2 c0,5 -3,8 -8,9" fill="none" {...P} />
      <rect x="21" y="29" width="6" height="6" fill={GOLD} {...P} />
      <rect x="14" y="35" width="20" height="6" rx="2" fill={GOLD} {...P} />
      <path d="M19,13 l3,0 -2.4,2 1,3 -2.6,-1.9 L15.4,18 l1,-3 L14,13 l3,0 1,-3 Z" fill={GOLDL} transform="translate(5.5 1)" />
    </Svg>
  );
}

const MEDAL_TONES = {
  gold:   { disc: GOLD,      inner: GOLDL,     star: GOLD },
  silver: { disc: '#cbd5e1', inner: '#eef2f7', star: '#94a3b8' },
  bronze: { disc: '#d97706', inner: '#fbbf24', star: '#b45309' },
};

export function IconMedal({ size = 20, className = '', tone = 'gold' }) {
  const t = MEDAL_TONES[tone] || MEDAL_TONES.gold;
  return (
    <Svg size={size} className={className}>
      <polygon points="16,4 24,16 12,22 8,4" fill={RED} {...P} />
      <polygon points="32,4 24,16 36,22 40,4" fill={GREEN} {...P} />
      <circle cx="24" cy="30" r="13" fill={t.disc} {...P} />
      <circle cx="24" cy="30" r="8.5" fill={t.inner} stroke={S} strokeWidth="1.8" />
      <path d="M24,24 l1.9,3.9 4.3,.6 -3.1,3 .7,4.3 -3.8,-2 -3.8,2 .7,-4.3 -3.1,-3 4.3,-.6 Z" fill={t.star} stroke={S} strokeWidth="1.4" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconBell({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="24" cy="10" r="3" fill={GOLDL} {...P} strokeWidth="2" />
      <path d="M8,32 a16,16 0 0 1 32,0 Z" fill={GOLD} {...P} />
      <rect x="5" y="32" width="38" height="6" rx="3" fill={GOLDL} {...P} />
      <path d="M15,24 a9,9 0 0 1 6,-8" fill="none" stroke={GOLDL} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconSparkle({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M22,6 L25.5,18.5 L38,22 L25.5,25.5 L22,38 L18.5,25.5 L6,22 L18.5,18.5 Z" fill={GOLDL} {...P} />
      <path d="M37,30 L38.6,35.4 L44,37 L38.6,38.6 L37,44 L35.4,38.6 L30,37 L35.4,35.4 Z" fill={GOLD} stroke={S} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="38" cy="10" r="2.6" fill={GOLD} stroke={S} strokeWidth="1.6" />
    </Svg>
  );
}

export function IconTarget({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="24" cy="24" r="18" fill={RED} {...P} />
      <circle cx="24" cy="24" r="12.5" fill={CREAM} stroke={S} strokeWidth="2" />
      <circle cx="24" cy="24" r="7" fill={RED} stroke={S} strokeWidth="2" />
      <circle cx="24" cy="24" r="2.6" fill={GOLD} stroke={S} strokeWidth="1.6" />
    </Svg>
  );
}

export function IconStar({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M24,4 l5.6,11.9 13,1.6 -9.6,8.9 2.5,12.9 L24,33 l-11.5,6.3 2.5,-12.9 -9.6,-8.9 13,-1.6 Z" fill={GOLD} {...P} />
      <path d="M24,10 l3.6,7.6 8.2,1 -6,5.6" fill="none" stroke={GOLDL} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconGradCap({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <polygon points="24,8 45,17 24,26 3,17" fill={S} stroke={S} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M13,22 v9 c0,3 5,6 11,6 s11,-3 11,-6 v-9" fill={GOLD} {...P} />
      <path d="M42,18 v10" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="42" cy="30" r="2.4" fill={GOLD} stroke={S} strokeWidth="1.6" />
    </Svg>
  );
}

export function IconCashStack({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <rect x="6" y="26" width="36" height="12" rx="2.5" fill={BLUE} {...P} />
      <rect x="8" y="18" width="32" height="11" rx="2.5" fill={BLUEL} {...P} />
      <rect x="6" y="9" width="36" height="12" rx="2.5" fill={BLUE} {...P} />
      <ellipse cx="24" cy="15" rx="7" ry="4.6" fill={BLUEL} stroke={S} strokeWidth="1.6" />
      <text x="24" y="18.2" textAnchor="middle" fontSize="9" fontWeight="900" fill={S} fontFamily="ui-sans-serif, system-ui">$</text>
    </Svg>
  );
}

export function IconDice({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <rect x="8" y="8" width="32" height="32" rx="7" fill={CREAM} {...P} />
      <circle cx="16.5" cy="16.5" r="2.8" fill={S} />
      <circle cx="31.5" cy="16.5" r="2.8" fill={S} />
      <circle cx="24" cy="24" r="2.8" fill={RED} />
      <circle cx="16.5" cy="31.5" r="2.8" fill={S} />
      <circle cx="31.5" cy="31.5" r="2.8" fill={S} />
    </Svg>
  );
}

export function IconCalendar({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <rect x="6" y="10" width="36" height="32" rx="5" fill={CREAM} {...P} />
      <path d="M6,15 a5,5 0 0 1 5,-5 h26 a5,5 0 0 1 5,5 v5 H6 Z" fill={RED} {...P} />
      <line x1="15" y1="6" x2="15" y2="13" {...P} strokeWidth="3" />
      <line x1="33" y1="6" x2="33" y2="13" {...P} strokeWidth="3" />
      <path d="M15,30 l6,6 12,-11" fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconSauceBottle({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <rect x="20" y="4" width="8" height="5" rx="1.5" fill={RED} {...P} strokeWidth="2" />
      <path d="M20,9 h8 v5 c4,2 6,5 6,9 v16 a4,4 0 0 1 -4,4 H18 a4,4 0 0 1 -4,-4 V23 c0,-4 2,-7 6,-9 Z" fill={ORANGE} {...P} />
      <rect x="17" y="25" width="14" height="10" rx="2" fill={CREAM} stroke={S} strokeWidth="1.8" />
      <path d="M21,30 c1,-2 2,-2 3,0 s2,2 3,0" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconStorefront({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <rect x="8" y="20" width="32" height="20" rx="2" fill={CREAM} {...P} />
      <path d="M6,12 h36 l3,8 H3 Z" fill={RED} {...P} />
      <path d="M3,20 h9 v3 a4.5,4.5 0 0 1 -9,0 Z M12,20 h9 v3 a4.5,4.5 0 0 1 -9,0 Z M21,20 h9 v3 a4.5,4.5 0 0 1 -9,0 Z M30,20 h9 v3 a4.5,4.5 0 0 1 -9,0 Z M39,20 h6 v3 a4.5,4.5 0 0 1 -6,0 Z" fill={GOLDL} stroke={S} strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="13" y="27" width="8" height="13" fill={S} rx="1.5" />
      <rect x="26" y="27" width="9" height="8" rx="1.5" fill={BLUEL} stroke={S} strokeWidth="1.8" />
    </Svg>
  );
}

export function IconCastle({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M10,18 v-6 h4 v3 h4 v-3 h4 v6 Z" fill={GRAY} {...P} strokeWidth="2" transform="translate(-2 0)" />
      <path d="M10,18 v-6 h4 v3 h4 v-3 h4 v6 Z" fill={GRAY} {...P} strokeWidth="2" transform="translate(16 0)" />
      <rect x="8" y="18" width="12" height="22" fill={GRAY} {...P} />
      <rect x="28" y="18" width="12" height="22" fill={GRAY} {...P} />
      <path d="M16,26 h16 v-4 h3 v18 H13 V22 h3 Z" fill={CREAM} {...P} />
      <path d="M21,40 v-7 a3,3 0 0 1 6,0 v7 Z" fill={S} />
      <path d="M24,8 v6 M24,8 h7 l-2,2.5 2,2.5 h-7" fill={RED} stroke={S} strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconWrench({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M40,13 a10,10 0 0 1 -13,12 L15,37 a4.2,4.2 0 0 1 -6,-6 L21,19 a10,10 0 0 1 12,-13 l-6,6 1,5 5,1 Z" fill={GRAY} {...P} />
      <circle cx="12" cy="34" r="1.8" fill={S} />
    </Svg>
  );
}

export function IconRocket({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M24,4 c6,4 9,11 9,18 l0,7 H15 l0,-7 c0,-7 3,-14 9,-18 Z" fill={CREAM} {...P} />
      <path d="M24,4 c3,2 5,5 6.5,8 h-13 C19,9 21,6 24,4 Z" fill={RED} {...P} strokeWidth="2" />
      <circle cx="24" cy="20" r="4" fill={BLUEL} {...P} strokeWidth="2" />
      <path d="M15,24 l-6,8 6,-1 Z M33,24 l6,8 -6,-1 Z" fill={RED} {...P} strokeWidth="2" />
      <path d="M20,30 c0,5 1.5,8 4,12 c2.5,-4 4,-7 4,-12 Z" fill={ORANGE} {...P} strokeWidth="2" />
    </Svg>
  );
}

export function IconScroll({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M12,8 h26 a5,5 0 0 0 -5,5 v22 a5,5 0 0 1 -5,5 H12 Z" fill={CREAM} {...P} />
      <path d="M38,8 a5,5 0 0 1 5,5 v2 h-10 v-2 a5,5 0 0 1 5,-5 Z" fill={GOLDL} {...P} strokeWidth="2" />
      <path d="M12,8 a5,5 0 0 0 -5,5 v2 h5 Z" fill={GOLDL} {...P} strokeWidth="2" />
      <path d="M12,40 h16 a5,5 0 0 1 -5,-5 v-2 h-16 v2 a5,5 0 0 0 5,5 Z" fill={GOLDL} {...P} strokeWidth="2" />
      <line x1="16" y1="17" x2="30" y2="17" stroke={S} strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="23" x2="30" y2="23" stroke={S} strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="29" x2="26" y2="29" stroke={S} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconMegaphone({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M8,20 l22,-10 v26 L8,26 Z" fill={RED} {...P} />
      <rect x="4" y="19" width="6" height="9" rx="2" fill={GOLD} {...P} strokeWidth="2" />
      <path d="M12,27 l3,10 a2,2 0 0 0 2.5,1.3 l3,-1 a2,2 0 0 0 1.2,-2.6 L19,25" fill={GOLD} {...P} strokeWidth="2" />
      <path d="M35,17 a8,8 0 0 1 0,12 M39,13 a14,14 0 0 1 0,20" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconTopHat({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M14,8 h20 v22 H14 Z" fill="#1f2937" {...P} />
      <rect x="14" y="24" width="20" height="6" fill={GOLD} stroke={S} strokeWidth="1.8" />
      <path d="M6,32 a2.5,2.5 0 0 1 2.5,-2.5 h31 a2.5,2.5 0 0 1 0,5 h-31 A2.5,2.5 0 0 1 6,32 Z" fill="#1f2937" {...P} transform="translate(0 3)" />
    </Svg>
  );
}

export function IconGift({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <rect x="8" y="20" width="32" height="22" rx="3" fill={RED} {...P} />
      <rect x="6" y="14" width="36" height="8" rx="2.5" fill={RED} {...P} />
      <rect x="21" y="14" width="6" height="28" fill={GOLD} stroke={S} strokeWidth="1.8" />
      <path d="M24,14 c-2,-6 -8,-9 -10,-6 c-2,3 3,6 10,6 Z" fill={GOLD} {...P} strokeWidth="2" />
      <path d="M24,14 c2,-6 8,-9 10,-6 c2,3 -3,6 -10,6 Z" fill={GOLD} {...P} strokeWidth="2" />
    </Svg>
  );
}

export function IconPeople({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="32" cy="16" r="6.5" fill={ORANGE} {...P} strokeWidth="2" />
      <path d="M22,40 a10,10 0 0 1 20,0 Z" fill={ORANGE} {...P} strokeWidth="2" />
      <circle cx="16" cy="14" r="7.5" fill={GOLD} {...P} />
      <path d="M4,40 a12,12 0 0 1 24,0 Z" fill={GOLD} {...P} />
    </Svg>
  );
}

export function IconChefHat({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M14,26 a9,9 0 0 1 -3,-17.5 a10,10 0 0 1 19.5,-2.4 A9,9 0 0 1 34,26 v6 H14 Z" fill={CREAM} {...P} transform="translate(0 2)" />
      <rect x="14" y="34" width="20" height="7" rx="2" fill={GOLD} {...P} strokeWidth="2" />
      <line x1="21" y1="26" x2="21" y2="32" stroke={S} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="27" y1="26" x2="27" y2="32" stroke={S} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

// Pepper heat glyph — the only ingredient family with no painted art.
// level: 'none' | 'slight' | 'medium' | 'heavy'
export function IconPepper({ level = 'slight', size = 20, className = '' }) {
  const body = level === 'none' ? GRAY : level === 'slight' ? GREEN : level === 'medium' ? ORANGE : RED;
  return (
    <Svg size={size} className={className}>
      <path d="M31,10 c1,-4 5,-6 8,-5 c-1,3 -4,5 -6,5.5 Z" fill={GREEN} {...P} strokeWidth="2" />
      <path d="M33,10 c6,2 8,9 6,16 c-2.5,9 -11,17 -21,17 C10,43 6,39 7,36 c8,2 15,-2 19,-9 c3,-5 4,-11 7,-17 Z" fill={body} {...P} />
      <path d="M30,17 c1.5,4 .5,9 -2.5,13" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round" />
      {level === 'none' && <line x1="8" y1="40" x2="40" y2="8" stroke={S} strokeWidth="3.5" strokeLinecap="round" />}
      {level === 'heavy' && (
        <path d="M12,6 c2,2.5 4,4 4,7 a4.5,4.5 0 1,1 -9,0 c0,-2.5 3,-4.5 5,-7 Z" fill={ORANGE} stroke={S} strokeWidth="1.8" strokeLinejoin="round" />
      )}
    </Svg>
  );
}

export function IconHeart({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M24,42 C10,32 4,24 4,16 a10,10 0 0 1 20,-3 a10,10 0 0 1 20,3 c0,8 -6,16 -20,26 Z" fill={RED} {...P} />
      <path d="M13,14 a6,6 0 0 1 5,-5" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
    </Svg>
  );
}

export function IconTent({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M24,8 C14,20 8,28 5,40 h38 C40,28 34,20 24,8 Z" fill={RED} {...P} />
      <path d="M24,8 c-3,11 -3,21 0,32 M13,20 c-1,7 -1,13 1,20 M35,20 c1,7 1,13 -1,20" fill="none" stroke={CREAM} strokeWidth="3" strokeLinecap="round" />
      <path d="M20,40 c0,-5 1.6,-8 4,-8 s4,3 4,8 Z" fill={S} />
      <path d="M24,8 v-4 h6 l-1.5,2 1.5,2 Z" fill={GOLD} stroke={S} strokeWidth="1.6" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconBank({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <polygon points="24,6 44,16 4,16" fill={CREAM} {...P} />
      <rect x="9" y="19" width="5" height="16" fill={CREAM} {...P} strokeWidth="2" />
      <rect x="21.5" y="19" width="5" height="16" fill={CREAM} {...P} strokeWidth="2" />
      <rect x="34" y="19" width="5" height="16" fill={CREAM} {...P} strokeWidth="2" />
      <rect x="5" y="37" width="38" height="5" rx="1.5" fill={GOLD} {...P} strokeWidth="2" />
      <circle cx="24" cy="12" r="2.2" fill={GOLD} stroke={S} strokeWidth="1.5" />
    </Svg>
  );
}

export function IconCity({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <rect x="7" y="14" width="14" height="28" fill={BLUEL} {...P} />
      <rect x="25" y="6" width="16" height="36" fill={CREAM} {...P} />
      {[19, 26, 33].map((y) => (
        <g key={y}>
          <rect x="10.5" y={y} width="3" height="3.5" fill={S} />
          <rect x="15.5" y={y} width="3" height="3.5" fill={S} />
        </g>
      ))}
      {[10, 17, 24, 31].map((y) => (
        <g key={y}>
          <rect x="28.5" y={y} width="3.5" height="4" fill={GOLD} />
          <rect x="34.5" y={y} width="3.5" height="4" fill={GOLD} />
        </g>
      ))}
    </Svg>
  );
}

export function IconMarket({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M6,10 h36 l2,8 H4 Z" fill={GREEN} {...P} />
      <path d="M4,18 h8 v2.5 a4,4 0 0 1 -8,0 Z M12,18 h8 v2.5 a4,4 0 0 1 -8,0 Z M20,18 h8 v2.5 a4,4 0 0 1 -8,0 Z M28,18 h8 v2.5 a4,4 0 0 1 -8,0 Z M36,18 h8 v2.5 a4,4 0 0 1 -8,0 Z" fill={CREAM} stroke={S} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="9" y="26" width="30" height="8" rx="2" fill={GOLD} {...P} strokeWidth="2" />
      <line x1="12" y1="34" x2="12" y2="42" {...P} strokeWidth="3" />
      <line x1="36" y1="34" x2="36" y2="42" {...P} strokeWidth="3" />
      <circle cx="18" cy="24" r="2.6" fill={RED} stroke={S} strokeWidth="1.4" />
      <circle cx="25" cy="23.5" r="2.6" fill={ORANGE} stroke={S} strokeWidth="1.4" />
      <circle cx="31" cy="24" r="2.6" fill={GREEN} stroke={S} strokeWidth="1.4" />
    </Svg>
  );
}

export function IconSunsetCity({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="24" cy="26" r="11" fill={GOLD} {...P} />
      <path d="M24,8 v4 M11,13 l2.8,2.8 M37,13 l-2.8,2.8 M6,26 h4 M38,26 h4" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
      <path d="M4,42 v-10 h7 v-6 h6 v10 h5 v-13 h6 v13 h5 v-8 h7 v14 Z" fill={S} stroke={S} strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconBeach({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M8,20 a17,17 0 0 1 32,-1 L8,20 Z" fill={RED} {...P} />
      <path d="M13,19.4 a13,13 0 0 1 10.4,-11.5 M24.6,7.6 a13,13 0 0 1 10.5,11" fill="none" stroke={CREAM} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="24" y1="8" x2="27" y2="38" {...P} strokeWidth="3" />
      <path d="M4,42 c4,-4 8,-4 12,0 c4,-4 8,-4 12,0 c4,-4 8,-4 12,0" fill="none" stroke={BLUE} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

export function IconFoodCart({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M8,12 h28 l2,7 H6 Z" fill={RED} {...P} />
      <path d="M6,19 h9 v2 a4,4 0 0 1 -8,0 Z M14,19 h9 v2 a4,4 0 0 1 -9,0 Z M23,19 h9 v2 a4,4 0 0 1 -9,0 Z M31,19 h9 v2 a4,4 0 0 1 -8,0 Z" fill={CREAM} stroke={S} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="9" y="25" width="28" height="10" rx="2.5" fill={GOLD} {...P} />
      <circle cx="16" cy="39" r="3.6" fill={GRAY} {...P} strokeWidth="2" />
      <circle cx="31" cy="39" r="3.6" fill={GRAY} {...P} strokeWidth="2" />
    </Svg>
  );
}

export function IconPalm({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M22,16 c-1,9 -1,17 1,26 h6 c-2,-9 -2,-17 -1,-26 Z" fill="#a16207" {...P} strokeWidth="2" />
      <path d="M25,15 C20,8 12,6 6,10 c5,4 12,5 19,5 Z" fill={GREEN} {...P} strokeWidth="2" />
      <path d="M25,15 C30,8 38,6 44,10 c-5,4 -12,5 -19,5 Z" fill={GREEN} {...P} strokeWidth="2" />
      <path d="M25,15 C21,10 20,5 24,2 c3,3 4,8 1,13 Z" fill={GREEN} {...P} strokeWidth="2" />
      <circle cx="22" cy="18" r="2.4" fill="#92400e" stroke={S} strokeWidth="1.5" />
      <circle cx="28" cy="17" r="2.4" fill="#92400e" stroke={S} strokeWidth="1.5" />
    </Svg>
  );
}

export function IconHouses({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M6,24 l10,-9 10,9 v16 H6 Z" fill={CREAM} {...P} />
      <path d="M3,25 L16,13 l13,12" fill="none" stroke={RED} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="12" y="30" width="7" height="10" rx="1" fill={S} />
      <path d="M27,28 l9,-8 9,8 v12 H27 Z" fill={GOLDL} {...P} />
      <path d="M24.5,29 L36,18.5 L45,27" fill="none" stroke={GREEN} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="33" y="32" width="6" height="4.5" rx="1" fill={BLUEL} stroke={S} strokeWidth="1.5" />
    </Svg>
  );
}

export function IconBolt({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M27,4 L10,27 h9 L20,44 L38,20 h-9 Z" fill={GOLD} {...P} />
    </Svg>
  );
}

export function IconClock({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="24" cy="24" r="18" fill={CREAM} {...P} />
      <line x1="24" y1="24" x2="24" y2="13" stroke={S} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="24" y1="24" x2="32" y2="29" stroke={RED} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2" fill={S} />
    </Svg>
  );
}

export function IconParty({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M14,26 L6,42 L22,34 Z" fill={GOLD} {...P} />
      <path d="M14,26 L22,34 L34,14 a3,3 0 0 0 -4,-4 Z" fill={RED} {...P} strokeWidth="2" />
      <circle cx="36" cy="8" r="2.4" fill={GREEN} stroke={S} strokeWidth="1.4" />
      <circle cx="42" cy="18" r="2.4" fill={BLUE} stroke={S} strokeWidth="1.4" />
      <circle cx="30" cy="26" r="2.4" fill={ORANGE} stroke={S} strokeWidth="1.4" />
      <path d="M40,28 l3,3 M28,4 l-2,4" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconPlate({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <ellipse cx="24" cy="28" rx="20" ry="12" fill={CREAM} {...P} />
      <ellipse cx="24" cy="27" rx="14" ry="8" fill="#fffbeb" stroke={S} strokeWidth="1.8" />
      <circle cx="19" cy="25" r="6" fill={GOLD} stroke={S} strokeWidth="2" />
      <circle cx="29" cy="25" r="6" fill={GOLD} stroke={S} strokeWidth="2" />
      <path d="M21,23 c2,-1.5 4,-1.5 6,0" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconTap({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M22,14 v14 l-4,-3 a3,3 0 0 0 -4,4.5 l8,9 a8,8 0 0 0 6,2.5 h4 a8,8 0 0 0 8,-8 v-8 a3,3 0 0 0 -6,-.5 a3,3 0 0 0 -6,-1 a3,3 0 0 0 -6,-1 V14 a3,3 0 0 0 -6,0 Z" fill={CREAM} {...P} transform="translate(-2 0)" />
      <path d="M12,10 a10,10 0 0 1 16,0" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8,6 a16,16 0 0 1 24,0" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconXBadge({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="24" cy="24" r="19" fill={RED} {...P} />
      <path d="M16,16 L32,32 M32,16 L16,32" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
    </Svg>
  );
}

export function IconPan({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="20" cy="28" r="14" fill="#475569" {...P} />
      <circle cx="20" cy="28" r="9.5" fill="#64748b" stroke={S} strokeWidth="1.8" />
      <path d="M33,24 l12,-5 a2.5,2.5 0 0 1 2,4.6 l-12,5" fill="#475569" {...P} strokeWidth="2" transform="translate(-2 2)" />
      <circle cx="20" cy="28" r="5.5" fill={GOLD} stroke={S} strokeWidth="1.8" />
    </Svg>
  );
}

export function IconHome({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M8,24 L24,8 L40,24 v16 a3,3 0 0 1 -3,3 H11 a3,3 0 0 1 -3,-3 Z" fill={CREAM} {...P} />
      <path d="M4,26 L24,6 L44,26" fill="none" stroke={RED} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="19" y="30" width="10" height="13" rx="1.5" fill={S} />
    </Svg>
  );
}

export function IconCart({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M4,8 h6 l5,22 h22 l5,-16 H13" fill="none" {...P} strokeWidth="3.5" />
      <path d="M15,30 h22 l4.5,-14 H12" fill={GOLD} stroke="none" opacity="0.5" />
      <circle cx="18" cy="38" r="4" fill={GRAY} {...P} strokeWidth="2.5" />
      <circle cx="34" cy="38" r="4" fill={GRAY} {...P} strokeWidth="2.5" />
    </Svg>
  );
}

export function TriniFlag({ height = 10, className = '' }) {
  const w = height * 1.5;
  return (
    <svg width={w} height={height} viewBox="0 0 30 20" className={className} aria-hidden="true">
      <defs>
        <clipPath id="tt-clip"><rect width="30" height="20" rx="2.5" /></clipPath>
      </defs>
      <g clipPath="url(#tt-clip)">
        <rect width="30" height="20" fill="#d81c2f" />
        <line x1="1" y1="-2" x2="29" y2="22" stroke="#ffffff" strokeWidth="7.5" />
        <line x1="1" y1="-2" x2="29" y2="22" stroke="#0b0b0d" strokeWidth="4.5" />
      </g>
      <rect width="30" height="20" rx="2.5" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
    </svg>
  );
}

export function GuyanaFlag({ height = 10, className = '' }) {
  const w = height * 1.5;
  return (
    <svg width={w} height={height} viewBox="0 0 30 20" className={className} aria-hidden="true">
      <defs>
        <clipPath id="gy-clip"><rect width="30" height="20" rx="2.5" /></clipPath>
      </defs>
      <g clipPath="url(#gy-clip)">
        <rect width="30" height="20" fill="#009e49" />
        <polygon points="0,0 30,10 0,20" fill="#ffffff" />
        <polygon points="0,1.8 26,10 0,18.2" fill="#fcd116" />
        <polygon points="0,0 15,10 0,20" fill="#0b0b0d" />
        <polygon points="0,2.6 11.5,10 0,17.4" fill="#ce1126" />
      </g>
      <rect width="30" height="20" rx="2.5" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
    </svg>
  );
}

export function IconMango({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M30,10 c9,2 14,10 12,19 c-2,9 -11,15 -20,13 C13,40 7,32 9,23 C11,14 21,8 30,10 Z" fill={GOLD} {...P} />
      <path d="M31,11 c8,3 12,10 10,18 c-1,5 -4,9 -8,11 c3,-9 2,-20 -7,-29 Z" fill={ORANGE} stroke="none" />
      <path d="M28,10 c-2,-3 -5,-5 -9,-5" fill="none" {...P} strokeWidth="2.5" />
      <path d="M19,5 c-5,0 -9,3 -10,7 c5,1 9,-1 10,-7 Z" fill={GREEN} {...P} strokeWidth="2" />
      <path d="M15,19 l1,2.6 2.6,1 -2.6,1 -1,2.6 -1,-2.6 -2.6,-1 2.6,-1 Z" fill="#ffffff" opacity="0.85" />
    </Svg>
  );
}

export function IconFireShoe({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <path d="M10,15 c-4,3 -7,9 -6,15 c3,-2 6,-6 7,-10 Z" fill={RED} stroke={S} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9,24 c-3,2 -4,6 -3,9 c2,-1 4,-4 4,-7 Z" fill={ORANGE} stroke={S} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12,17 c8,2 12,6 18,8 c6,2 12,3 14,7 v4 H14 a3,3 0 0 1 -3,-3 Z" fill={RED} {...P} />
      <path d="M11,36 h33 v2 a2,2 0 0 1 -2,2 H14 a3,3 0 0 1 -3,-3 Z" fill={CREAM} {...P} strokeWidth="2" />
      <path d="M21,22 l3.5,4.5 M27,24 l3,4" stroke={CREAM} strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconAmulet({ size = 20, className = '' }) {
  return (
    <Svg size={size} className={className}>
      <circle cx="24" cy="24" r="18" fill={BLUE} {...P} />
      <circle cx="24" cy="24" r="12" fill="#ffffff" stroke={S} strokeWidth="1.8" />
      <circle cx="24" cy="24" r="7.5" fill={BLUEL} stroke={S} strokeWidth="1.6" />
      <circle cx="24" cy="24" r="3.6" fill={S} />
      <circle cx="25.6" cy="22.4" r="1.3" fill="#ffffff" />
    </Svg>
  );
}

// ---- Upgrade id -> drawn icon (for upgrades without painted art) ----
export const UPGRADE_ICONS = {
  gem_luck: IconMango,       // Lucky Mango
  combo_master: IconFireShoe, // Fire Shoes
  auto_bless: IconAmulet,    // Gran's Blessing
  legacy: IconCrown,         // Doubles Legacy
};

export function UpgradeIcon({ id, size = 20, className = '' }) {
  const C = UPGRADE_ICONS[id] || IconWrench;
  return <C size={size} className={className} />;
}

// ---- Achievement id -> drawn badge ----
export const ACH_ICONS = {
  serve_10: IconMedal,   serve_100: IconBell,  serve_500: IconBell,
  serve_1000: IconTrophy, serve_2500: IconTent, serve_5000: IconBank, serve_10000: IconCrown,
  perfect_10: IconSparkle, perfect_50: IconSparkle, perfect_250: IconSparkle, perfect_1000: IconTarget,
  combo_10: IconFlame, combo_20: IconFlame, combo_50: IconFlame, combo_100: IconFlame, combo_250: IconFlame, combo_500: IconFlame,
  level_5: IconStar, level_10: IconStar, level_25: IconStar, level_50: IconGradCap,
  coins_10k: IconCashStack, coins_100k: IconCashStack, coins_1m: IconCashStack, coins_10m: IconCashStack, coins_100m: IconCashStack,
  rounds_5: IconDice, rounds_50: IconDice, rounds_150: IconDice, rounds_300: IconDice, rounds_500: IconDice,
  streak_3: IconCalendar, streak_7: IconCalendar, streak_14: IconCalendar, streak_30: IconCalendar,
  sauce_3: IconSauceBottle, sauce_collector: IconSauceBottle, sauce_8: IconSauceBottle,
  biz_1: IconStorefront, biz_5: IconStorefront, biz_10: IconStorefront,
  empire_1: IconCastle,
  upgrade_1: IconWrench, upgrade_5: IconWrench, upgrade_max: IconRocket,
  legacy_1: IconScroll, legacy_5: IconScroll,
  invite_1: IconMegaphone, invite_3: IconMegaphone,
  vip_member: IconTopHat,
};

export function AchIcon({ id, size = 20, className = '' }) {
  const C = ACH_ICONS[id] || IconMedal;
  return <C size={size} className={className} />;
}

// ---- Location id -> drawn glyph ----
export const LOCATION_ICONS = {
  0: IconCity,       // San Fernando
  1: IconMarket,     // Chaguanas Market
  2: IconSunsetCity, // Port of Spain
  3: IconBeach,      // Maracas Beach
  4: IconFoodCart,   // Debe
  5: IconPalm,       // Queen's Park Savannah
  6: IconCrown,      // Caribbean Empire Hub
  7: IconHouses,     // Princes Town
};

export function LocationIcon({ id, size = 20, className = '' }) {
  const C = LOCATION_ICONS[id] || IconCity;
  return <C size={size} className={className} />;
}
