import React, { useState } from 'react';
import { Gem } from 'lucide-react';
import { usePlayerState } from '@/lib/game/PlayerContext';
import { MAGIC_SAUCES, RARITY_STYLE } from '@/lib/game/catalog';
import SauceIcon from '@/components/SauceIcon';

// In-game Magic Sauces section for the real-money Store: equip owned sauces
// (up to 2 per round) and buy a mystery 3-pack with gems. Moved here from the
// old standalone Sauces page so one tab holds all purchasing.

const PACK_COST = 15;

export default function SauceShopSection() {
  const { player, toggleEquipSauce, openSaucePack } = usePlayerState();
  const [lastOpened, setLastOpened] = useState([]);
  if (!player) return null;

  const ownedMap = {};
  (player.magicSauces || []).forEach((s) => { ownedMap[s.id] = s.count || 0; });
  const equipped = player.equippedSauces || [];
  const affordPack = (player.gems || 0) >= PACK_COST;

  function handleOpenPack() {
    if (!affordPack) return;
    const got = openSaucePack(PACK_COST) || [];
    setLastOpened(got);
  }

  return (
    <div className="space-y-3">
      <h2 className="text-[11px] uppercase font-extrabold text-purple-700 tracking-wide">Magic Sauces</h2>

      {/* Equipped slots */}
      <div className="bg-white rounded-2xl p-3 shadow border border-purple-100">
        <div className="text-[11px] uppercase font-extrabold text-purple-700 mb-1">Equipped ({equipped.length}/2)</div>
        {equipped.length === 0 ? (
          <p className="text-xs text-slate-400">No sauce equipped. Tap an owned sauce below to equip.</p>
        ) : (
          <div className="space-y-1.5">
            {equipped.map((id) => {
              const s = MAGIC_SAUCES.find((x) => x.id === id);
              if (!s) return null;
              return (
                <button key={id} onClick={() => toggleEquipSauce(id)} className="w-full bg-purple-50 border border-purple-200 rounded-2xl px-2 py-2 flex items-center gap-2 text-left active:scale-95">
                  <SauceIcon sauce={s} sizeClass="w-9 h-9" emojiClass="text-2xl" />
                  <div className="text-[11px] flex-1">
                    <div className="font-bold text-slate-800">{s.name}</div>
                    <div className="text-slate-500">{s.description}</div>
                  </div>
                  <span className="text-[10px] text-rose-500 font-bold px-2">remove</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Mystery pack */}
      <div className="bg-white rounded-2xl p-3 shadow border border-amber-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase font-extrabold text-rose-500">Mystery Sauce Pack</div>
            <div className="text-sm font-extrabold text-slate-700">Open 3 random sauces</div>
          </div>
          <button
            onClick={handleOpenPack}
            disabled={!affordPack}
            className={`px-4 py-2 rounded-full text-sm font-extrabold flex items-center gap-1 transition ${affordPack ? 'bg-rose-400 text-white hover:bg-rose-500 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          >
            <Gem size={14} /> {PACK_COST}
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

      {/* Collection */}
      <div className="space-y-2">
        {MAGIC_SAUCES.map((s) => {
          const count = ownedMap[s.id] || 0;
          const isEquipped = equipped.includes(s.id);
          const style = RARITY_STYLE[s.rarity];
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
              {count > 0 ? (
                <button
                  onClick={() => toggleEquipSauce(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition ${isEquipped ? 'bg-emerald-400 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:scale-95'}`}
                >
                  {isEquipped ? 'Equipped ✓' : 'Equip'}
                </button>
              ) : (
                <div className="text-[10px] text-slate-400 font-bold">Not owned</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}