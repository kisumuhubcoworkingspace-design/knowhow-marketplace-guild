import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Clock3, Download, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatGuidePrice, sampleGuides, type GuideListing } from "@/lib/marketplace-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/guide/$slug")({
  loader: async ({ params }) => {
    const sample = sampleGuides.find((guide) => guide.slug === params.slug);
    const { data: guide, error } = await supabase
      .from("guides")
      .select("id, slug, title, summary, description, category, format, reading_time_minutes, price_cents, currency_code, creator_id, created_at")
      .eq("slug", params.slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) throw error;
    if (!guide) {
      if (sample) return sample;
      throw notFound();
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, bio")
      .eq("id", guide.creator_id)
      .maybeSingle();

    return {
      ...guide,
      creator_name: profile?.display_name ?? "Independent creator",
      creator_bio: profile?.bio ?? "",
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData.title} | The Knowhow Exchange` },
      { name: "description", content: loaderData.summary },
      { property: "og:title", content: `${loaderData.title} | The Knowhow Exchange` },
      { property: "og:description", content: loaderData.summary },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => <main className="market-message"><h1>This guide isn’t available right now</h1><p>{error instanceof Error ? error.message : String(error)}</p><Button asChild variant="outline"><Link to="/">Back to explore</Link></Button></main>,
  notFoundComponent: () => <main className="market-message"><h1>We couldn’t find that guide</h1><Button asChild variant="outline"><Link to="/">Back to explore</Link></Button></main>,
  component: GuideDetailPage,
});

function GuideDetailPage() {
  const guide = Route.useLoaderData() as GuideListing & {
    creator_bio?: string;
  };

  return (
    <main className="guide-detail-page">
      <div className="detail-breadcrumb"><Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft aria-hidden="true" /> Explore guides</Link></Button></div>
      <section className="guide-detail-layout">
        <article className="guide-detail-copy">
          <div className="guide-detail-art" aria-hidden="true"><BookOpen /><span>{guide.category}</span></div>
          <div className="guide-detail-meta"><span>{guide.category}</span><span>{guide.format}</span></div>
          <h1>{guide.title}</h1>
          <p className="guide-detail-summary">{guide.summary}</p>
          <div className="guide-detail-byline"><span className="creator-avatar">{guide.creator_name.slice(0, 1)}</span><span>By <strong>{guide.creator_name}</strong></span></div>
          {guide.creator_bio && <p className="creator-bio">{guide.creator_bio}</p>}
          <div className="guide-description"><h2>What you’ll learn</h2><p>{guide.description}</p></div>
        </article>
        <aside className="guide-purchase-panel" aria-label="Guide access">
          <p className="eyebrow">A practical resource</p>
          <div className="guide-purchase-facts">
            <span><BookOpen aria-hidden="true" /> {guide.format}</span>
            {guide.reading_time_minutes && <span><Clock3 aria-hidden="true" /> {guide.reading_time_minutes} min read</span>}
          </div>
          <p className="guide-detail-price">{guide.price_cents === 0 ? "Free" : formatGuidePrice(guide.price_cents, guide.currency_code)}</p>
          <Button className="purchase-unavailable" disabled><LockKeyhole aria-hidden="true" /> Purchases not available yet</Button>
          <p className="purchase-note"><Download aria-hidden="true" /> Checkout and secure downloads are being prepared. No payment will be taken.</p>
          {guide.sample && <p className="sample-note">Example listing</p>}
        </aside>
      </section>
      <section className="detail-afterword"><h2>More useful knowledge</h2><p>Browse guides from independent creators across practical topics.</p><Button asChild variant="outline"><Link to="/">Explore all guides</Link></Button></section>
    </main>
  );
}