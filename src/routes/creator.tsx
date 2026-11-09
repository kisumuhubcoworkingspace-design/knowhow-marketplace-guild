import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, Check, FileText, LoaderCircle, LockKeyhole, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketplaceAuthDialog } from "@/components/marketplace-auth-dialog";
import { useMarketplaceAuth } from "@/hooks/use-marketplace-auth";
import {
  formatGuidePrice,
  marketplaceCategories,
  marketplaceFormats,
  parseCreatorProfile,
  serializeCreatorProfile,
  slugifyGuideTitle,
} from "@/lib/marketplace-data";
import { supabase } from "@/integrations/supabase/client";

type CreatorGuide = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  format: string;
  price_cents: number;
  currency_code: string;
  file_path: string | null;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/creator")({
  head: () => ({
    meta: [
      { title: "Creator studio | Doerly" },
      { name: "description", content: "Create and manage practical resources on Doerly." },
      { property: "og:title", content: "Creator studio | Doerly" },
      { property: "og:description", content: "Create and manage practical resources on Doerly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreatorStudioPage,
});

function CreatorStudioPage() {
  const { user, ready } = useMarketplaceAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [guides, setGuides] = useState<CreatorGuide[]>([]);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileExpertise, setProfileExpertise] = useState<string[]>([]);
  const [profileExperience, setProfileExperience] = useState("");
  const [rightsAcknowledged, setRightsAcknowledged] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState("");
  const [category, setCategory] = useState("Farming & food");
  const [format, setFormat] = useState("Guide");
  const [editingGuide, setEditingGuide] = useState<CreatorGuide | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!ready || !user || !user.email_confirmed_at) return;
    setLoaded(false);
    setOnboardingComplete(false);
    setGuides([]);
    const currentUser = user;
    let active = true;
    async function loadStudio() {
      const [profileResult, guideResult] = await Promise.all([
        supabase.from("profiles").select("display_name, bio").eq("id", currentUser.id).maybeSingle(),
        supabase.from("guides").select("id, slug, title, summary, description, category, format, price_cents, currency_code, file_path, status, created_at").eq("creator_id", currentUser.id).order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      if (profileResult.error || guideResult.error) {
        setFeedback(profileResult.error?.message ?? guideResult.error?.message ?? "Your creator space could not be loaded.");
      } else {
        const profile = parseCreatorProfile(profileResult.data?.bio ?? "");
        const displayName = profileResult.data?.display_name ?? currentUser.user_metadata["full_name"] ?? "";
        setProfileName(displayName === "New member" ? "" : displayName);
        setProfileBio(profile.about);
        setProfileExpertise(profile.expertise);
        setProfileExperience(profile.experience);
        setOnboardingComplete(Boolean(
          displayName.trim()
          && displayName !== "New member"
          && profile.expertise.length
          && profile.experience
          && profile.about
          && currentUser.user_metadata["doerly_creator_rights_acknowledged_at"],
        ));
        setGuides(guideResult.data ?? []);
      }
      setLoaded(true);
    }
    void loadStudio();
    return () => { active = false; };
  }, [ready, user]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    if (!profileExpertise.length) {
      setFeedback("Choose at least one area of expertise.");
      return;
    }
    if (!onboardingComplete && !rightsAcknowledged) {
      setFeedback("Confirm that you have the right to share your materials.");
      return;
    }
    setLoading(true);
    setFeedback("");
    const bio = serializeCreatorProfile({
      expertise: profileExpertise,
      experience: profileExperience,
      about: profileBio,
    });
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: profileName.trim(),
      bio,
    }).select("id").single();
    if (error) {
      setFeedback(error.message);
      setLoading(false);
      return;
    }
    if (!onboardingComplete) {
      const { error: acknowledgmentError } = await supabase.auth.updateUser({
        data: { doerly_creator_rights_acknowledged_at: new Date().toISOString() },
      });
      if (acknowledgmentError) {
        setFeedback(`Your profile was saved, but the acknowledgment could not be saved: ${acknowledgmentError.message}`);
        setLoading(false);
        return;
      }
      setRightsAcknowledged(false);
      setOnboardingComplete(true);
      setFeedback("Your creator profile is complete. Your resources and files will remain private drafts.");
    } else {
      setFeedback("Your creator profile is saved.");
    }
    setLoading(false);
  }

  async function resendVerification() {
    if (!user?.email) return;
    setVerificationBusy(true);
    setVerificationFeedback("");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: window.location.href },
    });
    setVerificationFeedback(error
      ? error.message
      : "A verification link has been sent. Check your inbox and spam folder.");
    setVerificationBusy(false);
  }

  function toggleExpertise(item: string) {
    setProfileExpertise((current) => current.includes(item)
      ? current.filter((value) => value !== item)
      : [...current, item]);
  }

  async function createGuide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const summary = String(form.get("summary") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const priceCents = Math.round(Number(form.get("price")) * 100);
    if (!selectedFile && !editingGuide?.file_path) {
      setFeedback("Choose a PDF, DOCX, or EPUB file for your resource.");
      return;
    }
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setFeedback("Enter a valid price of zero or more.");
      return;
    }
    setLoading(true);
    setFeedback("");
    let uploadedPath: string | null = null;
    if (selectedFile) {
      const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
      uploadedPath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`;
      const { error: uploadError } = await supabase.storage.from("creator-guides").upload(uploadedPath, selectedFile, {
        upsert: false,
        contentType: selectedFile.type || undefined,
      });
      if (uploadError) {
        setFeedback(`We couldn’t upload this file: ${uploadError.message}`);
        setLoading(false);
        return;
      }
    }

    const values = {
      title,
      summary,
      description,
      category,
      format,
      price_cents: priceCents,
      currency_code: "USD",
      file_path: uploadedPath ?? editingGuide?.file_path ?? null,
      status: "draft",
    };
    const selection = "id, slug, title, summary, description, category, format, price_cents, currency_code, file_path, status, created_at";
    const result = editingGuide
      ? await supabase.from("guides").update(values).eq("id", editingGuide.id).eq("creator_id", user.id).eq("status", "draft")
        .select(selection).single()
      : await supabase.from("guides").insert({
        ...values,
        creator_id: user.id,
        slug: `${slugifyGuideTitle(title)}-${crypto.randomUUID().slice(0, 8)}`,
      }).select(selection).single();
    const { data, error } = result;
    if (error) {
      if (uploadedPath) await supabase.storage.from("creator-guides").remove([uploadedPath]);
      setFeedback(`We couldn’t save this resource: ${error.message}`);
    } else if (data) {
      if (uploadedPath && editingGuide?.file_path) {
        await supabase.storage.from("creator-guides").remove([editingGuide.file_path]);
      }
      setGuides((current) => editingGuide
        ? current.map((guide) => guide.id === data.id ? data : guide)
        : [data, ...current]);
      setFeedback("Your private draft is saved. Review and publishing controls are not enabled yet, so this resource is not public.");
      setEditingGuide(null);
      setCategory("Farming & food");
      setFormat("Guide");
      setSelectedFile(null);
      setFileInputKey((key) => key + 1);
      event.currentTarget.reset();
    }
    setLoading(false);
  }

  async function unpublishGuide(guide: CreatorGuide) {
    const { error } = await supabase.from("guides").update({ status: "draft" }).eq("id", guide.id);
    if (error) {
      setFeedback(`We couldn’t unpublish this guide: ${error.message}`);
      return;
    }
    setGuides((current) => current.map((item) => item.id === guide.id ? { ...item, status: "draft" } : item));
    setFeedback("Your guide is now saved as a draft.");
  }

  function editDraft(guide: CreatorGuide) {
    setEditingGuide(guide);
    setCategory(guide.category);
    setFormat(guide.format);
    setSelectedFile(null);
    setFeedback("");
  }

  function cancelEditing() {
    setEditingGuide(null);
    setCategory("Farming & food");
    setFormat("Guide");
    setSelectedFile(null);
    setFileInputKey((key) => key + 1);
  }

  if (!ready) return <main className="market-message"><LoaderCircle className="animate-spin" aria-label="Loading account" /></main>;
  if (!user) {
    return (
      <main className="creator-gate">
        <div className="creator-gate-copy"><p className="eyebrow">Creator studio</p><h1>Make your experience useful to someone else.</h1><p>Build a clear guide, playbook, or toolkit and share it with people looking for practical answers.</p><Button onClick={() => setAuthOpen(true)}>Sign in to continue</Button></div>
        <div className="creator-gate-note"><LockKeyhole aria-hidden="true" /><p>Your drafts and uploaded files are private to your account.</p></div>
        <MarketplaceAuthDialog open={authOpen} onOpenChange={setAuthOpen} initialMode="signup" />
      </main>
    );
  }
  if (!user.email_confirmed_at) {
    return (
      <main className="creator-gate">
        <div className="creator-gate-copy">
          <p className="eyebrow">Verify your email</p>
          <h1>Confirm your email to continue.</h1>
          <p>Creator onboarding and private drafts are available after you verify the email address on your account.</p>
          <Button onClick={() => void resendVerification()} disabled={verificationBusy}>
            {verificationBusy ? <LoaderCircle className="animate-spin" /> : <Check />}
            Resend verification link
          </Button>
          {verificationFeedback && <p className="auth-feedback" role="status">{verificationFeedback}</p>}
        </div>
        <div className="creator-gate-note"><LockKeyhole aria-hidden="true" /><p>Your creator area remains private until email verification is complete.</p></div>
      </main>
    );
  }
  if (!loaded) {
    return <main className="market-message"><LoaderCircle className="animate-spin" aria-label="Loading creator profile" /></main>;
  }

  return (
    <main className="creator-studio">
      <section className="creator-studio-heading">
        <p className="eyebrow">{onboardingComplete ? "Creator studio" : "Creator onboarding"}</p>
        <h1>{onboardingComplete ? "Your know-how, ready to share." : "Set up your creator profile."}</h1>
        <p>{onboardingComplete
          ? "Describe what you’ve learned, save a private draft, and prepare a useful resource for Doerly."
          : "Tell buyers what you know and what practical work you’ve done. This information is saved to your public creator profile."}</p>
      </section>
      <div className={`creator-studio-layout ${onboardingComplete ? "" : "is-onboarding"}`}>
        <div className="creator-studio-main">
          <section className="studio-section">
            <div className="studio-section-heading"><div><span className="studio-step">01</span><div><h2>{onboardingComplete ? "Your creator profile" : "Your public profile"}</h2><p>Self-described experience helps buyers judge whether your know-how fits their situation.</p></div></div></div>
            <form className="studio-form profile-form" onSubmit={(event) => void saveProfile(event)}>
              <label className="studio-field">Display name<Input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={80} required /></label>
              <div className="studio-field" role="group" aria-label="Areas of expertise">
                <span>Areas of expertise</span>
                <div className="expertise-options">
                  {marketplaceCategories.filter((item) => item !== "All knowledge").map((item) => (
                    <Button key={item} type="button" size="sm" variant={profileExpertise.includes(item) ? "default" : "outline"} aria-pressed={profileExpertise.includes(item)} onClick={() => toggleExpertise(item)}>
                      {item}
                    </Button>
                  ))}
                </div>
                <span className="field-hint">Select every field relevant to your practical experience.</span>
              </div>
              <label className="studio-field">Practical experience<Textarea value={profileExperience} onChange={(event) => setProfileExperience(event.target.value)} maxLength={500} rows={3} placeholder="What have you done in these fields? Include useful context such as years or types of work." required /></label>
              <label className="studio-field">About you<Textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} maxLength={500} rows={3} placeholder="A short introduction for people considering your resources." required /><span className="field-hint">Your background is self-described, not independently verified by Doerly.</span></label>
              {!onboardingComplete && (
                <label className="creator-consent">
                  <input type="checkbox" checked={rightsAcknowledged} onChange={(event) => setRightsAcknowledged(event.target.checked)} required />
                  <span>I have the right to share materials I submit, and I will describe my resources and experience accurately.</span>
                </label>
              )}
              <Button type="submit" variant="outline" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <Check />}{onboardingComplete ? "Save profile" : "Complete creator profile"}</Button>
            </form>
          </section>

          {onboardingComplete && <section className="studio-section">
            <div className="studio-section-heading"><div><span className="studio-step">02</span><div><h2>{editingGuide ? "Edit private draft" : "Create a resource"}</h2><p>Help buyers understand the problem, audience, contents, format, and limitations.</p></div></div></div>
            <form key={editingGuide?.id ?? "new-resource"} className="studio-form" onSubmit={(event) => void createGuide(event)}>
              <label className="studio-field">Resource title<Input name="title" required maxLength={120} defaultValue={editingGuide?.title ?? ""} placeholder="e.g. Healthy chicks: your first eight weeks" /></label>
              <label className="studio-field">Problem it helps solve<Input name="summary" required maxLength={240} defaultValue={editingGuide?.summary ?? ""} placeholder="What practical problem or task does it address?" /></label>
              <label className="studio-field">Audience, contents & limitations<Textarea name="description" required rows={7} maxLength={4000} defaultValue={editingGuide?.description ?? ""} placeholder={"Who it’s for:\nWhat’s included:\nPrerequisites or limitations:\nHow to use this resource:"} /></label>
              <div className="studio-field-grid">
                <label className="studio-field">Category<Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{marketplaceCategories.filter((item) => item !== "All knowledge").map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></label>
                <label className="studio-field">Format<Select value={format} onValueChange={setFormat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{marketplaceFormats.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></label>
              </div>
              <label className="studio-field">Planned price (USD)<Input name="price" type="number" min="0" step="0.01" defaultValue={editingGuide ? (editingGuide.price_cents / 100).toFixed(2) : "0"} required /><span className="field-hint">Checkout is disabled; this amount is saved as a draft only. No payment will be taken.</span></label>
              <label className="studio-field">Resource file<span className="file-drop"><UploadCloud aria-hidden="true" /><span>{selectedFile?.name ?? (editingGuide?.file_path ? "Choose a replacement file (optional)" : "Choose a PDF, DOCX, or EPUB file")}</span><Input key={fileInputKey} type="file" accept=".pdf,.docx,.epub,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} required={!editingGuide?.file_path} /></span><span className="field-hint">Files stay private to your account. Buyer delivery is not enabled.</span></label>
              <p className="field-hint publication-warning"><LockKeyhole aria-hidden="true" /> Resources saved here stay private drafts. Review and publishing controls are not configured yet.</p>
              <div className="creator-form-actions">
                <Button type="submit" size="lg" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <FileText />}{loading ? "Saving…" : editingGuide ? "Save draft changes" : "Save private draft"}</Button>
                {editingGuide && <Button type="button" variant="outline" onClick={cancelEditing} disabled={loading}><X aria-hidden="true" /> Cancel edit</Button>}
              </div>
            </form>
          </section>}
          {feedback && <p className="studio-feedback" role="status">{feedback}</p>}
        </div>

        {onboardingComplete && <aside className="creator-studio-aside">
          <section className="studio-section your-guides"><div className="studio-section-heading compact"><div><span className="studio-step"><BookOpen aria-hidden="true" /></span><div><h2>Your resources</h2><p>{loaded ? `${guides.length} total` : "Loading your work…"}</p></div></div></div>
            {guides.length ? <ul className="creator-guide-list">{guides.map((guide) => <li key={guide.id}><div className="creator-guide-row"><div><span className={`status-dot status-${guide.status}`} />{guide.status === "published" ? "Published" : "Private draft"}</div><span>{guide.category}</span></div><h3>{guide.title}</h3><p>{guide.format} · {guide.price_cents === 0 ? "Free" : formatGuidePrice(guide.price_cents, guide.currency_code)}</p><div className="creator-guide-actions">{guide.status === "draft" && <Button variant="outline" size="sm" onClick={() => editDraft(guide)}>Edit draft</Button>}{guide.status === "published" && <Button asChild variant="outline" size="sm"><Link to="/guide/$slug" params={{ slug: guide.slug }}>View listing <ArrowUpRight /></Link></Button>}{guide.status === "published" && <Button variant="ghost" size="sm" onClick={() => void unpublishGuide(guide)}>Unpublish</Button>}</div></li>)}</ul> : <div className="studio-empty"><FileText aria-hidden="true" /><p>{loaded ? "Your first resource will appear here." : "Loading your resources…"}</p></div>}
          </section>
          <div className="creator-payout-note"><LockKeyhole aria-hidden="true" /><div><strong>Payments are not connected yet</strong><p>Listings can be prepared, but checkout and creator payouts are not active.</p></div></div>
        </aside>}
      </div>
      <footer className="market-footer"><span>© 2026 Doerly</span><span>Learn it from someone who’s done it.</span></footer>
    </main>
  );
}