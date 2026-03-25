const { Client, GatewayIntentBits, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages // Needed to read DMs
  ],
  partials: ['CHANNEL'] // Needed to receive DMs
});

// Settings - Put your IDs here or in Railway Variables
const SERVER_ID = process.env.GUILD_ID; 
const CATEGORY_ID = process.env.CATEGORY_ID; 

client.on('ready', () => console.log(`📬 Modmail Bot is online!`));

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // 1. Handling Direct Messages (User -> Bot)
  if (message.channel.type === ChannelType.DM) {
    const guild = client.guilds.cache.get(SERVER_ID);
    if (!guild) return;

    // Check if a ticket channel already exists for this user
    let channel = guild.channels.cache.find(c => c.topic === message.author.id);

    if (!channel) {
      // Create new ticket channel
      channel = await guild.channels.create({
        name: `ticket-${message.author.username}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        topic: message.author.id, // We store the User ID in the topic to find it later
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, // Hide from @everyone
        ],
      });

      const startEmbed = new EmbedBuilder()
        .setTitle("New Modmail Ticket")
        .setColor("#00ff00")
        .setDescription(`**User:** ${message.author.tag}\n**ID:** ${message.author.id}`)
        .setTimestamp();

      await channel.send({ content: "@here New ticket created!", embeds: [startEmbed] });
      await message.reply("✅ Your message has been sent to the staff! Please wait for a reply.");
    }

    // Forward the user's message to the staff channel
    await channel.send(`**${message.author.username}:** ${message.content}`);
  }

  // 2. Handling Staff Replies (Staff Channel -> User DM)
  else if (message.channel.parentId === CATEGORY_ID) {
    const userId = message.channel.topic;
    if (!userId) return;

    try {
      const user = await client.users.fetch(userId);
      
      // If staff types !close, delete the channel
      if (message.content.toLowerCase() === "!close") {
        await user.send("🔒 Your ticket has been closed by the staff.");
        return message.channel.delete();
      }

      // Forward staff message to User DM
      await user.send(`**Staff:** ${message.content}`);
      await message.react('✅'); // Confirm sent
    } catch (err) {
      message.reply("❌ Could not message the user. They might have DMs closed.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
