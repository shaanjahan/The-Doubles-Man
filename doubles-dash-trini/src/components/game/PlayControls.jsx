import React from 'react';
import { SAUCE_CHOICES, TOPPING_CHOICES } from '@/lib/game/catalog';
import PrepBar from './PrepBar';
import IngredientButton from './IngredientButton';
import ChannaScoop from './ChannaScoop';
import SauceBottle from './SauceBottle';
import PepperSlider from './PepperSlider';

// The static bottom control panel (prep tray + ingredient buttons + pepper
// slider). Its content does NOT depend on the per-tick game state — only on
// the current prep board and the add/clear handlers — so memoizing it keeps
// the 10×/sec game tick from reconciling ~12 image-bearing buttons each tick.
export default React.memo(function PlayControls({ prepIds, onAdd, onClear, onServe, serveCustomerId }) {
  return (
    <>
      <PrepBar prepIds={prepIds} onClear={onClear} />
      <div className="mt-2 px-1">
        <div className="text-[10px] font-extrabold text-tropic-gold uppercase tracking-wide">
          Bara, Channa, Sauces & Toppings
        </div>
        <div className="mt-1 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <IngredientButton key="bara" ingredientId="bara" onClick={() => onAdd('bara')} />
          <ChannaScoop key="channa" ingredientId="channa" onAdd={onAdd} />
          {SAUCE_CHOICES.map((id) => (
            <SauceBottle key={id} ingredientId={id} onAdd={onAdd} />
          ))}
          {TOPPING_CHOICES.map((id) => (
            <IngredientButton key={id} ingredientId={id} onClick={() => onAdd(id)} />
          ))}
        </div>
      </div>

      <PepperSlider prepIds={prepIds} onAdd={onAdd} />

      <div className="px-1 mb-2">
        <button
          onClick={() => onServe && onServe(serveCustomerId)}
          disabled={!serveCustomerId}
          className="w-full bg-gradient-to-r from-tropic-magenta to-tropic-sea font-extrabold text-white py-3 rounded-2xl shadow-lg active:scale-95 transition disabled:opacity-40"
        >
          Serve ⤵
        </button>
      </div>
    </>
  );
});