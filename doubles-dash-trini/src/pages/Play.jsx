import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LOCATIONS, MAGIC_SAUCES, BUSINESS_TIERS,
  STOCK, stockRank, restockCost,
} from '@/lib/game/catalog';
import { spawnCustomer, classifyServe, challengeRng } from '@/lib/game/engine';
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
import { IconXBadge, IconPlate, IconBolt } from '@/components/game/art/icons';

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

// UTC day key/seed for Today's Rush — must match the server's UTC date gate.
// Game days run on Trinidad time (fixed UTC-4, no DST) — the daily challenge
// and boards flip at midnight LOCAL, not 8 PM. Mirrors the server functions.
const todayTrini = () => new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10);
const todaySeed = () => Number(todayTrini().replace(/-/g, ''));

function startState(cfg) {
  return {
    elapsed: 0,
    spawnClock: 1500,
    spawnEveryMs: cfg.spawnEveryMs,
    maxSlots: cfg.slots,
    // Daily Challenge: same customer sequence for everyone — customer #i is a
    // pure function of (day, i) via challengeRng, so device/timing can't skew it.
    challenge: !!cfg.challenge,
    challengeSeed: cfg.challenge ? todaySeed() : 0,
    spawnIndex: 0,
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
    sessionId: cfg.sessionId || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random()),
    // Bara Stock: the round's doubles supply. 0 allowance = legacy/no-limit
    // safety fallback (never happens through the normal start paths).
    stockAllowance: cfg.stockAllowance || 0,
    stockLeft: cfg.stockAllowance || 0,
    roundCapped: false,
    soldOut: false,
    flash: null,
  };
}

export function makeSessionId() {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random();
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
      ng.customers.push(spawnCustomer(
        ng.patienceMult,
        ng.challenge ? challengeRng(ng.challengeSeed, ng.spawnIndex) : Math.random,
      ));
      ng.spawnIndex += 1;
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
    challenge: !!g.challenge,
    soldOut: !!g.soldOut,
    score: Math.round(g.coinsEarned + g.perfectCount * 50 + g.maxCombo * 25),
  };
}

