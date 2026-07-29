import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// One-shot sparkle burst used on perfect serves. `trigger` is a number that
// changes each serve; remounting keyed spans runs the outward animation once.
export default function ServeParticles({ trigger, count = 16 }) {
  const parts = useMemo(() => {
    if (!trigger) return [];
    const colors = ['#fde047', '#fb923c', '#ef4444', '#ffffff'];
    return Array.from({ length: count }, (_, i) => {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 36 + Math.random() * 44;
      return {
        key: `${trigger}-${i}`,
        x: Math.cos(ang) * dist,
        y: Math.sin(ang) * dist - 12,
        size: 6 + Math.random() * 6,
        color: colors[i % colors.length],
      };
    });
  }, [trigger, count]);

  if (!parts.length) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
      {parts.map((p) => (
        <motion.span
          key={p.key}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, background: p.color, boxShadow: `0 0 8px ${p.color}` }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.2 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}