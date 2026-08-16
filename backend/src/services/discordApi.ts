import axios from "axios";

const DISCORD_API = "https://discord.com/api/v10";

export const getGuilds = async (accessToken: string) => {
  const response = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

export const getGuild = async (guildId: string, accessToken: string) => {
  const response = await axios.get(`${DISCORD_API}/guilds/${guildId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

export const getGuildChannels = async (guildId: string, accessToken: string) => {
  const response = await axios.get(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};

export const getGuildRoles = async (guildId: string, accessToken: string) => {
  const response = await axios.get(`${DISCORD_API}/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
};
