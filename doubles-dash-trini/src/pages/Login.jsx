import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { isEmbeddedIOSWebView } from "@/lib/platform";
import AppleIcon from "@/components/AppleIcon";
import { toast } from "@/components/ui/use-toast";
import { resetActivityStamp, useAuth } from "@/lib/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If a session lands while we're on /login — e.g. the Apple/Google OAuth code
  // finishes exchanging just after the redirect bounced us here — go straight to
  // the game instead of making the user tap "Sign in with Apple" again.
  useEffect(() => {
    if (isAuthenticated) navigate("/home", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    resetActivityStamp();
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/home";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    resetActivityStamp();
    base44.auth.loginWithProvider("google", "/home");
  };

  const handleApple = () => {
    resetActivityStamp();
    // Native SIWA path can reject (e.g. dismissed Face ID sheet = 'cancelled',
    // which stays silent); surface anything else.
    Promise.resolve(base44.auth.loginWithProvider("apple", "/home")).catch((e) => {
      const msg = e?.message || "";
      if (!/cancel/i.test(msg)) setError(msg || "Apple sign-in failed");
    });
  };

  // For accounts that registered but never verified their email — password
  // login sets a token the backend rejects as unverified, causing a login
  // loop. This opens a fresh OTP verification path straight from the login
  // screen so the account can be completed and signed in directly.
  const startVerify = async () => {
    setError("");
    if (!email) {
      setError("Enter your email first, then verify.");
      return;
    }
    setShowOtp(true);
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "Code sent", description: "Check your email for the code." });
    } catch (err) {
      setError(err.message || "Failed to send code");
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    resetActivityStamp();
    try {
      // This OTP path completes an unverified SIGNUP (see startVerify above), so
      // verify with type 'signup'. verifyOtp establishes the session directly —
      // no separate setToken step.
      await base44.auth.verifyOtp({ email, otpCode, type: 'signup' });
      window.location.href = "/home";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
        footer={
          <button type="button" onClick={() => { setShowOtp(false); setOtpCode(""); setError(""); }} className="text-primary font-medium hover:underline">
            Back to login
          </button>
        }
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button type="button" onClick={() => base44.auth.resendOtp(email).then(() => toast({ title: "Code sent" })).catch((e) => setError(e.message || "Failed to send code"))} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <div className="space-y-2 mb-6">
        <Button
          className="w-full h-12 text-sm font-medium bg-black hover:bg-black/90 text-white"
          onClick={handleApple}
        >
          <AppleIcon className="w-5 h-5 mr-2" />
          Continue with Apple
        </Button>
        {!window.NativeIAP?.available && !isEmbeddedIOSWebView && (
          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium"
            onClick={handleGoogle}
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground mt-4">
        Account not verified yet?{" "}
        <button type="button" onClick={startVerify} className="text-primary font-medium hover:underline">
          Verify your email
        </button>
      </p>
      <p className="text-center text-[11px] text-zinc-300 mt-5">
        By continuing, you agree to our{" "}
        <Link to="/terms" className="text-tropic-gold underline">Terms of Service</Link>{" "}
        and{" "}
        <Link to="/privacy" className="text-tropic-gold underline">Privacy Policy</Link>.
      </p>
    </AuthLayout>
  );
}