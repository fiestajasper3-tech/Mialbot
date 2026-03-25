const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User] // The "Secret Sauce" for DMs
});

client.on('ready', () => {
  console.log(`✅ ${client.user.tag} is online and watching DMs!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // USER DMS THE BOT
  if (message.channel.type === ChannelType.DM) {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) return console.log("Guild ID not found!");

    let channel = guild.channels.cache.find(c => c.topic === message.author.id);

    if (!channel) {
      channel = await guild.channels.create({
        name: `ticket-${message.author.username}`,
        parent: process.env.CATEGORY_ID,
        topic: message.author.id,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });
      await message.reply("📬 Staff has been notified!");
    }
    await channel.send(`**${message.author.tag}:** ${message.content}`);
  }

  // STAFF REPLIES IN THE TICKET CHANNEL
  else if (message.channel.parentId === process.env.CATEGORY_ID) {
    const user = await client.users.fetch(message.channel.topic);
    if (message.content === "!close") {
        await user.send("🔒 Ticket closed.");
        return message.channel.delete();
    }
    await user.send(`**Staff:** ${message.content}`);
    await message.react('✅');
  }
});

client.login(process.env.DISCORD_TOKEN);
