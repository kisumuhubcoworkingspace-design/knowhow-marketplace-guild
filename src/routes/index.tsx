import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { marketplaceCategories, sampleGuides, formatGuidePrice, type GuideListing } from "@/lib/marketplace-data";
import poultryPhoto from "@/assets/poultry-knowledge.jpg";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  loader: async () => {
    const { data: guides } = await supabase
      .from("guides")
      .select("id, slug, title, summary, description, category, format, reading_time_minutes, price_cents, currency_code, creator_id, created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (!guides?.length) return [];
    const creatorIds = [...new Set(guides.map((guide) => guide.creator_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", creatorIds);
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
    return guides.map((guide) => ({
      ...guide,
      creator_name: names.get(guide.creator_id) ?? "Independent creator",
    }));
  },
  head: () => ({
    meta: [
      { title: "Practical Guides & Playbooks | The Knowhow Exchange" },
      { name: "description", content: "Find practical guides, ebooks, and playbooks created by people with first-hand experience." },
      { property: "og:title", content: "Practical Guides & Playbooks | The Knowhow Exchange" },
      { property: "og:description", content: "Find practical guides, ebooks, and playbooks created by people with first-hand experience." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => <main className="market-message"><h1>We couldn’t load the exchange</h1><p>{error instanceof Error ? error.message : String(error)}</p></main>,
  notFoundComponent: () => <main className="market-message"><h1>Nothing here yet</h1></main>,
  component: MarketplaceHome,
});

function MarketplaceHome() {
  const liveListings = Route.useLoaderData() as (GuideListing & { creator_name: string })[];
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All knowledge");
  const listings = useMemo(() => {
    const liveSlugs = new Set(liveListings.map((guide) => guide.slug));
    const source = [...liveListings, ...sampleGuides.filter((guide) => !liveSlugs.has(guide.slug))];
    const normalizedQuery = query.trim().toLowerCase();
    return source.filter((guide) => {
      const matchesCategory = category === "All knowledge" || guide.category === category;
      const matchesQuery = !normalizedQuery || [guide.title, guide.summary, guide.category, guide.creator_name]
        .some((value) => value.toLowerCase().includes(normalizedQuery));
      return matchesCategory && matchesQuery;
    });
  }, [category, liveListings, query]);

  return (
    <main>
      <section className="market-hero">
        <div className="market-hero-copy">
          <p className="eyebrow"><Sparkles aria-hidden="true" /> Field notes, made useful</p>
          <h1>Learn it from someone who’s <em>done it.</em></h1>
          <p className="market-hero-intro">Straightforward guides, playbooks, and tools from people who know the work first-hand.</p>
          <form className="market-search" onSubmit={(event) => event.preventDefault()} role="search">
            <Search aria-hidden="true" />
            <Input aria-label="Search guides" placeholder="What are you trying to figure out?" value={query} onChange={(event) => setQuery(event.target.value)} />
            <Button type="submit">Find a guide</Button>
          </form>
          <div className="market-proof"><span>Practical knowledge</span><span>Independent creators</span><span>Useful from day one</span></div>
        </div>
        <div className="market-hero-image-wrap">
          <img src={poultryPhoto} alt="A poultry farmer tending to a flock in a sunlit coop" className="market-hero-image" />
          <div className="market-photo-note"><span className="note-kicker">From the field</span><strong>Small details.<br />Better outcomes.</strong><span>Knowledge shared by people who do the work.</span></div>
          <span className="hero-image-index">01 / 06</span>
        </div>
      </section>

      <section className="market-catalog" aria-labelledby="catalog-title">
        <div className="catalog-heading">
          <div><p className="eyebrow">The exchange</p><h2 id="catalog-title">Find your next useful thing.</h2></div>
          <p>Specific answers from people who have already worked through the problem.</p>
        </div>
        <div className="catalog-toolbar">
          <div className="category-list" aria-label="Filter by category">
            {marketplaceCategories.map((item) => (
              <Button key={item} variant={category === item ? "default" : "outline"} size="sm" onClick={() => setCategory(item)} aria-pressed={category === item}>{item}</Button>
            ))}
          </div>
          <span className="result-count"><SlidersHorizontal aria-hidden="true" /> {listings.length} guides</span>
        </div>
        {listings.length > 0 ? (
          <div className="guide-grid">
            {listings.map((guide, index) => <GuideCard key={guide.id} guide={guide} index={index} />)}
          </div>
        ) : (
          <div className="empty-catalog"><h3>No guides match that search yet.</h3><p>Try another topic or browse all knowledge.</p><Button variant="outline" onClick={() => { setQuery(""); setCategory("All knowledge"); }}>Clear filters</Button></div>
        )}
      </section>

      <section className="creator-band">
        <div className="creator-band-mark"><BookStackIcon /></div>
        <div><p className="eyebrow">For the people who know</p><h2>Your experience can help someone else.</h2><p>Turn what you’ve learned into a clear guide, playbook, or toolkit.</p></div>
        <Button asChild variant="secondary"><Link to="/creator">Start creating <ArrowRight aria-hidden="true" /></Link></Button>
      </section>
      <footer className="market-footer"><span>© 2026 The Knowhow Exchange</span><span>Useful knowledge, shared with care.</span></footer>
    </main>
  );
}

function GuideCard({ guide, index }: { guide: GuideListing; index: number }) {
  const accents = ["guide-accent-sea", "guide-accent-leaf", "guide-accent-coral", "guide-accent-sky"];
  return (
    <article className="guide-card">
      <div className={`guide-card-art ${accents[index % accents.length]}`} aria-hidden="true">
        <span>{String(index + 1).padStart(2, "0")}</span><span className="guide-art-shape">{guide.category.slice(0, 1)}</span>
        {guide.sample && <span className="sample-tag">Sample listing</span>}
      </div>
      <div className="guide-card-body">
        <div className="guide-meta"><span>{guide.category}</span><span>{guide.format}</span></div>
        <h3><Link to="/guide/$slug" params={{ slug: guide.slug }}>{guide.title}</Link></h3>
        <p className="guide-summary">{guide.summary}</p>
        <div className="guide-card-bottom"><span className="creator-byline">By {guide.creator_name}</span><span className="guide-price">{guide.price_cents === 0 ? "Free" : formatGuidePrice(guide.price_cents, guide.currency_code)}</span></div>
      </div>
    </article>
  );
}

function BookStackIcon() {
  return <span aria-hidden="true" className="book-stack-icon"><span /><span /><span /></span>;
}