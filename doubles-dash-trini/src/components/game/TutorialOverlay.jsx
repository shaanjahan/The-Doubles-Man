import React, { useState } from 'react';
import { Users, Utensils, ChefHat, ArrowDownToLine, Heart, Target, X } from 'lucide-react';

// First-time "how to play" walkthrough shown over the Service Round prep
// screen. Pure presentation — recording completion (hasSeenTutorial) is the
// caller's job so the flag is written exactly once, whether finished or
// skipped.
const STEPS = [
  {
    icon: Users,
    tone: 'text-tropic-sea',
    title: 'Customers arrive hungry',
    body: 'A customer walks up with an order bubble showing exactly what they want — bara, channa, sauces, and toppings. Read it fast!',
  },
  {
    icon: Utensils,
    tone: 'text-tropic-gold',
    title: 'Tap ingredients to prep',
    body: 'Tap each ingredient in the bottom tray to stack it on your prep board. Match the customer\'s order — bara first, then channa, then the sauces and toppings they asked for.',
  },
  {
    icon: ChefHat,
    tone: 'text-tropic-coral',
    title: 'Build combos for bigger tips',
    body: 'Get the order right and you earn coins + a tip. Serve customers back-to-back without a mistake to build a combo — each combo step multiplies your tip!',
  },
  {
    icon: ArrowDownToLine,
    tone: 'text-tropic-magenta',
    title: 'Tap Serve to deliver',
    body: 'When the prep board matches the order, tap the Serve button to hand the plate to the waiting customer. Wrong combo = a strike and your combo resets.',
  },
  {
    icon: Heart,
    tone: 'text-tropic-coral',
    title: 'Watch their patience',
    body: 'Each customer has a patience bar that drains while they wait. Let it run out and they leave angry — a strike. 3 strikes and the round ends.',
  },
  {
    icon: Target,
    tone: 'text-tropic-sea',
    title: 'Earn & upgrade',
    body: 'Earn coins, gems, and XP every round. Spend them on upgrades, sauces, and new locations. Ready to serve, chef?',
  },
];

export default function TutorialOverlay({ onFinish, onSkip }) {
  const [step, setStep] = useState(0);
  const total = STEPS.length;
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === total - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-5 animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-sm bg-fire-tile rounded-3xl p-6 shadow-2xl border border-white/10 animate-[slideUp_0.25s_ease-out]">
        <button
          type="button"
          onClick={onSkip}
          aria-label="Skip tutorial"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 active:scale-90 transition"
        >
          <X size={16} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
            <Icon size={34} className={current.tone} />
          </div>
        </div>

        <h2 className="text-xl font-extrabold text-center text-foreground">{current.title}</h2>
        <p className="mt-2 text-sm text-white/75 text-center leading-relaxed">{current.body}</p>

        <div className="flex justify-center gap-1.5 mt-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-tropic-gold' : 'w-1.5 bg-white/20'}`}
            />
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          {!isLast && (
            <button
              type="button"
              onClick={onSkip}
              className="flex-1 rounded-md py-2 text-sm font-bold text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? onFinish() : setStep((s) => s + 1))}
            className="flex-1 rounded-md py-2.5 text-sm font-extrabold text-white bg-gradient-to-r from-tropic-magenta to-tropic-sea shadow-lg active:scale-95 transition"
          >
            {isLast ? 'Start Serving' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}