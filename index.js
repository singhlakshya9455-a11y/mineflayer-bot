process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const mineflayer = require("mineflayer");
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

// ================= EXPRESS SERVER =================
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.get("/", (req, res) => {
  res.send("Mineflayer + Discord bot is running!");
});

app.listen(PORT, HOST, () => {
  console.log(`🌐 Web server running on http://${HOST}:${PORT}`);
});

// ================= CONFIG =================
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

// ================= DISCORD =================
if (!config.discord.token) {
  console.error("❌ DISCORD_TOKEN missing!");
  process.exit(1);
}

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

console.log("🚀 Starting Discord login...");
console.log("Token exists?", !!config.discord.token);
console.log("Token length:", config.discord.token?.length);


discord.once("ready", () => {
  console.log(`🔹 Discord logged in as ${discord.user.tag}`);
});

discord.on("error", console.error);

discord.login(config.discord.token)
  .then(() => console.log("✅ Discord login successful"))
  .catch((err) => {
    console.error("❌ Discord login failed:", err);
    process.exit(1);
  });

// ================= MINECRAFT =================
let bot;
let afkJumpInterval;

function startAfkJumpLoop() {
  if (afkJumpInterval) clearInterval(afkJumpInterval);

  afkJumpInterval = setInterval(() => {
    if (!bot || !bot.entity) return;

    bot.setControlState("jump", true);
    setTimeout(() => {
      if (bot) bot.setControlState("jump", false);
    }, 300);

    console.log("⬆ AFK jump");
  }, 60000);
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
    console.log("🟢 Minecraft joined!");

    if (config.mc.loginPassword) {
      setTimeout(() => {
        bot.chat(`/login ${config.mc.loginPassword}`);
        console.log("🔐 Sent /login");
      }, 2000);
    }

    setTimeout(() => {
      bot.chat("/server survival");
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

  bot.on("end", () => {
    console.log("🔄 Minecraft disconnected. Reconnecting...");
    if (afkJumpInterval) clearInterval(afkJumpInterval);
    setTimeout(startMinecraftBot, 5000);
  });

  bot.on("error", console.error);
  bot.on("kicked", console.log);
}

startMinecraftBot();

// ================= DISCORD → MC =================
discord.on("messageCreate", (msg) => {
  if (msg.author.bot) return;
  if (msg.channel.id !== config.discord.channelId) return;
  if (!bot) return;

  const content = msg.content.trim();
  if (!content) return;

  if (content.startsWith("/")) {
    bot.chat(content);
    msg.reply(`🟢 Command executed: ${content}`).catch(console.error);
  } else {
    bot.chat(content);
  }
});

// ================= GLOBAL ERRORS =================
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);


