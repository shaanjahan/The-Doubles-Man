import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play as PlayIcon, UtensilsCrossed, Sparkles, Crown } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { MALE_CHARACTER, FEMALE_CHARACTER } from '@/lib/game/characters';
import { BUSINESS_TIERS, CUSTOMER_TYPES, MAGIC_SAUCES, INGREDIENTS } from '@/lib/game/catalog';
import SiteFooter from '@/components/SiteFooter';
import { IconPlate } from '@/components/game/art/icons';

// A horizontal scroller of art cards — reused for characters, tiers, sauces.
function ArtRow({ items, accent }) {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-1">
      {items.map((it) => (
        <div
          key={it.id}
          className="shrink-0 w-32 sm:w-36 rounded-2xl border border-white/10 bg-black/40 p-3 flex flex-col items-center gap-2"
        >
          <div className="w-full aspect-square rounded-xl bg-zinc-900 flex items-center justify-center overflow-hidden">
            <Image
              src={it.image}
              alt={it.label}
              fittingType="fit"
              className="w-full h-full p-2 animate-[float-soft_3s_ease-in-out_infinite]"
            />
          </div>
          <div className="text-center">
            <div className="text-xs font-extrabold text-white leading-tight">{it.label}</div>
            {it.sub && <div className={`text-[10px] font-bold ${accent} mt-0.5`}>{it.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  useEffect(() => {
    document.title = 'The Doubles Man';
  }, []);

  const vendors = [
    { id: 'male', label: 'The Vendor', image: MALE_CHARACTER },
    { id: 'female', label: 'The Vendor', image: FEMALE_CHARACTER },
  ];

  const customers = CUSTOMER_TYPES.slice(0, 6).map((c) => ({
    id: c.id,
    label: c.name,
    image: c.image,
  }));

  const tiers = BUSINESS_TIERS.map((b) => ({
    id: b.id,
    label: b.name,
    sub: `${b.incomePerMin}/min`,
    image: b.image,
  }));

  const sauces = MAGIC_SAUCES.slice(0, 6).map((s) => ({
    id: s.id,
    label: s.name,
    sub: s.rarity,
    image: s.image,
  }));

  const ingredients = [INGREDIENTS.bara, INGREDIENTS.channa, INGREDIENTS.tamarind, INGREDIENTS.cucumber, INGREDIENTS.shadow_beni].map((i) => ({
    id: i.id,
    label: i.label,
    image: i.image,
  }));

  return (
    <div className="min-h-[100dvh] bg-doubles-night text-foreground flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-tropic-carnival text-white px-5 pt-16 pb-10 text-center">
        <h1 className="font-heading text-5xl sm:text-6xl tracking-wide text-shadow-soft animate-[pop-in_0.55s_ease-out_both]">
          The Doubles Man
        </h1>
        <p className="mt-3 text-lg font-extrabold">
          Run the doubles stand. Serve the line. Don't run out of pepper.
        </p>
        <p className="mt-3 max-w-lg mx-auto text-white/90 text-sm leading-relaxed">
          A fast, funny arcade game about the hardest job in Trinidad — keeping up with the
          doubles queue. Stack your coins, chase Magic Sauce, and climb the leaderboard.
        </p>
        <Link
          to="/home"
          className="mt-7 inline-flex items-center gap-2 bg-tropic-gold text-black font-extrabold px-7 py-3.5 rounded-full shadow-xl hover:scale-105 active:scale-95 transition animate-[wiggle_2.5s_ease-in-out_infinite]"
        >
          <PlayIcon size={20} /> Play Now
        </Link>

        {/* The two vendors, flanking under the CTA */}
        <div className="mt-10 flex justify-center gap-6">
          {vendors.map((v, i) => (
            <div
              key={v.id}
              className="w-28 sm:w-36 rounded-3xl bg-white/10 border border-white/15 p-2 backdrop-blur-sm"
              style={{ animation: `float-soft 3s ease-in-out ${i * 0.6}s infinite` }}
            >
              <Image src={v.image} alt="Doubles vendor" fittingType="fit" className="w-full aspect-[3/4]" />
            </div>
          ))}
        </div>
      </section>

      {/* Cast — the customers you serve */}
      <section className="max-w-3xl mx-auto w-full py-9">
        <h2 className="px-5 flex items-center gap-2 font-heading text-2xl tracking-wide text-tropic-gold mb-3">
          <UtensilsCrossed size={18} /> Serve the Crew
        </h2>
        <ArtRow items={customers} accent="text-tropic-coral" />
      </section>

      {/* Ingredients strip */}
      <section className="max-w-3xl mx-auto w-full pb-9">
        <div className="flex flex-wrap justify-center gap-3">
          {ingredients.map((it) => (
            <div
              key={it.id}
              className="w-16 h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center"
            >
              {it.image ? (
                <Image src={it.image} alt={it.label} fittingType="fit" className="w-full h-full p-1.5" />
              ) : (
                <IconPlate size={30} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Build your empire — business tiers */}
      <section className="max-w-3xl mx-auto w-full py-2">
        <h2 className="px-5 flex items-center gap-2 font-heading text-2xl tracking-wide text-tropic-gold mb-3">
          <Crown size={18} /> Build Your Empire
        </h2>
        <ArtRow items={tiers} accent="text-tropic-gold" />
      </section>

      {/* Magic Sauce */}
      <section className="max-w-3xl mx-auto w-full py-9">
        <h2 className="px-5 flex items-center gap-2 font-heading text-2xl tracking-wide text-tropic-gold mb-3">
          <Sparkles size={18} /> Magic Sauce
        </h2>
        <ArtRow items={sauces} accent="text-tropic-coral" />
      </section>

      <div className="mt-auto max-w-3xl mx-auto w-full px-5 pb-10">
        <SiteFooter />
      </div>
    </div>
  );
}