import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, Check, FileText, LoaderCircle, LockKeyhole, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketplaceAuthDialog } from "@/components/marketplace-auth-dialog";
import { useMarketplaceAuth } from "@/hooks/use-marketplace-auth";
import { formatGuidePrice, marketplaceCategories, slugifyGuideTitle } from "@/lib/marketplace-data";
import { supabase } from "@/integrations/supabase/client";

type CreatorGuide = {
  id: string;
  slug: string;
  title: string;
  category: string;
  format: string;
  price_cents: number;
  currency_code: string;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/creator")({
  head: () => ({
    meta: [
      { title: "Creator Studio | The Knowhow Exchange" },
      { name: "description", content: "Create, manage, and publish practical guides on The Knowhow Exchange." },
      { property: "og:title", content: "Creator Studio | The Knowhow Exchange" },
      { property: "og:description", content: "Create, manage, and publish practical guides on The Knowhow Exchange." },
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
  const [category, setCategory] = useState("Farming & food");
  const [format, setFormat] = useState("Guide");
  const [publicationStatus, setPublicationStatus] = useState<"draft" | "published">("draft");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!ready || !user) return;
    let active = true;
    async function loadStudio() {
      const [profileResult, guideResult] = await Promise.all([
        supabase.from("profiles").select("display_name, bio").eq("id", user.id).maybeSingle(),
        supabase.from("guides").select("id, slug, title, category, format, price_cents, currency_code, status, created_at").eq("creator_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      if (profileResult.error || guideResult.error) {
        setFeedback(profileResult.error?.message ?? guideResult.error?.message ?? "Your creator space could not be loaded.");
      } else {
        setProfileName(profileResult.data?.display_name ?? user.user_metadata.full_name ?? "");
        setProfileBio(profileResult.data?.bio ?? "");
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
    setLoading(true);
    setFeedback("");
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: profileName.trim(),
      bio: profileBio.trim(),
    }).select("id").single();
    setFeedback(error ? error.message : "Your creator profile is saved.");
    setLoading(false);
  }

  async function createGuide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const summary = String(form.get("summary") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const priceCents = Math.round(Number(form.get("price")) * 100);
    if (!selectedFile) {
      setFeedback("Choose a PDF, DOCX, or EPUB file for your guide.");
      return;
    }
    if (!Number.isFinite(priceCents) || priceCents < 0) {
      setFeedback("Enter a valid price of zero or more.");
      return;
    }
    setLoading(true);
    setFeedback("");
    const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const filePath = `${user.id}/${crypto.randomUUID()}-${safeFileName}`;
    const { error: uploadError } = await supabase.storage.from("creator-guides").upload(filePath, selectedFile, {
      upsert: false,
      contentType: selectedFile.type || undefined,
    });
    if (uploadError) {
      setFeedback(`We couldn’t upload this file: ${uploadError.message}`);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.from("guides").insert({
      creator_id: user.id,
      slug: `${slugifyGuideTitle(title)}-${crypto.randomUUID().slice(0, 8)}`,
      title,
      summary,
      description,
      category,
      format,
      price_cents: priceCents,
      currency_code: "USD",
      file_path: filePath,
      status: publicationStatus,
    }).select("id, slug, title, category, format, price_cents, currency_code, status, created_at").single();
    if (error) {
      await supabase.storage.from("creator-guides").remove([filePath]);
      setFeedback(`We couldn’t save this guide: ${error.message}`);
    } else if (data) {
      setGuides((current) => [data, ...current]);
      setFeedback(publicationStatus === "published"
        ? "Your guide is published and discoverable. Checkout and creator payouts are not active yet."
        : "Your guide is saved as a draft.");
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

  return (
    <main className="creator-studio">
      <section className="creator-studio-heading"><p className="eyebrow">Creator studio</p><h1>Your know-how, ready to share.</h1><p>Write it down, keep a private draft, or publish it for the exchange.</p></section>
      <div className="creator-studio-layout">
        <div className="creator-studio-main">
          <section className="studio-section">
            <div className="studio-section-heading"><div><span className="studio-step">01</span><div><h2>Your creator profile</h2><p>Help readers understand who’s behind the guide.</p></div></div></div>
            <form className="studio-form profile-form" onSubmit={(event) => void saveProfile(event)}>
              <label className="studio-field">Display name<Input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={80} required /></label>
              <label className="studio-field">About you<Textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} maxLength={700} rows={4} placeholder="A few words about your experience and what you know well." /></label>
              <Button type="submit" variant="outline" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <Check />} Save profile</Button>
            </form>
          </section>

          <section className="studio-section">
            <div className="studio-section-heading"><div><span className="studio-step">02</span><div><h2>Create a guide</h2><p>Give readers the useful details before they open your file.</p></div></div></div>
            <form className="studio-form" onSubmit={(event) => void createGuide(event)}>
              <label className="studio-field">Guide title<Input name="title" required maxLength={120} placeholder="e.g. Healthy chicks: your first eight weeks" /></label>
              <label className="studio-field">Short description<Input name="summary" required maxLength={240} placeholder="What will someone be able to do after reading?" /></label>
              <label className="studio-field">Full description<Textarea name="description" required rows={6} maxLength={4000} placeholder="Describe what’s included, who it’s for, and the problem it helps solve." /></label>
              <div className="studio-field-grid">
                <label className="studio-field">Category<Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{marketplaceCategories.filter((item) => item !== "All knowledge").map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></label>
                <label className="studio-field">Format<Select value={format} onValueChange={setFormat}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Ebook", "Guide", "Playbook", "Checklist", "Template"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></label>
              </div>
              <label className="studio-field">Planned price (USD)<Input name="price" type="number" min="0" step="0.01" defaultValue="0" required /><span className="field-hint">Checkout and payouts are not active yet; no payment will be taken.</span></label>
              <label className="studio-field">Guide file<span className="file-drop"><UploadCloud aria-hidden="true" /><span>{selectedFile?.name ?? "Choose a PDF, DOCX, or EPUB file"}</span><Input key={fileInputKey} type="file" accept=".pdf,.docx,.epub,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/epub+zip" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} required /></span><span className="field-hint">Only you can access this file until secure buyer delivery is available.</span></label>
              <div className="publication-choice" role="group" aria-label="Guide visibility">
                <Button type="button" variant={publicationStatus === "draft" ? "default" : "outline"} aria-pressed={publicationStatus === "draft"} onClick={() => setPublicationStatus("draft")}>Save as draft</Button>
                <Button type="button" variant={publicationStatus === "published" ? "default" : "outline"} aria-pressed={publicationStatus === "published"} onClick={() => setPublicationStatus("published")}>Publish listing</Button>
              </div>
              {publicationStatus === "published" && <p className="field-hint publication-warning"><LockKeyhole aria-hidden="true" /> The listing will be visible, but purchases and downloads are not available yet.</p>}
              <Button type="submit" size="lg" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : publicationStatus === "published" ? <ArrowUpRight /> : <FileText />}{loading ? "Saving…" : publicationStatus === "published" ? "Publish guide" : "Save draft"}</Button>
            </form>
          </section>
          {feedback && <p className="studio-feedback" role="status">{feedback}</p>}
        </div>

        <aside className="creator-studio-aside">
          <section className="studio-section your-guides"><div className="studio-section-heading compact"><div><span className="studio-step"><BookOpen aria-hidden="true" /></span><div><h2>Your guides</h2><p>{loaded ? `${guides.length} total` : "Loading your work…"}</p></div></div></div>
            {guides.length ? <ul className="creator-guide-list">{guides.map((guide) => <li key={guide.id}><div className="creator-guide-row"><div><span className={`status-dot status-${guide.status}`} />{guide.status === "published" ? "Published" : "Draft"}</div><span>{guide.category}</span></div><h3>{guide.title}</h3><p>{guide.format} · {guide.price_cents === 0 ? "Free" : formatGuidePrice(guide.price_cents, guide.currency_code)}</p><div className="creator-guide-actions">{guide.status === "published" && <Button asChild variant="outline" size="sm"><Link to="/guide/$slug" params={{ slug: guide.slug }}>View listing <ArrowUpRight /></Link></Button>}{guide.status === "published" && <Button variant="ghost" size="sm" onClick={() => void unpublishGuide(guide)}>Unpublish</Button>}</div></li>)}</ul> : <div className="studio-empty"><FileText aria-hidden="true" /><p>{loaded ? "Your first guide will appear here." : "Loading your guides…"}</p></div>}
          </section>
          <div className="creator-payout-note"><LockKeyhole aria-hidden="true" /><div><strong>Payments are not connected yet</strong><p>Listings can be prepared, but checkout and creator payouts are not active.</p></div></div>
        </aside>
      </div>
      <footer className="market-footer"><span>© 2026 The Knowhow Exchange</span><span>Useful knowledge, shared with care.</span></footer>
    </main>
  );
}