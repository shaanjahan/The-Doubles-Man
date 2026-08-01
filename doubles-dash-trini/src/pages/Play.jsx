import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LOCATIONS, MAGIC_SAUCES, BUSINESS_TIERS,
} from '@/lib/game/catalog';
import { spawnCustomer, classifyServe } from '@/lib/game/engine';
import { sfx, unlockAudio } from '@/lib/game/useSound';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { Flame, Play as PlayIcon, Gem, Heart, X, Pause } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Customer from '@/components/game/Customer';
import EndOfRoundModal from '@/components/game/EndOfRoundModal';
import MissionsPanel from '@/components/game/MissionsPanel';
import SauceActivator from '@/components/game/SauceActivator';
import ServeParticles from '@/components/game/ServeParticles';
import TrinidadMap from '@/components/game/TrinidadMap';
import PlayControls from '@/components/game/PlayControls';
import TutorialOverlay from '@/components/game/TutorialOverlay';
import CoinIcon from '@/components/CoinIcon';

const TICK_MS = 100;
const MAX_MISTAKES = 3; // a round ends after this many botched/missed orders

function buildConfig(player, loc) {
  const u = player.upgrades || {};
  // Difficulty gently scales with player level: customers start a bit slower
  // (more patience, slower spawns) and speed up gradually — but floored so
  // high levels stay playable.
  const lvl = player.level || 1;
  const cappedLvl = Math.min(lvl - 1, 20);
  const levelPatience = Math.max(0.82, 1.15 - cappedLvl * 0.012);
  const levelSpawn = Math.max(0.86, 1.1 - cappedLvl * 0.01);
  let patienceMult = (1 + (u.patience || 0) * 0.15) * levelPatience;
  let tipMult = 1 + (u.tips || 0) * 0.2;
  // Doubles Legacy: +2% dollars per prestige level, permanent. Mirrored in
  // finalize-round's server cap math — keep the two in sync.
  let coinMult = loc.baseReward * (1 + (u.coin_mult || 0) * 0.1) * (1 + (u.legacy || 0) * 0.02);
  const xpMult = 1 + (u.xp_mult || 0) * 0.15;
  // Combo bonus grows with combo power per serve — each Fire Shoes level adds
  // a little extra per step on top of the 5% base.
  const comboCoeff = 0.05 + (u.combo_master || 0) * 0.02;
  // Tanty Power: +12% dollars per serve per level (faster hands, more throughput).
  const prepSpeedMult = 1 + (u.prep_speed || 0) * 0.12;
  // Wider Stall: +1 active customer slot per level (max +2 → 4 slots total).
  const slots = 2 + Math.min(2, u.station || 0);
  let spawnMult = levelSpawn;
  let gemChance = 0.05 + (u.gem_luck || 0) * 0.03;
  let doubleServe = false;
  let autoIngredient = u.auto_bless || 0;
  for (const sid of player.equippedSauces || []) {
    const s = MAGIC_SAUCES.find((x) => x.id === sid);
    if (!s) continue;
    if (s.effect === 'slow_customers') spawnMult *= 1.66;
    if (s.effect === 'patience_boost') patienceMult *= 1.5;
    if (s.effect === 'tip_boost') tipMult *= 1.3;
    if (s.effect === 'coin_double') coinMult *= 2.0;
    if (s.effect === 'gem_chance') gemChance *= 3;
    if (s.effect === 'auto_ingredient') autoIngredient = 999;
    if (s.effect === 'double_serve') doubleServe = true;
  }
  // business_tier can exceed the 5-entry array (values run 0..6); clamp like
  // the server does, so top-tier vendors get the 3.0x multiplier instead of
  // silently falling back to tier 0's 1.0x (they were earning a third of the
  // intended rate).
  const business = BUSINESS_TIERS[Math.min(player.businessTier || 0, BUSINESS_TIERS.length - 1)] || BUSINESS_TIERS[0];
  coinMult *= business.coinMult;
  return {
    locationId: loc.id,
    spawnEveryMs: Math.round(loc.arriveSec * 1000 * spawnMult),
    slots, patienceMult, tipMult, coinMult, xpMult,
    gemChance, doubleServe, autoIngredient, comboCoeff, prepSpeedMult,
    sauceUsed: (player.equippedSauces || []).length > 0,
  };
}

