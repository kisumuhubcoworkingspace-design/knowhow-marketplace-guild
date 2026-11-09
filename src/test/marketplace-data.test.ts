import { describe, expect, it } from "vitest";
import { parseCreatorProfile, serializeCreatorProfile } from "@/lib/marketplace-data";

describe("creator profile persistence", () => {
  it("round-trips expertise, experience, and public bio through the profile bio field", () => {
    const details = {
      expertise: ["Farming & food", "Business"],
      experience: "Eight years raising poultry.",
      about: "I help new keepers manage healthy flocks.",
    };

    expect(parseCreatorProfile(serializeCreatorProfile(details))).toEqual(details);
  });

  it("keeps older plain-text bios visible as the about section", () => {
    expect(parseCreatorProfile("A longtime poultry keeper.")).toEqual({
      expertise: [],
      experience: "",
      about: "A longtime poultry keeper.",
    });
  });
});
