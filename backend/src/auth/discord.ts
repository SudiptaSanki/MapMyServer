import { Router } from "express";
import axios from "axios";
import jwt from "jsonwebtoken";

const router = Router();

const DISCORD_API = "https://discord.com/api/v10";

router.get("/login", (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI || "");
  const scope = encodeURIComponent("identify guilds");
  
  // Return the URL for the extension to open in a new tab/window
  res.json({
    url: `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`,
  });
});

router.post("/callback", async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "No code provided" });
  }

  try {
    // 1. Exchange code for token
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID || "",
      client_secret: process.env.DISCORD_CLIENT_SECRET || "",
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI || "",
    });

    const tokenResponse = await axios.post(`${DISCORD_API}/oauth2/token`, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { access_token } = tokenResponse.data;

    // 2. Get user info
    const userResponse = await axios.get(`${DISCORD_API}/users/@me`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const user = userResponse.data;

    // 3. Create our own JWT to send to the extension
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        discord_token: access_token, // Store Discord token inside our JWT for simplicity in this prototype
      },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    console.error("OAuth error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to authenticate with Discord" });
  }
});

// Middleware to verify JWT
export const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export default router;