function startState(cfg) {
  return {
    elapsed: 0,
    spawnClock: 1500,
    spawnEveryMs: cfg.spawnEveryMs,
    maxSlots: cfg.slots,
    customers: [],
    prepBoard: [],
    combo: 0, maxCombo: 0,
    servedCount: 0, perfectCount: 0, mistakes: 0,
    coinsEarned: 0, gemsEarned: 0, xpEarned: 0,
    coinMult: cfg.coinMult, tipMult: cfg.tipMult,
    patienceMult: cfg.patienceMult, xpMult: cfg.xpMult,
    gemChance: cfg.gemChance, doubleServe: cfg.doubleServe,
    autoIngredient: cfg.autoIngredient,
    comboCoeff: cfg.comboCoeff,
    prepSpeedMult: cfg.prepSpeedMult,
    sauceUsed: cfg.sauceUsed,
    locationId: cfg.locationId,
    sessionId: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random(),
    flash: null,
  };
}

function tickGame(g) {
  // The round keeps going until the player botches MAX_MISTAKES orders.
  if ((g.mistakes || 0) >= MAX_MISTAKES) return g;
  const ng = { ...g, elapsed: (g.elapsed || 0) + TICK_MS };

  const survivors = [];
  let mistakes = ng.mistakes;
  let combo = ng.combo;
  for (const c of g.customers) {
    if (c.served || c.left) continue;
    const newP = c.patience - TICK_MS;
    if (newP <= 0) {
      mistakes += 1;
      combo = 0;
      continue;
    }
    survivors.push({ ...c, patience: newP });
  }
  ng.customers = survivors;
  ng.mistakes = Math.min(mistakes, MAX_MISTAKES);
  ng.combo = combo;

  // Keep spawning only while the round is still live.
  if (ng.mistakes < MAX_MISTAKES) {
    ng.spawnClock -= TICK_MS;
    if (ng.spawnClock <= 0 && ng.customers.length < ng.maxSlots) {
      ng.customers.push(spawnCustomer(ng.patienceMult));
      ng.spawnClock += ng.spawnEveryMs;
    }
  }
  return ng;
}

function computeOutcome(g) {
  return {
    servedCount: g.servedCount,
    perfectCount: g.perfectCount,
    mistakes: g.mistakes,
    maxCombo: g.maxCombo,
    coinsEarned: Math.round(g.coinsEarned),
    gemsEarned: Math.round(g.gemsEarned),
    xpEarned: Math.round(g.xpEarned),
    locationId: g.locationId,
    elapsedMs: g.elapsed || 0,
    sauceUsed: !!g.sauceUsed,
    sessionId: g.sessionId || '',
    score: Math.round(g.coinsEarned + g.perfectCount * 50 + g.maxCombo * 25),
  };
}

