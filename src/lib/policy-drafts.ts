export const POLICY_DRAFT_VERSION = "prelaunch-draft-2026-11-10-v1";

export type PolicySection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type PolicyDocument = {
  id: "terms" | "privacy" | "creator-rules";
  title: string;
  introduction: string;
  sections: PolicySection[];
};

export const policyDrafts: PolicyDocument[] = [
  {
    id: "terms",
    title: "Terms of Use",
    introduction:
      "These draft terms describe the intended Doerly marketplace. Checkout is not active, and commercial, support, and legal terms still need approval before a paid launch.",
    sections: [
      {
        heading: "Accounts and profiles",
        paragraphs: [
          "Use an email address you control and keep account and public-profile information accurate. Public creator details may include your display name, profile image, biography, expertise, and practical experience.",
        ],
      },
      {
        heading: "Creator materials and review",
        paragraphs: [
          "Creators keep ownership of material they submit and must have the rights needed to share it. A creator would grant Doerly permission to store and display the listing and to provide the resource to authorized buyers if paid access is enabled.",
          "A review checks a resource against its listing and applicable platform rules. It does not certify the creator, guarantee factual accuracy, or promise an outcome. The creator remains responsible for their claims and material.",
        ],
      },
      {
        heading: "Buyer access and permitted use",
        paragraphs: [
          "The proposed default is use by the purchasing person for their own internal work, without resale, public reposting, or redistribution. Team, farm, cooperative, and organization licenses have not been finalized. The license shown at checkout must be approved before purchases are enabled.",
        ],
      },
      {
        heading: "Prices, payments, and support",
        paragraphs: [
          "No payment is taken in the current prototype. Launch countries, supported currencies and payment methods, platform fees, creator payouts, refunds, and buyer remedies remain undecided. Doerly will not represent a draft price or internal balance as a confirmed charge or payout.",
        ],
      },
      {
        heading: "Practical information and limitations",
        paragraphs: [
          "Resources are practical information from their creators, not a guarantee of results or a substitute for qualified professional advice where that is needed. Sensitive categories and any specialist-review requirements must be defined before those resources are accepted.",
        ],
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy Notice",
    introduction:
      "This draft explains the information the current prototype handles. Data-retention periods, deletion procedures, provider details, launch jurisdictions, and a support contact still need confirmation.",
    sections: [
      {
        heading: "Information the prototype uses",
        bullets: [
          "Account email, authentication state, and the name supplied during registration.",
          "Public profile details: display name, optional image URL, biography, expertise, and practical experience.",
          "Private creator drafts and uploaded resource files.",
          "Information needed to operate, protect, and troubleshoot the service.",
        ],
      },
      {
        heading: "How information is used",
        paragraphs: [
          "The prototype uses account and profile information to provide sign-in, email verification, creator setup, private draft management, and public listings. Draft uploads are intended to remain private to their creator; the current UI does not provide buyer downloads or checkout.",
        ],
      },
      {
        heading: "What is public",
        paragraphs: [
          "A creator chooses the profile details entered in the creator studio for public display. Published listings are public. Do not put private or sensitive information in a public profile or listing.",
        ],
      },
      {
        heading: "Storage, sharing, and retention",
        paragraphs: [
          "The app currently relies on managed hosting, authentication, database, and file-storage services. Their exact processing locations, subprocessors, retention periods, deletion process, and data-subject request process must be confirmed and documented before launch. Doerly will not claim those details are settled by this draft.",
        ],
      },
      {
        heading: "Questions or requests",
        paragraphs: [
          "A public support and privacy contact has not yet been selected. Add an accountable contact and request-handling process before collecting production user data.",
        ],
      },
    ],
  },
  {
    id: "creator-rules",
    title: "Creator Content Rules",
    introduction:
      "These draft rules set the intended quality and responsibility bar for creator resources. The admin review process, appeals, restricted categories, and support channel are not yet configured.",
    sections: [
      {
        heading: "Rights and originality",
        bullets: [
          "Submit only material you created or have permission to distribute.",
          "Identify third-party material, sources, and material AI assistance when it affects what buyers should expect.",
          "Do not upload material that infringes rights, exposes another person's private information, or is unlawful.",
        ],
      },
      {
        heading: "Describe the resource accurately",
        bullets: [
          "Name the practical problem and intended audience.",
          "Describe the contents, format, prerequisites, limitations, and expected way to use the resource.",
          "Keep the listing, preview, file, and price consistent. Do not promise guaranteed outcomes or credentials that have not been independently verified.",
        ],
      },
      {
        heading: "Accuracy and safe use",
        paragraphs: [
          "Creators remain responsible for their material. Consequential claims should include suitable sources, dates, context, and cautions. Veterinary, health, legal, financial, and safety-critical topics need specific safeguards or specialist review; those final category rules are still open.",
        ],
      },
      {
        heading: "Buyer support",
        paragraphs: [
          "Creators are expected to respond to relevant reports about access failure, a broken or wrong file, or a material mismatch between the resource and its listing. The support route and final remedies must be established before paid sales begin.",
        ],
      },
      {
        heading: "Review is not certification",
        paragraphs: [
          "A human review should check problem fit, completeness, listing-to-file fidelity, usability, creator claims, rights, and relevant safety concerns. A review decision is not proof that advice is universally correct or effective.",
        ],
      },
    ],
  },
];
