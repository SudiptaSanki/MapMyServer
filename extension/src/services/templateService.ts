/* ─────────────────────────────────────────────
 *  Template Storage & Management Service
 *
 *  Manages custom server templates, imports, exports,
 *  and merges them with built-in curated templates.
 * ───────────────────────────────────────────── */

import {
  type ServerTemplate,
  CURATED_TEMPLATES,
  validateTemplate,
} from "@mapmyserver/shared";

const STORAGE_KEY_CUSTOM_TEMPLATES = "custom_server_templates";

export class TemplateService {
  /**
   * Loads all custom user-created templates from local storage.
   */
  static async loadCustomTemplates(): Promise<ServerTemplate[]> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const res = await chrome.storage.local.get(STORAGE_KEY_CUSTOM_TEMPLATES);
      return (res[STORAGE_KEY_CUSTOM_TEMPLATES] as ServerTemplate[]) || [];
    }
    return [];
  }

  /**
   * Saves or updates a custom template in local storage.
   */
  static async saveCustomTemplate(template: ServerTemplate): Promise<void> {
    const validation = validateTemplate(template);
    if (!validation.valid) {
      throw new Error(`Invalid template format: ${validation.errors.join(", ")}`);
    }

    const current = await this.loadCustomTemplates();
    const existingIndex = current.findIndex((t) => t.id === template.id);

    if (existingIndex >= 0) {
      current[existingIndex] = { ...template, updatedAt: Date.now() };
    } else {
      current.unshift({ ...template, updatedAt: Date.now(), createdAt: template.createdAt || Date.now() });
    }

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY_CUSTOM_TEMPLATES]: current });
    }
  }

  /**
   * Deletes a custom template by ID.
   */
  static async deleteCustomTemplate(templateId: string): Promise<void> {
    const current = await this.loadCustomTemplates();
    const filtered = current.filter((t) => t.id !== templateId);

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY_CUSTOM_TEMPLATES]: filtered });
    }
  }

  /**
   * Returns all available templates (Curated + Custom).
   */
  static async getAllTemplates(): Promise<ServerTemplate[]> {
    const custom = await this.loadCustomTemplates();
    return [...custom, ...CURATED_TEMPLATES];
  }

  /**
   * Exports a template as a downloadable JSON file string.
   */
  static exportTemplateAsJson(template: ServerTemplate): string {
    return JSON.stringify(template, null, 2);
  }

  /**
   * Imports a template from a JSON string, validating schema before saving.
   */
  static async importTemplateFromJson(jsonString: string): Promise<ServerTemplate> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      throw new Error(`JSON syntax error: ${(err as Error).message}`);
    }

    const validation = validateTemplate(parsed);
    if (!validation.valid) {
      throw new Error(`Invalid template structure: ${validation.errors.join("; ")}`);
    }

    const template = parsed as ServerTemplate;
    // Assign unique ID to avoid overwriting existing built-ins
    template.id = `custom-imported-${Date.now()}`;
    template.tags = [...(template.tags || []), "imported"];
    template.createdAt = Date.now();
    template.updatedAt = Date.now();

    await this.saveCustomTemplate(template);
    return template;
  }
}
