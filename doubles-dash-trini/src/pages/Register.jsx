import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, CheckCircle2, Circle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import AppleIcon from "@/components/AppleIcon";
import { toast } from "@/components/ui/use-toast";
import { resetActivityStamp } from "@/lib/AuthContext";
import AgreementModal from "@/components/AgreementModal";
import { TERMS_CONTENT, PRIVACY_CONTENT } from "@/lib/legalContent";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const canRegister = acceptedTerms && acceptedPrivacy;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    resetActivityStamp();
    try {
      // Confirms the just-created signup. verifyOtp establishes the session
      // directly — no separate setToken step.
      await base44.auth.verifyOtp({ email, otpCode, type: 'signup' });
      window.location.href = "/home";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
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

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Verify your email"
        subtitle={`We sent a code to ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
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
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
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
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Log in
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
        {!window.NativeIAP?.available && (
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
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !canRegister}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : canRegister ? (
            "Create account"
          ) : (
            "Acknowledge the agreements to continue"
          )}
        </Button>
      </form>

      <div className="mt-5 space-y-2">
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="flex items-center gap-2 w-full text-left text-xs text-zinc-200 hover:text-tropic-gold transition"
        >
          {acceptedTerms ? (
            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
          ) : (
            <Circle size={16} className="text-white/30 shrink-0" />
          )}
          <span>
            {acceptedTerms ? "Acknowledged: " : "Read & acknowledge: "}
            <span className="font-bold underline">Terms of Service</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowPrivacy(true)}
          className="flex items-center gap-2 w-full text-left text-xs text-zinc-200 hover:text-tropic-gold transition"
        >
          {acceptedPrivacy ? (
            <CheckCircle2 size={16} className="text-green-400 shrink-0" />
          ) : (
            <Circle size={16} className="text-white/30 shrink-0" />
          )}
          <span>
            {acceptedPrivacy ? "Acknowledged: " : "Read & acknowledge: "}
            <span className="font-bold underline">Privacy Policy</span>
          </span>
        </button>
      </div>

      <AgreementModal
        open={showTerms}
        onOpenChange={setShowTerms}
        title="Terms of Service"
        content={TERMS_CONTENT}
        onAcknowledge={() => setAcceptedTerms(true)}
      />
      <AgreementModal
        open={showPrivacy}
        onOpenChange={setShowPrivacy}
        title="Privacy Policy"
        content={PRIVACY_CONTENT}
        onAcknowledge={() => setAcceptedPrivacy(true)}
      />
    </AuthLayout>
  );
}