export default function Play() {
  const { player, finalizeRound, completeTutorial, buyRoundStock } = usePlayerState();
  const navigate = useNavigate();
  const [phase, setPhase] = useState('prep');
  const [locId, setLocId] = useState(0);
  const [game, setGame] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const savedRef = useRef(false);
  const [askExit, setAskExit] = useState(false);
  const [paused, setPaused] = useState(false);
  // Bara Stock UI state: pre-round crate picker + in-round restock offer.
  const [crates, setCrates] = useState(0);
  const [starting, setStarting] = useState(false);
  const [restockOffer, setRestockOffer] = useState(null);
  const [restocking, setRestocking] = useState(false);
  const [nextRestockCost, setNextRestockCost] = useState(0);
  const [stockMsg, setStockMsg] = useState('');

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
    if ((game.mistakes || 0) < MAX_MISTAKES && !game.roundCapped) return;
    if (savedRef.current) return;
    savedRef.current = true;
    const localOut = computeOutcome(game);
    // Show the summary IMMEDIATELY from the local outcome — the popup must
    // never be gated on the network (a stalled cellular fetch used to leave
    // the round frozen with no summary at all).
    setOutcome(localOut);
    setPhase('over');
    // Then reconcile with the authoritative (server-clamped) outcome in the
    // background. The crash-salvage snapshot is dropped ONLY on confirmed
    // success — if the save failed or stalled, the snapshot stays and the
    // next launch retries it (the server's sessionId replay guard makes the
    // retry a no-op if the round actually did land).
    (async () => {
      const serverOut = await finalizeRound(localOut);
      if (serverOut) {
        try { localStorage.removeItem('doubles_pendingRound'); } catch {}
        setOutcome(serverOut);
      }
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
        challenge: !!game.challenge,
        // Carried into the salvage finalize so the server's replay guard can
        // dedupe if this round also finalized normally.
        sessionId: game.sessionId || '',
      }));
    } catch {}
  }, [phase, game]);

  async function handleStart() {
    if (!player || starting) return;
    unlockAudio();
    sfx.click();
    let loc = LOCATIONS.find((l) => l.id === locId) || LOCATIONS[0];
    // Never dead-end the start button: if the saved location is somehow above
    // the player's tier (stale data), play the always-unlocked starter spot
    // instead — the server 403s locked locations, so this also protects the
    // round's rewards.
    if (loc.unlockTier > (player.businessTier || 0)) loc = LOCATIONS[0];
    const rank = stockRank(player.businessTier);
    const sessionId = makeSessionId();
    let allowance = STOCK.baseByRank[rank];
    // Crates are charged server-side BEFORE the round exists (non-refundable
    // once bought). Zero crates skips the network entirely — the free base
    // stock is the frictionless default.
    if (crates > 0) {
      setStarting(true);
      const bought = await buyRoundStock('start', sessionId, crates);
      setStarting(false);
      if (!bought) { setStockMsg('Could not buy stock — check your dollars and connection.'); return; }
      allowance = bought.allowance;
      setNextRestockCost(bought.nextRestockCost || restockCost(rank, 0));
    } else {
      setNextRestockCost(restockCost(rank, 0));
    }
    setStockMsg('');
    savedRef.current = false;
    setPaused(false);
    setRestockOffer(null);
    const cfg = buildConfig(player, loc);
    cfg.sessionId = sessionId;
    cfg.stockAllowance = allowance;
    setGame(startState(cfg));
    setOutcome(null);
    setPhase('play');
  }

  // Today's Rush: one attempt per UTC day, always at the first location so the
  // shared customer sequence plays out on a level field (your upgrades still
  // count — "same rush, your build"). The server is the real gate; this local
  // check just prevents a wasted round.
  const challengePlayed = (player?.lastChallengeDay || '') === todayTrini();
  function handleStartChallenge() {
    if (!player || challengePlayed) return;
    unlockAudio();
    sfx.click();
    savedRef.current = false;
    const cfg = buildConfig(player, LOCATIONS[0]);
    cfg.challenge = true;
    // Level field: fixed free stock for everyone, no investing, no restocks.
    cfg.stockAllowance = STOCK.challengeStock;
    setRestockOffer(null);
    setGame(startState(cfg));
    setOutcome(null);
    setPhase('play');
  }

  // Bara Stock: hitting zero pauses the round with the restock offer —
  // continue for an escalating price, or finish with a SOLD OUT win. The
  // challenge is a level field, so it always finishes.
  useEffect(() => {
    if (phase !== 'play' || !game || savedRef.current) return;
    if (!(game.stockAllowance > 0) || game.stockLeft > 0 || game.roundCapped) return;
    if (game.challenge) {
      setGame((g) => ({ ...g, roundCapped: true, soldOut: true }));
      return;
    }
    setPaused(true);
    setRestockOffer({ cost: nextRestockCost });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, game?.stockLeft, game?.roundCapped]);

  async function handleRestock() {
    if (!game || restocking) return;
    setRestocking(true);
    const r = await buyRoundStock('restock', game.sessionId);
    setRestocking(false);
    if (!r) { setStockMsg('Restock failed — not enough dollars?'); return; }
    setStockMsg('');
    setNextRestockCost(r.nextRestockCost || 0);
    setGame((g) => (g ? { ...g, stockLeft: g.stockLeft + (r.added || 0), stockAllowance: (g.stockAllowance || 0) + (r.added || 0) } : g));
    setRestockOffer(null);
    setPaused(false);
  }

  function handleFinishSoldOut() {
    setRestockOffer(null);
    setPaused(false);
    setGame((g) => (g ? { ...g, roundCapped: true, soldOut: true } : g));
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
        // Bara Stock: each double sold consumes stock (Double Trouble burns
        // two per tap). Hitting zero pauses for the restock offer (effect).
        const stockLeft = g.stockAllowance > 0 ? Math.max(0, g.stockLeft - served) : g.stockLeft;
        return {
          ...g,
          stockLeft,
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

        {/* Bara Stock: free base by vendor rank + optional crate investment.
            Bought crates are charged up-front and don't keep — quitting
            forfeits them. */}
        {(() => {
          const rank = stockRank(player.businessTier);
          const base = STOCK.baseByRank[rank];
          const maxCrates = STOCK.maxCratesByRank[rank];
          const price = STOCK.cratePriceByRank[rank];
          const cost = crates * price;
          const afford = (player.coins || 0) >= cost;
          return (
            <div className="bg-fire-tile rounded-3xl p-4 shadow border border-white/10">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-extrabold text-tropic-gold uppercase">Bara Stock</div>
                <div className="text-xs font-extrabold text-white">
                  {base + crates * STOCK.crateSize} doubles
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="text-[11px] text-white/60">
                  {base} free · crates of {STOCK.crateSize} at {price.toLocaleString()} <CoinIcon className="w-3 h-3 inline-block" /> each
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setCrates((c) => Math.max(0, c - 1))}
                    className="w-8 h-8 rounded-full bg-white/10 text-white font-extrabold active:scale-90 no-tap-highlight">−</button>
                  <span className="w-6 text-center font-extrabold text-tropic-gold">{crates}</span>
                  <button type="button" onClick={() => setCrates((c) => Math.min(maxCrates, c + 1))}
                    className="w-8 h-8 rounded-full bg-white/10 text-white font-extrabold active:scale-90 no-tap-highlight">+</button>
                </div>
              </div>
              {crates > 0 && (
                <div className={`mt-1.5 text-[11px] font-bold ${afford ? 'text-white/70' : 'text-tropic-coral'}`}>
                  Invest {cost.toLocaleString()} <CoinIcon className="w-3 h-3 inline-block" /> — non-refundable, sells this round only{afford ? '' : ' · not enough dollars'}
                </div>
              )}
              {stockMsg && <div className="mt-1.5 text-[11px] font-bold text-tropic-coral">{stockMsg}</div>}
            </div>
          );
        })()}

        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full bg-gradient-to-r from-tropic-magenta to-tropic-sea font-extrabold text-white py-3.5 rounded-2xl shadow-xl active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <PlayIcon size={20} /> {starting ? 'Buying stock…' : 'Begin Service'}
        </button>

        {/* Today's Rush — the daily challenge. Same customers for every player. */}
        <div className="bg-fire-tile rounded-3xl p-4 shadow border border-tropic-gold/40">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold text-tropic-gold uppercase inline-flex items-center gap-1"><IconBolt size={13} /> Today's Rush</div>
              <div className="text-xs text-white/70 mt-0.5">
                Same customers for everyone, one try a day. Top the daily board!
              </div>
            </div>
            <button
              onClick={handleStartChallenge}
              disabled={challengePlayed}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold shrink-0 transition ${challengePlayed ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-tropic-gold text-black hover:scale-105 active:scale-95'}`}
            >
              {challengePlayed ? 'Done today ✓' : 'Take it on'}
            </button>
          </div>
        </div>

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
            {g.stockAllowance > 0 && (
              <span className={`ml-1.5 inline-flex items-center gap-1 text-[11px] font-extrabold rounded-full px-2 py-0.5 ${g.stockLeft <= 25 ? 'bg-tropic-coral/25 text-tropic-coral' : 'bg-white/10 text-tropic-gold'}`}>
                <IconPlate size={12} /> {g.stockLeft}
              </span>
            )}
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

        {/* SOLD OUT / restock sheet: stock hit zero — continue for an
            escalating price or bank the round with the sellout bonus. */}
        {paused && restockOffer && (
          <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center gap-4 px-8">
            <IconPlate size={56} />
            <div className="text-2xl font-extrabold text-tropic-gold tracking-widest">SOLD OUT!</div>
            <p className="text-xs text-white/60 text-center max-w-xs">
              Every double gone! Restock {'—'} prices climb each time {'—'} or finish now and take the Sold Out bonus.
            </p>
            <button
              type="button"
              onClick={handleRestock}
              disabled={restocking || (player?.coins || 0) < nextRestockCost}
              className="mt-1 w-full max-w-xs bg-gradient-to-r from-tropic-magenta to-tropic-sea text-white font-extrabold py-3.5 rounded-full shadow-xl active:scale-95 transition disabled:opacity-50 no-tap-highlight flex items-center justify-center gap-1.5"
            >
              {restocking ? 'Restocking…' : (<><span>Restock</span> {nextRestockCost.toLocaleString()} <CoinIcon className="w-4 h-4 inline-block" /></>)}
            </button>
            {(player?.coins || 0) < nextRestockCost && (
              <div className="text-[11px] font-bold text-tropic-coral">Not enough dollars to restock</div>
            )}
            {stockMsg && <div className="text-[11px] font-bold text-tropic-coral">{stockMsg}</div>}
            <button
              type="button"
              onClick={handleFinishSoldOut}
              className="w-full max-w-xs bg-white/10 text-tropic-gold font-extrabold py-3 rounded-full active:scale-95 transition no-tap-highlight"
            >
              Finish — SOLD OUT bonus
            </button>
          </div>
        )}

        {/* Pause overlay: covers the whole board so orders can't be studied
            while time is frozen — pausing is a break, not a planning tool. */}
        {paused && !restockOffer && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-4 px-8">
            <Pause size={44} className="text-tropic-gold" />
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
                {/* Endurance mode: past 200 serves the sparkle burst is skipped —
                    marathon rounds accumulated enough render pressure that iOS
                    killed the WebView at round end. Mirrors main. */}
                {g.servedCount < 200 && <ServeParticles trigger={g.servedCount} />}
                <div className="text-2xl font-extrabold text-tropic-gold drop-shadow animate-[coin-fly_0.7s_ease-out_forwards]">
                  +{g.flash.coins}{' '}<CoinIcon className="w-5 h-5 inline-block align-middle" />{g.flash.combo > 1 ? <span className="text-tropic-coral"> ×{g.flash.combo}</span> : null}
                </div>
              </div>
            ) : (
              <div className="text-2xl font-extrabold text-tropic-coral drop-shadow animate-[shake-soft_0.5s_ease-in-out] inline-flex items-center gap-1.5">
                <IconXBadge size={22} /> Oops!
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
                Your current progress — coins, combos, and customers served this round — will not be saved. Invested bara stock doesn't keep and will be lost.
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