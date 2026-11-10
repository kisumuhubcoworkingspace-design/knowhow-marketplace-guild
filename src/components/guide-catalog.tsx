import { useMemo, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatGuidePrice,
  marketplaceCategories,
  marketplaceFormats,
  rankGuideListings,
  type GuideListing,
} from "@/lib/marketplace-data";

type GuideCatalogProps = {
  listings: GuideListing[];
  initialQuery?: string;
  showSearch?: boolean;
  showAdvancedFilters?: boolean;
};

export function GuideCatalog({
  listings,
  initialQuery = "",
  showSearch = true,
  showAdvancedFilters = true,
}: GuideCatalogProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("All knowledge");
  const [format, setFormat] = useState("All formats");
  const [price, setPrice] = useState("Any price");

  const filteredListings = useMemo(() => {
    return rankGuideListings(listings, query).filter((guide) => {
      const matchesCategory = category === "All knowledge" || guide.category === category;
      const matchesFormat = format === "All formats" || guide.format === format;
      const matchesPrice =
        price === "Any price" ||
        (price === "Free" ? guide.price_cents === 0 : guide.price_cents > 0);
      return matchesCategory && matchesFormat && matchesPrice;
    });
  }, [category, format, listings, price, query]);

  function clearFilters() {
    setQuery("");
    setCategory("All knowledge");
    setFormat("All formats");
    setPrice("Any price");
  }

  return (
    <>
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">Explore Doerly</p>
          <h2>Find your next useful thing.</h2>
        </div>
        <p>Search for a real task or problem, then see what each practitioner resource covers.</p>
      </div>

      {showSearch && (
        <form
          className="catalog-search"
          role="search"
          onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}
        >
          <Search aria-hidden="true" />
          <Input
            aria-label="Search practical resources"
            placeholder="What are you trying to figure out?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
      )}

      <div className="catalog-toolbar">
        <div className="category-list" aria-label="Filter by category">
          {marketplaceCategories.map((item) => (
            <Button
              key={item}
              variant={category === item ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
            >
              {item}
            </Button>
          ))}
        </div>
        <span className="result-count">
          <SlidersHorizontal aria-hidden="true" /> {filteredListings.length} resources
        </span>
      </div>

      {showAdvancedFilters && (
        <div className="catalog-refinements" aria-label="Refine results">
          <label>
            Format
            <select value={format} onChange={(event) => setFormat(event.target.value)}>
              <option>All formats</option>
              {marketplaceFormats.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Price
            <select value={price} onChange={(event) => setPrice(event.target.value)}>
              <option>Any price</option>
              <option>Free</option>
              <option>Paid</option>
            </select>
          </label>
        </div>
      )}

      {filteredListings.length > 0 ? (
        <div className="guide-grid">
          {filteredListings.map((guide, index) => (
            <GuideCard key={guide.id} guide={guide} index={index} />
          ))}
        </div>
      ) : (
        <div className="empty-catalog">
          <h3>No resources match those filters.</h3>
          <p>Try a different search or clear your filters to see all available resources.</p>
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      )}
    </>
  );
}

function GuideCard({ guide, index }: { guide: GuideListing; index: number }) {
  const accents = [
    "guide-accent-sea",
    "guide-accent-leaf",
    "guide-accent-coral",
    "guide-accent-sky",
  ];
  return (
    <article className="guide-card">
      <div className={`guide-card-art ${accents[index % accents.length]}`} aria-hidden="true">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <span className="guide-art-shape">{guide.category.slice(0, 1)}</span>
        {guide.sample && <span className="sample-tag">Example only</span>}
      </div>
      <div className="guide-card-body">
        <div className="guide-meta">
          <span>{guide.category}</span>
          <span>{guide.format}</span>
        </div>
        <h3>
          <Link to="/guide/$slug" params={{ slug: guide.slug }}>
            {guide.title}
          </Link>
        </h3>
        <p className="guide-summary">{guide.summary}</p>
        <div className="guide-card-bottom">
          <span className="creator-byline">By {guide.creator_name}</span>
          <span className="guide-price">
            {guide.price_cents === 0
              ? "Free"
              : formatGuidePrice(guide.price_cents, guide.currency_code)}
          </span>
        </div>
      </div>
    </article>
  );
}
