const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel, Partials.Message, Partials.User]
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // --- USER SENDS DM ---
  if (message.channel.type === ChannelType.DM) {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    const categoryId = process.env.CATEGORY_ID;

    let channel = guild.channels.cache.find(c => c.topic === message.author.id);

    if (!channel) {
      channel = await guild.channels.create({
        name: `ticket-${message.author.username}`,
        parent: categoryId,
        topic: message.author.id,
        permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
      });

      // Green Success Embed (Matches your image)
      const successEmbed = new EmbedBuilder()
        .setColor('#43b581') // Discord Green
        .setDescription('✅ **Your message has been received by our staff. We\'ll get back to you soon!**');
      
      await message.reply({ embeds: [successEmbed] });
    }

    // Forwarding to Staff
    await channel.send(`**${message.author.tag}:** ${message.content}`);
  }

  // --- STAFF REPLIES ---
  else if (message.channel.parentId === process.env.CATEGORY_ID) {
    const userId = message.channel.topic;
    const user = await client.users.fetch(userId);

    if (message.content.toLowerCase() === '!close') {
      const closeEmbed = new EmbedBuilder()
        .setColor('#faa61a') // Orange/Gold
        .setDescription('🔒 **Your modmail ticket has been closed by staff. Feel free to DM again if you need further help.**');
      
      await user.send({ embeds: [closeEmbed] });
      return message.channel.delete();
    }

    // Professional Staff Reply Embed
    const replyEmbed = new EmbedBuilder()
      .setColor('#5865f2') // Discord Blue
      .setAuthor({ name: `Staff: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setDescription(message.content);

    await user.send({ embeds: [replyEmbed] });
    await message.react('✅');
  }
});

client.login(process.env.DISCORD_TOKEN);
