const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const http = require('http');
require('dotenv').config();

// 1. RENDER HEARTBEAT (Keep-Alive)
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is Active');
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

// 2. SLASH COMMANDS SETUP
const commands = [
  new SlashCommandBuilder().setName('kick').setDescription('Kick a member').addUserOption(o => o.setName('target').setDescription('The user to kick').setRequired(true)),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a member').addUserOption(o => o.setName('target').setDescription('The user to ban').setRequired(true)),
  new SlashCommandBuilder().setName('mute').setDescription('Mute a member (10m)').addUserOption(o => o.setName('target').setDescription('The user to mute').setRequired(true)),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`✅ ${client.user.tag} is online with Slash Commands!`);
  } catch (e) { console.error(e); }
});

// 3. SLASH COMMAND HANDLER
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  await interaction.deferReply({ ephemeral: true });

  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    return interaction.editReply("❌ You don't have permission.");
  }

  const target = interaction.options.getMember('target');
  try {
    if (interaction.commandName === 'kick') { await target.kick(); await interaction.editReply(`✈️ Kicked ${target.user.tag}`); }
    if (interaction.commandName === 'ban') { await target.ban(); await interaction.editReply(`🔨 Banned ${target.user.tag}`); }
    if (interaction.commandName === 'mute') { await target.timeout(600000); await interaction.editReply(`🤫 Muted ${target.user.tag}`); }
  } catch (err) { await interaction.editReply("⚠️ Error: Check my role position!"); }
});

// 4. MODMAIL LOGIC (DMs and Replies)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // --- USER DMs THE BOT ---
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

      const welcomeEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Contact Mods')
        .setDescription(`Hey, I'm a Robot! Your message has been sent to the staff.\n\n` +
          `❓ **Questions:** Please be specific.\n` +
          `🛡️ **Reports:** Provide IDs and proof.\n` +
          `✅ **Finish:** Type "!close" when done.`)
        .setFooter({ text: 'Discord Staff Team' });
      
      await message.reply({ embeds: [welcomeEmbed] });
    }
    await channel.send(`**${message.author.tag}:** ${message.content}`);
  }

  // --- STAFF REPLIES IN TICKET ---
  else if (message.channel.parentId === process.env.CATEGORY_ID) {
    const userId = message.channel.topic;
    if (!userId) return;

    try {
      const user = await client.users.fetch(userId);

      // Handle closing
      if (message.content.toLowerCase() === '!close') {
        const closeEmbed = new EmbedBuilder().setColor('#faa61a').setDescription('🔒 **Modmail ticket closed.**');
        await user.send({ embeds: [closeEmbed] }).catch(() => null);
        return message.channel.delete();
      }

      // Send reply to User DM
      const replyEmbed = new EmbedBuilder()
        .setColor('#43b581')
        .setAuthor({ name: `Server Moderators [NOT EMPLOYEES]`, iconURL: client.user.displayAvatarURL() })
        .setDescription(message.content);

      await user.send({ embeds: [replyEmbed] });
      await message.react('✅'); // SUCCESS feedback

    } catch (err) {
      console.error(err);
      await message.react('❌'); // FAILURE feedback
      await message.channel.send("⚠️ **Failed to DM user.** They might have DMs closed.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
