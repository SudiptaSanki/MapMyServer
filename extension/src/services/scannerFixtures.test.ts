import { describe, it, expect } from "vitest";
import { buildBlueprint } from "./blueprintBuilder";
import {
  smallCommunityServer,
  developerCommunityServer,
  privateOrgServer,
  incompleteScanServer,
} from "@mapmyserver/shared/src/fixtures/mockServerFixtures";

describe("Realistic Scanner & Blueprint Fixtures (Section 16)", () => {
  it("normalizes small community server with public visibility classifications", () => {
    const bp = buildBlueprint({
      server: smallCommunityServer.server,
      categories: smallCommunityServer.categories,
      channels: smallCommunityServer.channels,
      threads: smallCommunityServer.threads,
      roles: smallCommunityServer.roles,
    });

    expect(bp.server.name).toBe("Cozy Book Club");
    expect(bp.categories.length).toBe(2);
    expect(bp.channels.length).toBe(4);
    expect(bp.statistics.voiceChannels).toBe(1);
    expect(bp.statistics.textChannels).toBe(2);
    expect(bp.statistics.announcementChannels).toBe(1);
    expect(bp.scanQuality?.completenessScore).toBe(100);
  });

  it("handles developer community server with forums, announcements, and maintainer restrictions", () => {
    const bp = buildBlueprint({
      server: developerCommunityServer.server,
      categories: developerCommunityServer.categories,
      channels: developerCommunityServer.channels,
      threads: developerCommunityServer.threads,
      roles: developerCommunityServer.roles,
    });

    expect(bp.server.name).toBe("TypeScript Tooling Guild");
    expect(bp.statistics.forumChannels).toBe(2);

    const cveChannel = bp.channels.find((c) => c.name === "cve-triage");
    expect(cveChannel).toBeDefined();
    expect(cveChannel?.visibilityAnalysis?.classification).toBe("role-restricted");
  });

  it("handles private DAO server with member-specific overrides and strict permissions", () => {
    const bp = buildBlueprint({
      server: privateOrgServer.server,
      categories: privateOrgServer.categories,
      channels: privateOrgServer.channels,
      threads: privateOrgServer.threads,
      roles: privateOrgServer.roles,
    });

    expect(bp.server.name).toBe("Aegis Decentralized Syndicate");
    const councilChamber = bp.channels.find((c) => c.name === "council-chambers");
    expect(councilChamber).toBeDefined();
    // Overrides present
    expect(councilChamber?.permissions?.length).toBeGreaterThan(0);
  });

  it("flags incomplete scan correctly with low completeness score and warnings", () => {
    const bp = buildBlueprint({
      server: incompleteScanServer.server,
      categories: incompleteScanServer.categories,
      channels: incompleteScanServer.channels,
      threads: incompleteScanServer.threads,
      roles: incompleteScanServer.roles, // Empty roles
    });

    expect(bp.scanQuality?.completenessScore).toBeLessThan(80);
    expect(bp.scanQuality?.permissionDataQuality).toBe("none");
    expect(bp.scanQuality?.missingDataWarnings.length).toBeGreaterThan(0);
  });
});

