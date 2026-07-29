import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Server-authoritative daily reward claim. The client previously decided which
// reward tier to grant and updated the profile directly, so an attacker could
// claim repeatedly or jump straight to the day-7 reward. The server now checks
// the last-claim date against the current date and applies the reward itself.

const DAILY_REWARDS = [
  { day: 1, reward: { type: 'coins', amount: 100 } },
  { day: 2, reward: { type: 'coins', amount: 250 } },
  { day: 3, reward: { type: 'gems', amount: 2 } },
  { day: 4, reward: { type: 'coins', amount: 500 } },
  { day: 5, reward: { type: 'sauce', sauceId: 'lucky_sauce' } },
  { day: 6, reward: { type: 'gems', amount: 5 } },
  { day: 7, reward: { type: 'mystery', amount: 1000 } },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const list = await base44.entities.PlayerProfile.filter({});
    const profile = list?.[0];
    if (!profile) return Response.json({ error: 'No profile' }, { status: 404 });

    const today = new Date().toISOString().slice(0, 10);
    if (profile.streakLastDate === today) {
      return Response.json({ error: 'Already claimed today', alreadyClaimed: true }, { status: 409 });
    }

    // Preserve the game's existing logic: streak advances by one each claim and
    // cycles on the 7-day reward table (no gap reset on the client either).
    const streak = (profile.streakCount || 0) + 1;
    const day = Math.min(streak, 7);
    const reward = DAILY_REWARDS[day - 1]?.reward || DAILY_REWARDS[0].reward;

    const update: any = { streakCount: streak, streakLastDate: today };
    if (reward.type === 'coins') update.coins = (profile.coins || 0) + reward.amount;
    else if (reward.type === 'gems') update.gems = (profile.gems || 0) + reward.amount;
    else if (reward.type === 'sauce') update.ownedSauces = [...(profile.ownedSauces || []), reward.sauceId];
    else if (reward.type === 'mystery') update.coins = (profile.coins || 0) + reward.amount;

    await base44.asServiceRole.entities.PlayerProfile.update(profile.id, update);

    return Response.json({ profile: { ...profile, ...update }, reward, streak, day });
  } catch (error) {
    console.error('claim-daily-reward error:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});