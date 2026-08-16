import { Router } from "express";
import { requireAuth } from "../auth/discord";
import { getGuilds, getGuild, getGuildChannels, getGuildRoles } from "../services/discordApi";
import { normalizeServerData } from "../services/normalizer";

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

router.get("/", async (req: any, res) => {
  try {
    const guilds = await getGuilds(req.user.discord_token);
    res.json(guilds);
  } catch (error: any) {
    console.error("Error fetching guilds:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch servers" });
  }
});

router.get("/:id/blueprint", async (req: any, res) => {
  const guildId = req.params.id;
  const token = req.user.discord_token;

  try {
    // Fetch all required data in parallel
    const [guild, channels, roles] = await Promise.all([
      getGuild(guildId, token),
      getGuildChannels(guildId, token),
      getGuildRoles(guildId, token)
    ]);

    // Normalize into a ServerBlueprint
    const blueprint = normalizeServerData(guild, channels, roles);

    res.json(blueprint);
  } catch (error: any) {
    console.error(`Error fetching blueprint for ${guildId}:`, error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      return res.status(403).json({ 
        error: "Missing Access", 
        message: "The bot must be invited to this server to read its structure, or you lack permissions." 
      });
    }

    res.status(500).json({ error: "Failed to generate blueprint" });
  }
});

export default router;
