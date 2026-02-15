// ======================
// REQUIRE MODULES FIRST
// ======================
const mineflayer = require("mineflayer");
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

// ======================
// EXPRESS SERVER (for Render uptime)
// ======================
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.get("/", (req, res) => {
  res.send("Mineflayer + Discord bot is running!");
});

app.listen(PORT, HOST, () => {
  console.log(`🌐 Web server running on http://${HOST}:${PORT}`);
});

// ======================
// CONFIG
// ======================
const config = {
  mc: {
    host: "play.pika-network.net",
    port: 25565,
    username: "ItIsLux",
    version: "1.18.1",
    loginPassword: process.env.MC_LOGIN_PASSWORD,
  },
  discord: {
    token: process.env.DISCORD_TOKEN,
    channelId: "1430925481540063405",
  },
};

// ======================
// DISCORD CLIENT
// ======================
if (!config.discord.token) {
  console.error("❌ DISCORD_TOKEN not found in environment variables!");
  process.exit(1);
}

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Debug logs
console.log("🚀 Starting Discord login...");

discord.once("ready", () => {
  console.log(`🔹 Discord bot logged in as ${discord.user.tag}`);
});

discord.on("error", (err) => {
  console.error("Discord error:", err);
});

discord.login(config.discord.token)
  .then(() => console.log("✅ Discord login successful"))
  .catch((err) => {
    console.error("❌ Discord login failed:", err);
    process.exit(1);
  });

// ======================
// MINECRAFT BOT
// ======================
let bot = null;
let afkJumpInterval = null;

function startAfkJumpLoop() {
  if (afkJumpInterval) clearInterval(afkJumpInterval);

  afkJumpInterval = setInterval(() => {
    if (!bot || !bot.entity) return;

    try {
      bot.setControlState("jump", true);

      setTimeout(() => {
        if (bot) bot.setControlState("jump", false);
      }, 300);

      console.log("⬆ AFK jump executed");
    } catch (err) {
      console.log("AFK jump error:", err);
    }
  }, 60000); // every 60 sec
}

function startMinecraftBot() {
  console.log("⛏ Starting Minecraft bot...");

  bot = mineflayer.createBot({
    host: config.mc.host,
    port: config.mc.port,
    username: config.mc.username,
    version: config.mc.version,
  });

  bot.once("spawn", () => {
    console.log("🟢 Minecraft bot joined server!");

    setTimeout(() => {
      if (config.mc.loginPassword) {
        bot.chat(`/login ${config.mc.loginPassword}`);
        console.log("🔐 Sent /login");
      }
    }, 2000);

    setTimeout(() => {
      bot.chat(`/server survival`);
      console.log("🌍 Sent /server survival");
    }, 4000);

    startAfkJumpLoop();
  });

  bot.on("chat", (username, message) => {
    if (username === bot.username) return;

    const channel = discord.channels.cache.get(config.discord.channelId);
    if (channel) {
      channel.send(`**${username} ➤** ${message}`).catch(console.error);
    }
  });

  bot.on("kicked", (reason) => {
    console.log("⚠ Minecraft kicked:", reason);
  });

  bot.on("error", (err) => {
    console.log("Minecraft error:", err);
  });

  bot.on("end", () => {
    console.log("🔄 Minecraft disconnected. Reconnecting in 5s...");

    if (afkJumpInterval) {
      clearInterval(afkJumpInterval);
      afkJumpInterval = null;
    }

    setTimeout(startMinecraft

