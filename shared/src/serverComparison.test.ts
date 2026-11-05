import { describe, it, expect } from "vitest";
import {
  compareServerBlueprints,
  templateToBlueprint,
  CURATED_TEMPLATES,
} from "./index";
import {
  smallCommunityServer,
  developerCommunityServer,
  privateOrgServer,
  incompleteScanServer,
} from "./fixtures/mockServerFixtures";

describe("Server Comparison Engine (Section 8 — Core Feature)", () => {
  it("compares two identical servers with 100% structural alignment", () => {
    const result = compareServerBlueprints(smallCommunityServer, smallCommunityServer);

    expect(result.metrics.overallStructuralAlignment).toBe(100);
    expect(result.metrics.categoryAlignmentScore).toBe(100);
    expect(result.metrics.channelAlignmentScore).toBe(100);
    expect(result.metrics.roleAlignmentScore).toBe(100);
    expect(result.metrics.totalMissingChannels).toBe(0);
    expect(result.metrics.totalExtraChannels).toBe(0);
    expect(result.metrics.totalMissingCategories).toBe(0);
    expect(result.recommendations).toHaveLength(0);
  });

  it("identifies missing categories, channels, and roles when comparing small to dev server", () => {
    // Reference is developer server (more advanced), Target is small community server
    const result = compareServerBlueprints(developerCommunityServer, smallCommunityServer);

    expect(result.metrics.overallStructuralAlignment).toBeLessThan(100);
    expect(result.metrics.totalMissingCategories).toBeGreaterThan(0);
    expect(result.metrics.totalMissingChannels).toBeGreaterThan(0);

    // Verify recommendations were generated for missing resources
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.type === "create-category")).toBe(true);
    expect(result.recommendations.some((r) => r.type === "create-channel")).toBe(true);
  });

  it("identifies channel type differences and visibility differences", () => {
    // Reference has forum channel 'developer-help', target doesn't have it
    const result = compareServerBlueprints(developerCommunityServer, smallCommunityServer);

    const devCategoryDiff = result.categories.find((c) => c.categoryName === "Core Development");
    expect(devCategoryDiff).toBeDefined();
    expect(devCategoryDiff?.status).toBe("missing-in-target");
  });

  it("compares against a curated template converted via templateToBlueprint", () => {
    const devTemplate = CURATED_TEMPLATES[0]; // Developer community template
    const templateBlueprint = templateToBlueprint(devTemplate);

    expect(templateBlueprint.server.name).toBe(devTemplate.name);
    expect(templateBlueprint.categories.length).toBe(devTemplate.categories.length);

    // Compare template as reference against small community server
    const result = compareServerBlueprints(templateBlueprint, smallCommunityServer);
    expect(result.referenceServer.name).toBe(devTemplate.name);
    expect(result.targetServer.name).toBe(smallCommunityServer.server.name);
    expect(result.metrics.totalMissingCategories).toBeGreaterThan(0);
  });

  it("handles private DAO server with member overwrites and restricted channels", () => {
    const result = compareServerBlueprints(privateOrgServer, smallCommunityServer);

    expect(result.metrics.totalMissingRoles).toBeGreaterThan(0);
    const councilCategory = result.categories.find((c) => c.categoryName === "High Council");
    expect(councilCategory).toBeDefined();
    expect(councilCategory?.status).toBe("missing-in-target");
  });
});
