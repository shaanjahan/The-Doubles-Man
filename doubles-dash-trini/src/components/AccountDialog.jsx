// Account management drawer (the in-app "Settings"): Sign Out + a compliant
// Delete Account flow (type-DELETE confirmation, server-side deletion, link to
// the public deletion page, and a completion screen). Dark tropical theme.
import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, LogOut, Trash2, ShieldAlert, Shield, FileText, LifeBuoy, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

export default function AccountDialog() {
  const [open, setOpen] = React.useState(false);
  const [stage, setStage] = React.useState('menu'); // 'menu' | 'confirm' | 'done'
  const [busy, setBusy] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState('');
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setStage('menu');
      setBusy(false);
      setConfirmText('');
      setErr('');
    }
  }, [open]);

  function handleSignOut() {
    base44.auth.logout('/');
  }

  async function handleDelete() {
    setErr('');
    setBusy(true);
    try {
      await base44.functions.invoke('delete-account', {});
      setStage('done');
      // Let the user see the confirmation before the session clears.
      setTimeout(() => base44.auth.logout('/'), 1600);
    } catch (e) {
      setBusy(false);
      // base44.functions.invoke rejects (axios) on any non-2xx, so the real
      // server body — { ok:false, error, counts, warnings } — is on
      // e.response.data, not e.message. Fall back to e.message only if no
      // server body is present (e.g. a network failure).
      const d = e?.response?.data;
      const serverMsg = d?.error || (d && typeof d === 'object' ? JSON.stringify(d) : undefined);
      setErr(serverMsg || e?.message || 'Could not delete account. Please try again or email us.');
    }
  }

  const canDelete = confirmText.trim() === 'DELETE';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Account settings"
          className="flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-tropic-gold transition active:scale-90 border border-white/10"
        >
          <Settings size={18} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm w-[calc(100vw-1.5rem)] p-0 gap-0 rounded-3xl overflow-hidden border-white/10 bg-zinc-900">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-zinc-100">Account</DialogTitle>
        </DialogHeader>

        {stage === 'menu' && (
          <div className="p-4 space-y-2.5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-1 mb-1">
              <Link to="/privacy" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-white/10 transition">
                <Shield size={16} className="text-tropic-gold" /> Privacy Policy
              </Link>
              <Link to="/terms" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-white/10 transition">
                <FileText size={16} className="text-tropic-gold" /> Terms of Service
              </Link>
              <Link to="/support" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-white/10 transition">
                <LifeBuoy size={16} className="text-tropic-gold" /> Support
              </Link>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left bg-white/5 hover:bg-white/10 text-zinc-100 font-bold transition border border-white/10"
            >
              <LogOut size={18} className="text-zinc-300" />
              <span>Sign Out</span>
            </button>
            <button
              onClick={() => setStage('confirm')}
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left bg-red-500/15 hover:bg-red-500/25 text-red-300 font-bold transition border border-red-500/30"
            >
              <Trash2 size={18} />
              <span>Delete Account</span>
            </button>
            <p className="text-[10px] text-zinc-500 px-2 pt-1">
              Deleting your account permanently removes your vendor progress and data.
            </p>
          </div>
        )}

        {stage === 'confirm' && (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-extrabold">
              <ShieldAlert size={20} /> Confirm account deletion
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              This permanently removes your progress, coins, gems, and Magic Sauce, and all purchased
              items including the VIP Vendor Pass. This cannot be undone, and purchases are not
              refundable and cannot be restored to a new account.
            </p>
            <Link to="/delete-account" className="inline-flex items-center gap-1 text-xs text-tropic-gold underline">
              Read the full details
            </Link>
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-zinc-300">
                Type <span className="text-red-400">DELETE</span> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
                placeholder="DELETE"
                className="h-11 bg-white/5 border-white/15 text-zinc-100"
              />
            </div>
            {err && <p className="text-xs text-red-400 font-bold">{err}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setStage('menu')}
                disabled={busy}
                className="flex-1 rounded-xl px-4 py-3 font-bold bg-white/10 hover:bg-white/20 text-zinc-200 transition border border-white/10 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={busy || !canDelete}
                className="flex-1 rounded-xl px-4 py-3 font-bold bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
              >
                {busy ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 size={40} className="mx-auto text-green-400" />
            <div className="font-extrabold text-zinc-100 text-lg">Account deleted</div>
            <p className="text-sm text-zinc-400">Your account data has been removed. Signing you out…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}