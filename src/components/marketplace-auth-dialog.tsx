import { useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MarketplaceAuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: "signin" | "signup";
  onAuthenticated?: () => void;
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

export function MarketplaceAuthDialog({
  open,
  onOpenChange,
  initialMode = "signin",
  onAuthenticated,
}: MarketplaceAuthDialogProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  function switchMode(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setFeedback("");
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback("");
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: displayName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setFeedback("Check your email to confirm your account, then come back to sign in.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      onOpenChange(false);
      onAuthenticated?.();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "We couldn't complete that request. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSocialSignIn(provider: "google" | "lovable") {
    setBusy(true);
    setFeedback("");
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        onOpenChange(false);
        onAuthenticated?.();
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Sign-in is temporarily unavailable.");
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="auth-dialog">
        <DialogHeader className="auth-header">
          <span className="auth-mark"><LockKeyhole aria-hidden="true" /></span>
          <DialogTitle className="font-heading text-2xl">
            {mode === "signup" ? "Join the knowledge exchange" : "Welcome back"}
          </DialogTitle>
          <DialogDescription>
            {mode === "signup"
              ? "Save useful guides, learn from people who've done it, or share what you know."
              : "Sign in to your account to keep learning or manage your guides."}
          </DialogDescription>
        </DialogHeader>

        <div className="auth-provider-list">
          <Button
            variant="outline"
            className="auth-provider-google"
            type="button"
            disabled={busy}
            onClick={() => void handleSocialSignIn("google")}
          >
            <GoogleMark />
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="auth-provider-lovable"
            type="button"
            disabled={busy}
            onClick={() => void handleSocialSignIn("lovable")}
          >
            <span aria-hidden="true" className="lovable-mark">L</span>
            Continue with Lovable
          </Button>
        </div>

        <div className="auth-divider"><span>or use email</span></div>

        <form className="auth-form" onSubmit={(event) => void handlePasswordSubmit(event)}>
          {mode === "signup" && (
            <label className="field-label">
              Your name
              <span className="field-control">
                <UserRound aria-hidden="true" />
                <Input
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Name people will see"
                  required
                  maxLength={80}
                />
              </span>
            </label>
          )}
          <label className="field-label">
            Email
            <span className="field-control">
              <Mail aria-hidden="true" />
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </span>
          </label>
          <label className="field-label">
            Password
            <span className="field-control field-control-password">
              <LockKeyhole aria-hidden="true" />
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                required
                minLength={8}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="password-visibility"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </span>
          </label>
          {feedback && <p className="auth-feedback" role="status">{feedback}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
            {mode === "signup" ? "Create your account" : "Sign in"}
          </Button>
        </form>

        <p className="auth-switch">
          {mode === "signup" ? "Already have an account?" : "New to the exchange?"}{" "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 font-semibold"
            onClick={() => switchMode(mode === "signup" ? "signin" : "signup")}
          >
            {mode === "signup" ? "Sign in" : "Create an account"}
          </Button>
        </p>
      </DialogContent>
    </Dialog>
  );
}