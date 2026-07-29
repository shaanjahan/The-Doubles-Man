import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEffect } from 'react';

export const DEFAULT_PROFILE = {
  vendorName: 'Doubles Vendor',
  avatarId: 'vendor_1',
  coins: 0,
  gems: 0,
  xp: 0,
  level: 1,
  currentLocationId: 'roadside_cart',
  businessTier: 0,
  upgrades: {
    prepSpeed: 0, tipMultiplier: 0, patienceBoost: 0,
    autoRefill: 0, coinMultiplier: 0, xpMultiplier: 0, servingStation: 0,
  },
  equippedSauces: [],
  ownedSauces: [],
  unlockedLocations: ['roadside_cart'],
  streakCount: 0,
  streakLastDate: null,
  lastLevelScore: 0,
  stats: {
    customersServed: 0, perfectOrders: 0, mistakes: 0,
    coinsEarned: 0, highestCombo: 0, lifetimeEarnings: 0, levelsCompleted: 0,
  },
};

export function usePlayer() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['playerProfile'],
    queryFn: async () => {
      const list = await base44.entities.PlayerProfile.filter({});
      if (list.length > 0) return list[0];
      const me = await base44.auth.me().catch(() => null);
      const created = await base44.entities.PlayerProfile.create({
        vendorName: me?.full_name || 'Doubles Vendor',
      });
      return created;
    },
  });

  const profile = query.data || DEFAULT_PROFILE;

  // Auto-claim first-login bonus handled in Home, not here.

  const saveMutation = useMutation({
    mutationFn: async (partial) => {
      if (!query.data) return null;
      const merged = deepMerge(query.data, partial);
      return await base44.entities.PlayerProfile.update(query.data.id, merged);
    },
    onMutate: async (partial) => {
      if (!query.data) return;
      const optimistic = deepMerge(query.data, partial);
      qc.setQueryData(['playerProfile'], optimistic);
      return { previous: query.data };
    },
    onError: (_e, _partial, ctx) => {
      if (ctx?.previous) qc.setQueryData(['playerProfile'], ctx.previous);
    },
  });

  return {
    profile,
    loading: query.isLoading && !query.data,
    save: saveMutation.mutate,
    saveAsync: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    refresh: () => qc.invalidateQueries({ queryKey: ['playerProfile'] }),
  };
}

function deepMerge(target, source) {
  const out = Array.isArray(target) ? [...target] : { ...target };
  for (const key of Object.keys(source || {})) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
    ) {
      out[key] = deepMerge(target[key], source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}