import React, { useState } from 'react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { Image } from '@/components/ui/image';
import { CHARACTERS } from '@/lib/game/characters';
import { IconChefHat } from '@/components/game/art/icons';

const CHOICES = CHARACTERS;

export default function CharacterSetup() {
  const { completeSetup } = usePlayerState();
  const [gender, setGender] = useState('male');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const canStart = trimmed.length > 0 && !saving;

  function handleStart() {
    if (!canStart) return;
    setSaving(true);
    completeSetup(trimmed, gender);
    // Layout unmounts this screen once needsSetup flips to false.
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-12 pb-10 text-center">
      <div className="flex justify-center mb-2 animate-[pop-in_0.5s_ease-out_both]">
        <Image
          src="/game/bfc712c85_33E8AE6E-167F-424E-8143-D57BA9D6E8D2.webp"
          alt="Bara"
          className="w-20 h-20 rounded-2xl object-cover ring-2 ring-tropic-gold shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          fittingType="fill"
        />
      </div>
      <h1 className="text-2xl font-extrabold text-foreground">Boy or Gyal</h1>
      <p className="text-sm text-white/60 mt-1">Pick your cook and give them a name to start the hustle.</p>

      <div className="mt-6 text-left">
        <div className="text-[11px] uppercase font-extrabold text-tropic-gold tracking-wide mb-2">Character</div>
        <div className="grid grid-cols-2 gap-3">
          {CHOICES.map((c) => {
            const selected = gender === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setGender(c.id)}
                className={`rounded-3xl p-4 border-2 flex flex-col items-center gap-1 transition ${selected ? 'border-primary bg-primary/15 scale-[1.02]' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
              >
                {c.image ? (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden">
                    <Image src={c.image} alt={c.label} fittingType="fill" className="w-full h-full" />
                  </div>
                ) : (
                  <span className="w-24 h-24 flex items-center justify-center"><IconChefHat size={56} /></span>
                )}
                <span className="font-extrabold text-foreground">{c.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-5 text-left">
        <div className="text-[11px] uppercase font-extrabold text-tropic-gold tracking-wide mb-2">Vendor Name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="e.g. Aunty Mary"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-foreground font-bold placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <button
        onClick={handleStart}
        disabled={!canStart}
        className={`mt-6 w-full font-extrabold py-3 rounded-full transition ${canStart ? 'bg-primary hover:bg-tropic-magenta active:scale-95 text-primary-foreground' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
      >
        {saving ? 'Starting…' : 'Start Serving'}
      </button>
    </div>
  );
}