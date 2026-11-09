---
name: Creator profile storage
description: Why onboarding uses current profile fields until the database schema can be extended.
---

Until a Lovable-managed schema update is approved, expertise categories, practical experience, and the creator's short introduction are serialized in the public profile bio. The rights acknowledgment timestamp is stored in Supabase Auth user metadata.

**Why:** The user chose to continue onboarding with the existing profile fields, and the repository instructions prohibit local database migrations.

**How to apply:** Keep the public bio readable. When structured profile and consent-audit fields are added, migrate the labeled bio details carefully and replace the mutable user-metadata timestamp with an auditable acknowledgment record. Do not describe the current acknowledgment as immutable or as acceptance of finalized legal terms.
