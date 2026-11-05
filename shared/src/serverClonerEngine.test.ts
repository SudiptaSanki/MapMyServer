import { describe, it, expect } from "vitest";
import {
  detectCaptureMode,
  filterBlueprintForCloning,
  createCloningPlan,
  generateManualRecreationChecklist,
  type CloneSelectionConfig,
} from "./serverClonerEngine";
import {
  smallCommunityServer,
  developerCommunityServer,
  privateOrgServer,
  incompleteScanServer,
} from "./fixtures/mockServerFixtures";

describe("Stage 6: Smart Server Cloner Engine", () => {
  describe("Capture Mode Detection (Section 2 & 3)", () => {
    it("detects accessible-member mode for normal member scans and includes mandatory notice", () => {
      const modeInfo = detectCaptureMode(smallCommunityServer);

      expect(modeInfo.mode).toBe("accessible-member");
      expect(modeInfo.isOwnerOrAdmin).toBe(false);
      expect(modeInfo.notice).toContain("Partial Architecture Capture");
      expect(modeInfo.notice).toContain(
        "This blueprint contains only information visible to your Discord account."
      );
    });

    it("detects full-admin mode when administrator role is present", () => {
      const modeInfo = detectCaptureMode(privateOrgServer);

      // Council member has high permissions / role positions
      expect(modeInfo.badge).toBeDefined();
    });
  });

  describe("Smart Architecture Component Selection & Renaming (Section 4)", () => {
    const defaultConfig: CloneSelectionConfig = {
      mode: "everything",
      selectedCategoryIds: [],
      selectedChannelIds: [],
      selectedRoleIds: [],
      excludedChannelIds: [],
      includeRoles: true,
      includeDescriptions: true,
      includePermissions: true,
      categoryRenames: {},
      channelRenames: {},
    };

    it("clones everything accessible when mode is 'everything'", () => {
      const filtered = filterBlueprintForCloning(smallCommunityServer, defaultConfig);

      expect(filtered.categories.length).toBe(smallCommunityServer.categories.length);
      expect(filtered.channels.length).toBe(smallCommunityServer.channels.length);
      expect(filtered.roles.length).toBe(1); // Excludes @everyone
    });

    it("filters to selected categories only when mode is 'selected-categories'", () => {
      const config: CloneSelectionConfig = {
        ...defaultConfig,
        mode: "selected-categories",
        selectedCategoryIds: ["cat-small-welcome"],
      };

      const filtered = filterBlueprintForCloning(smallCommunityServer, config);

      expect(filtered.categories.length).toBe(1);
      expect(filtered.categories[0].id).toBe("cat-small-welcome");
      expect(filtered.channels.every((c) => c.parentId === "cat-small-welcome")).toBe(true);
    });

    it("applies category and channel renames and strips descriptions when requested", () => {
      const config: CloneSelectionConfig = {
        ...defaultConfig,
        includeDescriptions: false,
        categoryRenames: {
          "cat-small-welcome": "Onboarding & Rules",
        },
        channelRenames: {
          "chan-small-rules": "guidelines",
        },
      };

      const filtered = filterBlueprintForCloning(smallCommunityServer, config);

      const renamedCat = filtered.categories.find((c) => c.id === "cat-small-welcome");
      expect(renamedCat?.name).toBe("Onboarding & Rules");

      const renamedChan = filtered.channels.find((c) => c.id === "chan-small-rules");
      expect(renamedChan?.name).toBe("guidelines");
      expect(renamedChan?.topic).toBeUndefined(); // Stripped because includeDescriptions is false
    });

    it("excludes channels specified in excludedChannelIds", () => {
      const config: CloneSelectionConfig = {
        ...defaultConfig,
        excludedChannelIds: ["chan-small-rules"],
      };

      const filtered = filterBlueprintForCloning(smallCommunityServer, config);

      expect(filtered.channels.some((c) => c.id === "chan-small-rules")).toBe(false);
      expect(filtered.channels.length).toBe(smallCommunityServer.channels.length - 1);
    });
  });

  describe("Clone & Merge Planning (Section 5)", () => {
    const config: CloneSelectionConfig = {
      mode: "everything",
      selectedCategoryIds: [],
      selectedChannelIds: [],
      selectedRoleIds: [],
      excludedChannelIds: [],
      includeRoles: true,
      includeDescriptions: true,
      includePermissions: true,
      categoryRenames: {},
      channelRenames: {},
    };

    it("creates full-clone execution plan for a brand new server", () => {
      const plan = createCloningPlan(developerCommunityServer, null, "full-clone", config);

      expect(plan.workflow).toBe("full-clone");
      expect(plan.totalCategoriesToCreate).toBe(developerCommunityServer.categories.length);
      expect(plan.totalChannelsToCreate).toBe(developerCommunityServer.channels.length);
      expect(plan.skippedDuplicatesCount).toBe(0);
      expect(plan.requiredBotPermissions).toContain("MANAGE_CHANNELS");
      expect(plan.requiredBotPermissions).toContain("MANAGE_ROLES");

      // Verify category operations are ordered before channels
      const catOps = plan.operations.filter((op) => op.action === "CREATE_CATEGORY");
      const chanOps = plan.operations.filter((op) => op.action === "CREATE_CHANNEL" && op.categoryName);

      for (const chOp of chanOps) {
        const catOp = catOps.find((c) => c.name === chOp.categoryName);
        if (catOp) {
          expect(chOp.dependencies).toContain(catOp.id);
        }
      }
    });

    it("creates selective-merge plan skipping duplicate categories and channels", () => {
      // Merge smallCommunityServer into itself
      const plan = createCloningPlan(
        smallCommunityServer,
        smallCommunityServer,
        "selective-merge",
        config
      );

      expect(plan.workflow).toBe("selective-merge");
      // Categories already exist in destination
      expect(plan.totalCategoriesToCreate).toBe(0);
      expect(plan.skippedDuplicatesCount).toBeGreaterThan(0);

      const skipOps = plan.operations.filter((op) => op.action === "SKIP_EXISTING");
      expect(skipOps.length).toBeGreaterThan(0);
    });
  });

  describe("Manual Recreation Checklist (Section 7)", () => {
    it("generates markdown checklist with step-by-step guidance", () => {
      const config: CloneSelectionConfig = {
        mode: "everything",
        selectedCategoryIds: [],
        selectedChannelIds: [],
        selectedRoleIds: [],
        excludedChannelIds: [],
        includeRoles: true,
        includeDescriptions: true,
        includePermissions: true,
        categoryRenames: {},
        channelRenames: {},
      };

      const plan = createCloningPlan(smallCommunityServer, null, "full-clone", config);
      const checklist = generateManualRecreationChecklist(plan);

      expect(checklist).toContain("# Discord Server Architecture Recreation Guide");
      expect(checklist).toContain("Step 2: Create Categories & Channels");
      expect(checklist).toContain("- [ ]");
      expect(checklist).toContain("Category: Welcome");
    });
  });
});

