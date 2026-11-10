import { createFileRoute, Link } from "@tanstack/react-router";
import { policyDrafts } from "@/lib/policy-drafts";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Policy drafts | Doerly" },
      {
        name: "description",
        content: "Review the draft Doerly terms, privacy notice, and creator content rules.",
      },
    ],
  }),
  component: PolicyDraftsPage,
});

function PolicyDraftsPage() {
  return (
    <main className="policy-page">
      <header className="policy-page-heading">
        <p className="eyebrow">Doerly policies</p>
        <h1>Draft policies for review</h1>
        <p>
          These are working drafts based on the product requirements. They are not final legal
          documents.
        </p>
      </header>

      <aside className="policy-draft-warning" role="note">
        <strong>Draft — not approved for launch</strong>
        <p>
          Checkout stays disabled until the terms, privacy practices, launch markets, buyer
          remedies, and required legal review are confirmed.
        </p>
      </aside>

      <nav className="policy-navigation" aria-label="Policy drafts">
        {policyDrafts.map((policy) => (
          <a key={policy.id} href={`#${policy.id}`}>
            {policy.title}
          </a>
        ))}
      </nav>

      <div className="policy-documents">
        {policyDrafts.map((policy) => (
          <article key={policy.id} id={policy.id} className="policy-document">
            <p className="eyebrow">Draft for review</p>
            <h2>{policy.title}</h2>
            <p className="policy-introduction">{policy.introduction}</p>
            {policy.sections.map((section) => (
              <section key={section.heading}>
                <h3>{section.heading}</h3>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </article>
        ))}
      </div>

      <footer className="policy-page-footer">
        <Link to="/creator">Back to creator setup</Link>
        <Link to="/">Back to Doerly</Link>
      </footer>
    </main>
  );
}
