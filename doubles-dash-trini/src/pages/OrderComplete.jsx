import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { IconParty } from '@/components/game/art/icons';

export default function OrderComplete() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      transition={{ type: 'slide', stiffness: 120, damping: 22 }}
      className="max-w-md mx-auto"
    >
      <header className="flex items-center gap-2 px-1 pb-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Back to hub"
          className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-tropic-gold active:scale-90 transition"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-extrabold text-foreground">Order Complete</h1>
      </header>
      <div className="px-4 pt-10 text-center">
        <div className="mb-3 flex justify-center animate-[pop-in_0.5s_ease-out_both]"><IconParty size={64} /></div>
        <h2 className="text-2xl font-extrabold text-foreground">Payment received!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Your purchase is confirmed and your rewards are being added to your stall. If they don't
          appear right away, give it a few seconds — we process them securely in the background.
        </p>
      </div>
    </motion.div>
  );
}