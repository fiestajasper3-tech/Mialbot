const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const http = require('http');
require('dotenv').config();

// 1. RENDER HEALTH CHECK
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Modmail Bot is Active');
}).listen(process.env.PORT || 10000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.DirectMessages, 
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User]
});

// 2. SLASH COMMANDS DEFINITION
const commands = [
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(o => o.setName('target').setDescription('User to kick').setRequired(true)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(o => o.setName('target').setDescription('User to ban').setRequired(true)),
  new SlashCommandBuilder().setName('mute').setDescription('Mute a member').addUserOption(o => o.setName('target').setDescription('User to mute').setRequired(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`✅ Logged in as ${client.user.tag}`);
  } catch (e) { console.error(e); }
});

// 3. SLASH COMMAND HANDLER
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    return interaction.editReply("❌ Staff only!");
  }

  const target = interaction.options.getMember('target');
  try {
    if (interaction.commandName === 'kick') { await target.kick(); await interaction.editReply(`✈️ Kicked ${target.user.tag}`); }
    if (interaction.commandName === 'ban') { await target.ban(); await interaction.editReply(`🔨 Banned ${target.user.tag}`); }
    if (interaction.commandName === 'mute') { await target.timeout(600000); await interaction.editReply(`🤫 Muted ${target.user.tag}`); }
  } catch (err) { await interaction.editReply("⚠️ Check my Role position!"); }
});

// 4. MODMAIL LOGIC WITH UPDATED EMBED
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // USER DMs THE BOT
  if (message.channel.type === ChannelType.DM) {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    const categoryId = process.env.CATEGORY_ID;
    if (!guild) return;

    let channel = guild.channels.cache.find(c => c.topic === message.author.id);

    if (!channel) {
      channel = await guild.channels.create({
        name: `ticket-${message.author.username}`,
        parent: categoryId,
        topic: message.author.id,
        permissionOverwrites: [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }]
      });

      // --- THE NEW PROFESSIONAL EMBED (Matches your image) ---
      const welcomeEmbed = new EmbedBuilder()
        .setColor('#5865F2') // Blurple/Blue
        .setTitle('Contact Mods')
        .setDescription(`Hey, I'm a Robot! The messages you send me (including the one you just sent) **will be visible to all the moderators**. I will DM you back when they reply.\n\n` +
          `❓ **If you have a question** please ask what your question is if you haven't already. The moderators are volunteers.\n\n` +
          `🛡️ **If you want to report someone** please provide the user ID and proof of rule breaking.\n\n` +
          `✅ **If you find the answer** or no longer need help, just say "!close" so we can close your request.\n\n` +
          `*Please keep chatter to a minimum. Misuse of modmail may lead to action taken against you.*`)
        .setFooter({ text: 'Discord Staff Team' });
      
      await message.reply({ embeds: [welcomeEmbed] });
    }
    await channel.send(`**${message.author.tag}:** ${message.content}`);
  }

  // STAFF REPLIES IN TICKET CHANNEL
  else if (message.channel.parentId === process.env.CATEGORY_ID) {
    const userId = message.channel.topic;
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return;

    if (message.content.toLowerCase() === '!close') {
      const closeEmbed = new EmbedBuilder().setColor('#faa61a').setDescription('🔒 **Modmail ticket closed.**');
      await user.send({ embeds: [closeEmbed] }).catch(() => null);
      return message.channel.delete();
    }

    const replyEmbed = new EmbedBuilder()
      .setColor('#43b581') // Green
      .setAuthor({ name: `Server Moderators [NOT EMPLOYEES]:`, iconURL: guild.iconURL() })
      .setDescription(message.content);

    await user.send({ embeds: [replyEmbed] }).catch(() => null);
    await message.react('✅');
  }
});

client.login(process.env.DISCORD_TOKEN);