export default function Play() {
  const { player, finalizeRound, completeTutorial } = usePlayerState();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('prep');
  const [locId, setLocId] = useState(0);
  const [game, setGame] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const savedRef = useRef(false);
  const [askExit, setAskExit] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (player) setLocId(player.currentLocationId || 0);
  }, [player?.id]);

  useEffect(() => {
    if (phase !== 'play' || paused) return;
    const t = setInterval(() => setGame((g) => tickGame(g)), TICK_MS);
    return () => clearInterval(t);
  }, [phase, paused]);

  useEffect(() => {
    if (!game?.flash) return;
    const t = setTimeout(() => setGame((g) => (g ? { ...g, flash: null } : g)), 700);
    return () => clearTimeout(t);
  }, [game?.flash]);

  useEffect(() => {
    if (phase !== 'play' || !game) return;
    if ((game.mistakes || 0) < MAX_MISTAKES) return;
    if (savedRef.current) return;
    savedRef.current = true;
    const localOut = computeOutcome(game);
    // finalizeRound persists authoritative (server-clamped) rewards, creates
    // the leaderboard entry, and returns the recomputed outcome for display.
    (async () => {
      const serverOut = await finalizeRound(localOut);
      // The round saved cleanly — drop any crash-salvage snapshot so it
      // can't be re-applied on the next launch.
      try { localStorage.removeItem('doubles_pendingRound'); } catch {}
      setOutcome(serverOut || localOut);
      setPhase('over');
    })();
  }, [phase, game?.mistakes, game?.roundCapped]);

  // Continuously snapshot the live round to storage. If the app is killed or
  // crashes before the round ends cleanly, the next launch can finalize this
  // snapshot so the player keeps the coins / gems / XP they earned — instead
  // of losing the whole run (the original "didn't get my money" bug).
  useEffect(() => {
    if (phase !== 'play' || !game || savedRef.current) return;
    try {
      localStorage.setItem('doubles_pendingRound', JSON.stringify({
        locationId: game.locationId,
        servedCount: game.servedCount,
        perfectCount: game.perfectCount,
        mistakes: game.mistakes || 0,
        maxCombo: game.maxCombo,
        coinsEarned: Math.round(game.coinsEarned),
        gemsEarned: Math.round(game.gemsEarned),
        xpEarned: Math.round(game.xpEarned),
        elapsedMs: game.elapsed || 0,
      }));
    } catch {}
  }, [phase, game]);

  function handleStart() {
    if (!player) return;
    unlockAudio();
    sfx.click();
    const loc = LOCATIONS.find((l) => l.id === locId) || LOCATIONS[0];
    if (loc.unlockTier > player.businessTier) return;
    savedRef.current = false;
    setPaused(false);
    setGame(startState(buildConfig(player, loc)));
    setOutcome(null);
    setPhase('play');
  }

  function handleExitRound() {
    // Player chose to abandon the round — don't let the launch salvage step
    // re-grant it next time.
    try { localStorage.removeItem('doubles_pendingRound'); } catch {}
    setGame(null);
    setPaused(false);
    setPhase('prep');
    setAskExit(false);
    navigate('/');
  }

  // Stable references so the memoized PlayControls panel skips re-render on
  // every game tick (which otherwise fires ~10×/sec while the clock runs).
  // Ingredient buttons toggle: tap to add, tap the same one again to undo.
  // No ingredient can appear twice. Pepper is a mutual group — tapping a
  // different pepper level swaps out the current one; tapping the active
  // level removes it.
  const handleAdd = useCallback((id) => {
    unlockAudio();
    sfx.addIngredient();
    setGame((g) => {
      if (!g || phase !== 'play') return g;
      const board = g.prepBoard;
      if (id.startsWith('pepper_')) {
        const current = board.find((x) => x.startsWith('pepper_'));
        if (current === id) return { ...g, prepBoard: board.filter((x) => x !== id) };
        return { ...g, prepBoard: [...board.filter((x) => !x.startsWith('pepper_')), id] };
      }
      if (board.includes(id)) return { ...g, prepBoard: board.filter((x) => x !== id) };
      return { ...g, prepBoard: [...board, id] };
    });
  }, [phase]);

  const handleClear = useCallback(() => {
    setGame((g) => (g ? { ...g, prepBoard: [] } : g));
  }, []);

  const handleServe = useCallback((customerId) => {
    setGame((g) => {
      if (!g || phase !== 'play' || (g.mistakes || 0) >= MAX_MISTAKES) return g;
      const idx = g.customers.findIndex((c) => c.id === customerId);
      if (idx < 0) return g;
      const c = g.customers[idx];
      const prep = [...g.prepBoard];
      let verdict = classifyServe(prep, c.order.requiredIds);
      let autoUsed = 0;
      if (verdict !== 'perfect' && g.autoIngredient > 0 && prep.length >= 1 && Math.abs(prep.length - c.order.requiredIds.length) <= 2) {
        verdict = 'perfect';
        autoUsed = 1;
      }
      if (verdict === 'perfect') {
        sfx.perfect();
        const combo = g.combo + 1;
        const cc = g.comboCoeff || 0.05;
        const tip = Math.max(0, c.type.tipMult * g.tipMult * 5 * (1 + combo * 0.1));
        let coins = (g.coinMult + tip) * (1 + combo * cc);
        if (c.challenge) coins *= 2;
        const gems = (Math.random() < g.gemChance ? 1 : 0) + (c.challenge ? 1 : 0);
        let xp = (5 + c.order.requiredIds.length * 2) * g.xpMult * (1 + cc * combo);
        let served = 1, perfect = 1;
        if (g.doubleServe) { coins *= 2; xp *= 2; served += 1; perfect += 1; }
        coins *= (g.prepSpeedMult || 1);
        return {
          ...g,
          prepBoard: [],
          autoIngredient: g.autoIngredient - autoUsed,
          customers: g.customers.filter((x) => x.id !== customerId),
          combo,
          maxCombo: Math.max(g.maxCombo, combo),
          servedCount: g.servedCount + served,
          perfectCount: g.perfectCount + perfect,
          coinsEarned: g.coinsEarned + coins,
          gemsEarned: g.gemsEarned + gems,
          xpEarned: g.xpEarned + xp,
          flash: { kind: 'perfect', combo, coins: Math.round(coins) },
        };
      }
      sfx.wrong();
      return {
        ...g,
        prepBoard: [],
        combo: 0,
        customers: g.customers.filter((x) => x.id !== customerId),
        mistakes: g.mistakes + 1,
        flash: { kind: 'wrong' },
      };
    });
  }, [phase]);

  function handlePlayAgain() {
    handleStart();
  }

  if (!player) return <div className="px-4 pt-6 text-white/60">Setting up the stall…</div>;

  if (phase === 'prep') {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
        {!player.hasSeenTutorial && (
          <TutorialOverlay
            onFinish={completeTutorial}
            onSkip={completeTutorial}
          />
        )}
        <h1 className="text-2xl font-extrabold text-foreground">Service Round</h1>
        <TrinidadMap value={locId} onChange={(id) => setLocId(Number(id))} businessTier={player.businessTier} />

        <button
          onClick={handleStart}
          className="w-full bg-gradient-to-r from-tropic-magenta to-tropic-sea font-extrabold text-white py-3.5 rounded-2xl shadow-xl active:scale-95 transition flex items-center justify-center gap-2"
        >
          <PlayIcon size={20} /> Begin Service
        </button>

        <div className="bg-fire-tile rounded-3xl p-4 shadow border-white/10">
          <SauceActivator />
        </div>

        <div className="bg-fire-tile rounded-3xl p-4 shadow border-white/10">
          <div className="text-[11px] font-extrabold text-tropic-coral uppercase mb-2">Active Missions</div>
          <MissionsPanel player={player} />
        </div>
      </div>
    );
  }

  if (phase === 'play' && game) {
    const g = game;
    return (
      <div className="flex flex-col h-full pb-2">
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center justify-between text-xs font-extrabold text-white/80">
            <button
              type="button"
              onClick={() => setAskExit(true)}
              aria-label="Leave round"
              className="flex items-center justify-center w-8 h-8 -ml-1 mr-1 rounded-full bg-white/10 hover:bg-white/20 text-tropic-coral active:scale-90 transition"
            >
              <X size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPaused(true)}
              aria-label="Pause round"
              className="flex items-center justify-center w-8 h-8 mr-1 rounded-full bg-white/10 hover:bg-white/20 text-tropic-gold active:scale-90 transition no-tap-highlight touch-manipulation"
            >
              <Pause size={15} />
            </button>
            <span className="flex items-center gap-0.5">
              {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                <Heart key={i} size={14} className={i < g.mistakes ? 'text-tropic-coral/25' : 'text-tropic-coral fill-tropic-coral'} />
              ))}
            </span>
            <span className="flex items-center gap-1 text-tropic-coral"><Flame size={14} /> Combo {g.combo}x</span>
            <span className="flex items-center gap-1 text-tropic-gold"><CoinIcon className="w-4 h-4" /> {Math.round(g.coinsEarned)}</span>
            <span className="flex items-center gap-1 text-tropic-sea"><Gem size={14} /> {Math.round(g.gemsEarned)}</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-3 py-1.5">
          <div className="h-full grid grid-cols-2 gap-2">
            {Array.from({ length: g.maxSlots }).map((_, i) => {
              const c = g.customers[i];
              // 3-4 slots (Wider Stall) render as a 2x2 grid — half the height
              // per slot — so the order bubble switches to compact chips there.
              if (c) return <Customer key={c.id} customer={c} slotIndex={i} compact={g.maxSlots > 2} />;
              return (
                <div key={`slot-${i}`} className="flex items-center justify-center opacity-30 border-2 border-dashed border-white/15 rounded-2xl w-full h-full">
                  <span className="text-2xl">…</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pause overlay: covers the whole board so orders can't be studied
            while time is frozen — pausing is a break, not a planning tool. */}
        {paused && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-4 px-8">
            <div className="text-5xl">⏸️</div>
            <div className="text-2xl font-extrabold text-tropic-gold tracking-widest">PAUSED</div>
            <p className="text-xs text-white/50 text-center">Time is frozen — customers will wait for you.</p>
            <button
              type="button"
              onClick={() => setPaused(false)}
              className="mt-2 bg-gradient-to-r from-tropic-magenta to-tropic-sea text-white font-extrabold px-12 py-3.5 rounded-full shadow-xl active:scale-95 transition duration-75 no-tap-highlight touch-manipulation"
            >
              ▶ Resume
            </button>
            <button
              type="button"
              onClick={() => { setPaused(false); setAskExit(true); }}
              className="text-white/60 text-xs font-bold underline underline-offset-2 no-tap-highlight touch-manipulation"
            >
              Quit round
            </button>
          </div>
        )}

        {g.flash && (
          <div
            key={(g.servedCount || 0) + (g.mistakes || 0)}
            className="fixed left-1/2 top-1/4 -translate-x-1/2 pointer-events-none z-30"
          >
            {g.flash.kind === 'perfect' ? (
              <div className="relative">
                {/* Endurance mode: past 200 serves the sparkle burst (16 animated
                    glowing nodes per serve) is skipped — marathon rounds were
                    accumulating enough render pressure that iOS killed the
                    WebView at round end. The coin text stays; short/normal
                    rounds are unaffected. */}
                {g.servedCount < 200 && <ServeParticles trigger={g.servedCount} />}
                <div className="text-2xl font-extrabold text-tropic-gold drop-shadow animate-[coin-fly_0.7s_ease-out_forwards]">
                  +{g.flash.coins}{' '}<CoinIcon className="w-5 h-5 inline-block align-middle" />{g.flash.combo > 1 ? <span className="text-tropic-coral"> ×{g.flash.combo}</span> : null}
                </div>
              </div>
            ) : (
              <div className="text-2xl font-extrabold text-tropic-coral drop-shadow animate-[shake-soft_0.5s_ease-in-out]">
                ❌ Oops!
              </div>
            )}
          </div>
        )}

        <div className="shrink-0 px-2 pt-2 mt-2">
          <PlayControls
            prepIds={g.prepBoard}
            onAdd={handleAdd}
            onClear={handleClear}
            onServe={handleServe}
            serveCustomerId={g.customers[0]?.id || null}
          />
        </div>

        <AlertDialog open={askExit} onOpenChange={setAskExit}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave this round?</AlertDialogTitle>
              <AlertDialogDescription>
                Your current progress — coins, combos, and customers served this round — will not be saved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Playing</AlertDialogCancel>
              <AlertDialogAction onClick={handleExitRound}>Leave Round</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return <EndOfRoundModal outcome={outcome} onPlayAgain={handlePlayAgain} onMenu={() => navigate('/')} />;
}