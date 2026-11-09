import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, BookOpen, Check, FileText, LoaderCircle, LockKeyhole, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarketplaceAuthDialog } from "@/components/marketplace-auth-dialog";
import { useMarketplaceAuth } from "@/hooks/use-marketplace-auth";
import { formatGuidePrice, marketplaceCategories, marketplaceFormats, slugifyGuideTitle } from "@/lib/marketplace-data";
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
  const [category, setCategory] = useState("Farming & food");
  const [format, setFormat] = useState("Guide");
  const [editingGuide, setEditingGuide] = useState<CreatorGuide | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!ready || !user) return;
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
        setProfileName(profileResult.data?.display_name ?? currentUser.user_metadata["full_name"] ?? "");
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

  return (
    <main className="creator-studio">
      <section className="creator-studio-heading"><p className="eyebrow">Creator studio</p><h1>Your know-how, ready to share.</h1><p>Describe what you’ve learned, save a private draft, and prepare a useful resource for Doerly.</p></section>
      <div className="creator-studio-layout">
        <div className="creator-studio-main">
          <section className="studio-section">
            <div className="studio-section-heading"><div><span className="studio-step">01</span><div><h2>Your creator profile</h2><p>Help readers understand who’s behind the guide.</p></div></div></div>
            <form className="studio-form profile-form" onSubmit={(event) => void saveProfile(event)}>
              <label className="studio-field">Display name<Input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength={80} required /></label>
              <label className="studio-field">Your experience<Textarea value={profileBio} onChange={(event) => setProfileBio(event.target.value)} maxLength={700} rows={4} placeholder="Describe your field, practical experience, and the work you’ve done. Credentials are not independently verified." /><span className="field-hint">Explain relevant first-hand experience. Doerly does not label self-described experience as verified credentials.</span></label>
              <Button type="submit" variant="outline" disabled={loading}>{loading ? <LoaderCircle className="animate-spin" /> : <Check />} Save profile</Button>
            </form>
          </section>

          <section className="studio-section">
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
          </section>
          {feedback && <p className="studio-feedback" role="status">{feedback}</p>}
        </div>

        <aside className="creator-studio-aside">
          <section className="studio-section your-guides"><div className="studio-section-heading compact"><div><span className="studio-step"><BookOpen aria-hidden="true" /></span><div><h2>Your resources</h2><p>{loaded ? `${guides.length} total` : "Loading your work…"}</p></div></div></div>
            {guides.length ? <ul className="creator-guide-list">{guides.map((guide) => <li key={guide.id}><div className="creator-guide-row"><div><span className={`status-dot status-${guide.status}`} />{guide.status === "published" ? "Published" : "Private draft"}</div><span>{guide.category}</span></div><h3>{guide.title}</h3><p>{guide.format} · {guide.price_cents === 0 ? "Free" : formatGuidePrice(guide.price_cents, guide.currency_code)}</p><div className="creator-guide-actions">{guide.status === "draft" && <Button variant="outline" size="sm" onClick={() => editDraft(guide)}>Edit draft</Button>}{guide.status === "published" && <Button asChild variant="outline" size="sm"><Link to="/guide/$slug" params={{ slug: guide.slug }}>View listing <ArrowUpRight /></Link></Button>}{guide.status === "published" && <Button variant="ghost" size="sm" onClick={() => void unpublishGuide(guide)}>Unpublish</Button>}</div></li>)}</ul> : <div className="studio-empty"><FileText aria-hidden="true" /><p>{loaded ? "Your first resource will appear here." : "Loading your resources…"}</p></div>}
          </section>
          <div className="creator-payout-note"><LockKeyhole aria-hidden="true" /><div><strong>Payments are not connected yet</strong><p>Listings can be prepared, but checkout and creator payouts are not active.</p></div></div>
        </aside>
      </div>
      <footer className="market-footer"><span>© 2026 Doerly</span><span>Learn it from someone who’s done it.</span></footer>
    </main>
  );
}