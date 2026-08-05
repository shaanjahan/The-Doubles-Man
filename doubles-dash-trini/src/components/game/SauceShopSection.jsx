import React, { useState } from 'react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { MAGIC_SAUCES, RARITY_STYLE, RARITY_ORDER, SAUCE_PRICES, SAUCE_PACK_ODDS } from '@/lib/game/catalog';
import SauceIcon from '@/components/SauceIcon';
import GemIcon from '@/components/GemIcon';

// Magic Sauces section of the Store: a rarity-priced sauce list (buy any sauce
// directly with gems — Common cheapest through Legendary) plus the random
// mystery 3-pack. Equipping moved entirely to the Play page's "Tap to
// Activate" panel, so the store is purely for buying.

const PACK_COST = 15;

export default function SauceShopSection() {
  const { player, openSaucePack, buySauce } = usePlayerState();
  const [lastOpened, setLastOpened] = useState([]);
  const [buyingId, setBuyingId] = useState(null);
  if (!player) return null;

  const ownedMap = {};
  (player.magicSauces || []).forEach((s) => { ownedMap[s.id] = s.count || 0; });
  const gems = player.gems || 0;
  const affordPack = gems >= PACK_COST;

  // Price list order: cheapest rarity first, then by name within a rarity.
  const priceList = [...MAGIC_SAUCES].sort((a, b) => {
    const r = RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    return r !== 0 ? r : a.name.localeCompare(b.name);
  });

  async function handleOpenPack() {
    if (!affordPack) return;
    const got = await openSaucePack();
    setLastOpened(got || []);
  }

  async function handleBuy(id) {
    if (buyingId) return;
    setBuyingId(id);
    await buySauce(id);
    setBuyingId(null);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-[11px] uppercase font-extrabold text-purple-700 tracking-wide">Magic Sauces</h2>

      {/* Rarity price key */}
      <div className="bg-white rounded-2xl p-3 shadow border border-purple-100">
        <div className="text-[11px] uppercase font-extrabold text-purple-700 mb-1.5">Sauce Prices</div>
        <div className="flex flex-wrap gap-1.5">
          {RARITY_ORDER.map((r) => {
            const style = RARITY_STYLE[r];
            return (
              <span key={r} className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-1 rounded-full border ${style.bg} ${style.border} ${style.text}`}>
                {r} · {SAUCE_PRICES[r]} <GemIcon className="w-3 h-3 inline-block" />
              </span>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5">Activate owned sauces on the Play page before a round.</p>
      </div>

      {/* Mystery pack */}
      <div className="bg-white rounded-2xl p-3 shadow border border-amber-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-extrabold text-rose-500">Mystery Sauce Pack</div>
            <div className="text-sm font-extrabold text-slate-700">Open 3 random sauces</div>
            {/* Apple 3.1.1: odds disclosed wherever the randomized pack is sold,
                including for premium (gem) currency. Matches the server roll. */}
            <div className="text-[10px] text-slate-400 mt-0.5">
              Odds per sauce: {SAUCE_PACK_ODDS.map((o) => `${o.rarity} ${o.pct}%`).join(' · ')}
            </div>
          </div>
          <button
            onClick={handleOpenPack}
            disabled={!affordPack}
            className={`px-4 py-2 rounded-full text-sm font-extrabold flex items-center gap-1.5 transition ${affordPack ? 'bg-rose-400 text-white hover:bg-rose-500 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            <GemIcon className="w-4 h-4" /> {PACK_COST}
          </button>
        </div>
        {lastOpened.length > 0 && (
          <div className="mt-3 flex gap-2 items-center bg-rose-50 rounded-2xl p-2">
            <span className="text-xs text-slate-600 font-bold">Got:</span>
            {lastOpened.map((id, i) => {
              const s = MAGIC_SAUCES.find((x) => x.id === id);
              if (!s) return null;
              return <SauceIcon key={i} sauce={s} sizeClass="w-8 h-8" emojiClass="text-2xl" />;
            })}
          </div>
        )}
      </div>

      {/* Price list, cheapest rarity first */}
      <div className="space-y-2">
        {priceList.map((s) => {
          const count = ownedMap[s.id] || 0;
          const style = RARITY_STYLE[s.rarity];
          const price = SAUCE_PRICES[s.rarity];
          const afford = gems >= price;
          return (
            <div key={s.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${style.bg} ${style.border}`}>
              <SauceIcon sauce={s} sizeClass="w-12 h-12" emojiClass="text-2xl" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-800 text-sm">{s.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 rounded-full ${style.text} bg-white/70`}>{s.rarity}</span>
                </div>
                <div className="text-[11px] text-slate-600">{s.description}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Owned: {count}</div>
              </div>
              <button
                onClick={() => handleBuy(s.id)}
                disabled={!afford || buyingId !== null}
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1 transition shrink-0 ${afford ? 'bg-purple-500 text-white hover:bg-purple-600 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                {buyingId === s.id ? '…' : (<><GemIcon className="w-3.5 h-3.5" /> {price}</>)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
