import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '@/lib/usePlayer';
import {
  INGREDIENTS, CUSTOMER_TYPES, buildLevelConfig, generateOrder, compareOrders,
  xpForLevel, RANDOM_EVENTS, MAGIC_SAUCES,
} from '@/lib/gameData';
import CustomerCard from '@/components/game/CustomerCard';
import IngredientButton from '@/components/game/IngredientButton';
import { cn } from '@/lib/utils';
import { X, Clock, Coins, Flame, RotateCcw, Crown, Home } from 'lucide-react';

const MAX_QUEUE = 4;

export default function Game() {
  const navigate = useNavigate();
  const { profile, saveAsync } = usePlayer();
  const [phase, setPhase] = useState('intro'); // intro | playing | complete
  const [, forceRender] = useState(0);
  const render = useCallback(() => forceRender((n) => n + 1), []);
  const game = useRef(null);
  const config = useRef(null);
  const [event, setEvent] = useState(null);

  const startGame = useCallback(() => {
    const cfg = buildLevelConfig(profile.level);
    config.current = cfg;
    let activeEvent = null;
    if (Math.random() < 0.35) {
      activeEvent = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
      setEvent(activeEvent);
    } else {
      setEvent(null);
    }
    const prepMult = 1 + profile.upgrades.prepSpeed * 0.08 + (hasSauce('turbo_sauce') ? 1 : 0);
    game.current = {
      customers: [],
      built: [],
      coins: 0,
      xp: 0,
      combo: 0,
      maxCombo: 0,
      timeLeft: cfg.timeLimit,
      served: 0,
      perfect: 0,
      mistakes: 0,
      spawnTimer: 1.5,
      prepMult,
      activeEvent,
      target: cfg.customersTarget,
      totalTime: cfg.timeLimit,
    };
    setPhase('playing');
    render();
  }, [profile, render]);

  function hasSauce(id) {
    return profile.equippedSauces?.includes(id);
  }

  // Main loop
  useEffect(() => {
    if (phase !== 'playing') return;
    const dt = 0.1;
    const tick = setInterval(() => {
      const g = game.current;
      if (!g) return;
      g.timeLeft -= dt;
      if (g.timeLeft <= 0) { finishLevel(); return; }
      // patience drain
      const patienceMult = 1 + profile.upgrades.patienceBoost * 0.06 + (hasSauce('carnival_sauce') ? 0.25 : 0) + (g.activeEvent?.id === 'rainstorm' ? 0.3 : 0);
      g.customers.forEach((c) => {
        c.patience -= (c.drain / (c.typeDef.patience * patienceMult)) * dt;
      });
      // timeouts
      const timedOut = g.customers.filter((c) => c.patience <= 0);
      if (timedOut.length) {
        g.mistakes += timedOut.length;
        g.combo = 0;
      }
      g.customers = g.customers.filter((c) => c.patience > 0);
      // spawn
      if (g.served + g.customers.length < g.target) {
        g.spawnTimer -= dt;
        if (g.spawnTimer <= 0 && g.customers.length < MAX_QUEUE) {
          spawnCustomer(g);
          let baseInt = config.current.spawnInterval;
          if (g.activeEvent?.id === 'rush_hour') baseInt *= 0.5;
          if (g.activeEvent?.id === 'rainstorm') baseInt *= 1.6;
          if (hasSauce('ghost_pepper')) baseInt *= 1.4;
          g.spawnTimer = baseInt;
        }
      }
      render();
    }, 100);
    return () => clearInterval(tick);
  }, [phase, profile, render]);

  function spawnCustomer(g) {
    const cfg = config.current;
    const isCritic = g.activeEvent?.id === 'food_critic' && g.customers.length === 0 && Math.random() < 0.5;
    const typeDef = isCritic
      ? CUSTOMER_TYPES.find((c) => c.id === 'food_critic')
      : CUSTOMER_TYPES[Math.floor(Math.random() * (CUSTOMER_TYPES.length - 1))];
    const drain = 5 + cfg.level * 0.45;
    g.customers.push({
      id: Math.random().toString(36).slice(2),
      typeDef,
      vip: !!typeDef.vip,
      order: generateOrder(cfg.complexity),
      patience: 100,
      drain,
      leaving: false,
    });
  }

  const addIngredient = (id) => {
    const g = game.current;
    if (!g || phase !== 'playing') return;
    // shadow beni spirit auto-fill assist handled visually
    g.built.push(id);
    render();
  };

  const clearBuilt = () => {
    const g = game.current;
    if (!g) return;
    g.built = [];
    render();
  };

  const serve = () => {
    const g = game.current;
    if (!g || g.customers.length === 0) return;
    const customer = g.customers[0];
    const result = compareOrders(g.built, customer.order);
    g.built = [];
    if (result === 'wrong') {
      g.mistakes += 1;
      g.combo = 0;
      flash('wrong', 0);
    } else {
      const cfg = config.current;
      const coinMult = 1 + profile.upgrades.coinMultiplier * 0.12 + (hasSauce('golden_tamarind') ? 1 : 0) + (g.activeEvent?.id === 'double_coins' ? 1 : 0);
      const tipMult = 1 + profile.upgrades.tipMultiplier * 0.10 + (g.activeEvent?.id === 'carnival' ? 1 : 0);
      const perfect = result === 'perfect';
      let base = cfg.baseReward * coinMult * customer.typeDef.tip * tipMult;
      let comboBonus = g.combo * 2;
      let perfBonus = perfect ? Math.round(base * 0.5) : 0;
      let total = Math.round(base + comboBonus + perfBonus);
      g.coins += total;
      g.combo += 1;
      g.maxCombo = Math.max(g.maxCombo, g.combo);
      g.served += 1;
      if (perfect) g.perfect += 1;
      const xpGain = Math.round((cfg.baseReward * 0.5 + (perfect ? 5 : 0)) * (1 + profile.upgrades.xpMultiplier * 0.12));
      g.xp += xpGain;
      flash(perfect ? 'perfect' : 'good', total);
      customer.leaving = true;
      g.customers = g.customers.filter((c) => c.id !== customer.id);
      if (g.served >= g.target) { finishLevel(); }
    }
    render();
  };

  const [feedback, setFeedback] = useState(null);
  const flash = (type, amount) => {
    setFeedback({ type, amount, id: Math.random() });
    setTimeout(() => setFeedback(null), 900);
  };

  const finishLevel = useCallback(async () => {
    const g = game.current;
    if (!g) return;
    setPhase('complete');
    // save progress
    const xpNeeded = xpForLevel(profile.level);
    let newLevel = profile.level;
    let newXp = profile.xp + g.xp;
    while (newXp >= xpForLevel(newLevel)) {
      newXp -= xpForLevel(newLevel);
      newLevel += 1;
    }
    const newStats = {
      customersServed: profile.stats.customersServed + g.served,
      perfectOrders: profile.stats.perfectOrders + g.perfect,
      mistakes: profile.stats.mistakes + g.mistakes,
      coinsEarned: profile.stats.coinsEarned + g.coins,
      highestCombo: Math.max(profile.stats.highestCombo, g.maxCombo),
      lifetimeEarnings: profile.stats.lifetimeEarnings + g.coins,
      levelsCompleted: profile.stats.levelsCompleted + 1,
    };
    await saveAsync({
      coins: profile.coins + g.coins,
      xp: newXp,
      level: newLevel,
      lastLevelScore: g.coins,
      gems: profile.gems + (hasSauce('lucky_sauce') ? 1 : 0),
      stats: newStats,
    });
  }, [profile, saveAsync]);

  if (phase === 'intro') return <IntroScreen profile={profile} onPlay={startGame} onExit={() => navigate('/')} />;
  if (phase === 'complete' && game.current) return <CompleteScreen g={game.current} profile={profile} onReplay={startGame} onHome={() => navigate('/')} />;

  const g = game.current;
  return (
    <div className="min-h-screen bg-background max-w-md mx-auto flex flex-col">
      <GameHUD g={g} event={event} onQuit={() => navigate('/')} />
      {/* Customer queue */}
      <div className="px-3 pt-3 flex-1 overflow-hidden">
        <div className="flex items-end gap-2 min-h-[170px]">
          {g.customers.length === 0 ? (
            <div className="w-full text-center text-muted-foreground text-sm font-heading pt-10">Waiting for customers... 🌴</div>
          ) : (
            g.customers.slice(0, MAX_QUEUE).map((c, i) => (
              <div key={c.id} style={{ transform: `translateY(${i * -6}px) scale(${1 - i * 0.06})`, zIndex: 10 - i, opacity: 1 - i * 0.12 }} className={cn(i > 0 && 'origin-bottom')}>
                <CustomerCard customer={c} isServing={i === 0} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="px-4 text-center">
          <div className={cn('animate-combo-pop inline-block font-heading font-extrabold text-2xl', feedback.type === 'perfect' ? 'text-tropic-gold' : feedback.type === 'good' ? 'text-tropic-green' : 'text-destructive')}>
            {feedback.type === 'perfect' && 'PERFECT! 🌟'}
            {feedback.type === 'good' && 'Good! 👍'}
            {feedback.type === 'wrong' && 'Wrong! 😖'}
            {feedback.amount > 0 && <span className="ml-2 text-tropic-coral">+{feedback.amount}🪙</span>}
          </div>
        </div>
      )}

      {/* Prep tray */}
      <div className="px-4 mt-2">
        <div className="rounded-2xl bg-tropic-sand/40 border-2 border-tropic-gold/40 p-2 min-h-[52px] flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {g.built.length === 0 ? (
            <p className="text-xs text-muted-foreground font-semibold w-full text-center">Tap ingredients to build the doubles 🫓</p>
          ) : (
            g.built.map((id, i) => {
              const ing = INGREDIENTS.find((x) => x.id === id);
              return (
                <span key={i} className="animate-pop-in text-2xl" style={{ animationDelay: `${i * 40}ms` }}>{ing?.emoji}</span>
              );
            })
          )}
        </div>
      </div>

      {/* Ingredient station */}
      <div className="px-3 pb-3 pt-2">
        <div className="grid grid-cols-6 gap-1.5">
          {INGREDIENTS.map((ing) => (
            <IngredientButton
              key={ing.id}
              ingredient={ing}
              onClick={() => addIngredient(ing.id)}
            />
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={clearBuilt} className="no-tap-highlight flex-1 bg-muted text-muted-foreground font-heading font-bold py-3 rounded-2xl active:scale-95 transition flex items-center justify-center gap-1.5">
            <X className="w-4 h-4" /> Clear
          </button>
          <button onClick={serve} className="no-tap-highlight flex-[2] bg-tropic-coral text-white font-heading font-extrabold py-3 rounded-2xl active:scale-95 transition shadow-lg shadow-tropic-coral/40 flex items-center justify-center gap-1.5">
            Serve! 🍽️
          </button>
        </div>
      </div>
    </div>
  );
}

function GameHUD({ g, event, onQuit }) {
  return (
    <div className="px-3 pt-3">
      <div className="flex items-center gap-2">
        <button onClick={onQuit} className="no-tap-highlight w-9 h-9 rounded-xl bg-card border border-border/70 grid place-items-center active:scale-90">
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1 h-9 rounded-xl bg-card border border-border/70 flex items-center px-2 gap-2">
          <Clock className="w-4 h-4 text-tropic-teal" />
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-tropic-sea transition-all duration-100" style={{ width: `${Math.max(0, (g.timeLeft / (g.totalTime || 60)) * 100)}%` }} />
          </div>
          <span className="text-xs font-bold tabular-nums">{Math.ceil(g.timeLeft)}s</span>
        </div>
        <div className="h-9 px-2.5 rounded-xl bg-tropic-gold/15 border border-tropic-gold/40 flex items-center gap-1">
          <Coins className="w-4 h-4 text-tropic-gold" />
          <span className="text-sm font-extrabold tabular-nums text-tropic-gold">{g.coins}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1.5 px-1">
        <div className="flex items-center gap-1">
          <Flame className={cn('w-4 h-4', g.combo >= 3 ? 'text-tropic-coral animate-combo-pop' : 'text-muted-foreground')} />
          <span className="text-xs font-bold text-foreground">{g.combo}x combo</span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{g.served}/{g.target} served</span>
        {event && (
          <div className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', 'bg-tropic-carnival text-white')}>
            {event.emoji} {event.name}
          </div>
        )}
      </div>
    </div>
  );
}

function IntroScreen({ profile, onPlay, onExit }) {
  return (
    <div className="min-h-screen max-w-md mx-auto bg-tropic-sunset flex flex-col items-center justify-center text-white p-6 text-center">
      <h1 className="font-heading font-extrabold text-4xl text-shadow-soft animate-float-soft">The Doubles Man</h1>
      <p className="mt-2 font-semibold text-white/90 max-w-xs">Build doubles fast, keep the combo alive, and grow your Caribbean empire!</p>
      <div className="mt-8 bg-white/15 backdrop-blur rounded-3xl p-5 w-full max-w-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-white/80">Level {profile.level}</p>
        <p className="font-heading text-xl font-bold">Get Ready, {profile.vendorName}</p>
        <div className="mt-4 flex justify-center gap-2 text-3xl">
          {['🫓', '🫘', '🌶️', '🥒', '🌿'].map((e, i) => (
            <span key={i} className="animate-float-soft" style={{ animationDelay: `${i * 0.2}s` }}>{e}</span>
          ))}
        </div>
      </div>
      <button onClick={onPlay} className="no-tap-highlight mt-8 bg-white text-tropic-coral font-heading font-extrabold text-xl px-12 py-4 rounded-2xl shadow-xl active:scale-95 transition">
        Start Cooking 🍽️
      </button>
      <button onClick={onExit} className="no-tap-highlight mt-3 text-white/80 text-sm font-semibold">Back to hub</button>
    </div>
  );
}

function CompleteScreen({ g, profile, onReplay, onHome }) {
  const stars = g.perfect / Math.max(1, g.served) > 0.7 ? 3 : g.perfect / Math.max(1, g.served) > 0.4 ? 2 : 1;
  return (
    <div className="min-h-screen max-w-md mx-auto bg-tropic-carnival flex flex-col items-center justify-center text-white p-6 text-center">
      <Crown className="w-12 h-12 text-tropic-gold mb-2 animate-float-soft" />
      <h1 className="font-heading font-extrabold text-3xl text-shadow-soft">Round Complete!</h1>
      <div className="flex gap-2 mt-3">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn('text-4xl', i < stars ? 'animate-pop-in' : 'opacity-30 grayscale')} style={{ animationDelay: `${i * 0.15}s` }}>⭐</span>
        ))}
      </div>
      <div className="mt-6 bg-white/15 backdrop-blur rounded-3xl p-5 w-full max-w-sm space-y-2 text-left">
        <Row label="Coins earned" value={`🪙 ${g.coins}`} />
        <Row label="Customers served" value={`🙌 ${g.served}`} />
        <Row label="Perfect orders" value={`✨ ${g.perfect}`} />
        <Row label="Mistakes" value={`😖 ${g.mistakes}`} />
        <Row label="Best combo" value={`🔥 ${g.maxCombo}x`} />
        <Row label="XP gained" value={`⭐ ${g.xp}`} />
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onHome} className="no-tap-highlight flex items-center gap-1.5 bg-white/20 text-white font-heading font-bold px-5 py-3 rounded-2xl active:scale-95 transition">
          <Home className="w-4 h-4" /> Hub
        </button>
        <button onClick={onReplay} className="no-tap-highlight flex items-center gap-1.5 bg-white text-tropic-coral font-heading font-extrabold px-6 py-3 rounded-2xl active:scale-95 transition shadow-lg">
          <RotateCcw className="w-4 h-4" /> Play Again
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm font-semibold">
      <span className="text-white/80">{label}</span>
      <span className="font-extrabold">{value}</span>
    </div>
  );
}