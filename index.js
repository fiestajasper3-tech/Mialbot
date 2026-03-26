const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const http = require('http');
require('dotenv').config();

// 1. RENDER HEALTH CHECK (Keep it online)
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Modmail & Moderator Bot is Active');
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

// 2. DEFINE SLASH COMMANDS
const commands = [
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member')
    .addUserOption(option => option.setName('target').setDescription('The member to kick').setRequired(true)),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member')
    .addUserOption(option => option.setName('target').setDescription('The member to ban').setRequired(true)),
  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member (60 seconds)')
    .addUserOption(option => option.setName('target').setDescription('The member to mute').setRequired(true)),
].map(command => command.toJSON());

// 3. REGISTER COMMANDS ON STARTUP
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
  try {
    console.log('Started refreshing slash commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log(`✅ ${client.user.tag} is online and Slash Commands are ready!`);
  } catch (error) {
    console.error(error);
  }
});

// 4. SLASH COMMAND INTERACTION HANDLER
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, member } = interaction;

  // Check for Moderator Permissions
  if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
    return interaction.reply({ content: "❌ You don't have permission to use staff commands!", ephemeral: true });
  }

  const target = options.getMember('target');

  if (commandName === 'kick') {
    await target.kick();
    await interaction.reply(`✈️ **${target.user.tag}** was kicked.`);
  } 
  
  else if (commandName === 'ban') {
    await target.ban();
    await interaction.reply(`🔨 **${target.user.tag}** was banned.`);
  } 

  else if (commandName === 'mute') {
    await target.timeout(60000); // 60 seconds
    await interaction.reply(`🤫 **${target.user.tag}** has been muted for 1 minute.`);
  }
});

// 5. YOUR MODMAIL LOGIC (Keeping your original code)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

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

      const successEmbed = new EmbedBuilder()
        .setColor('#43b581')
        .setDescription('✅ **Your message has been received by our staff!**');
      
      await message.reply({ embeds: [successEmbed] });
    }
    await channel.send(`**${message.author.tag}:** ${message.content}`);
  }

  else if (message.channel.parentId === process.env.CATEGORY_ID) {
    const userId = message.channel.topic;
    const user = await client.users.fetch(userId);

    if (message.content.toLowerCase() === '!close') {
      const closeEmbed = new EmbedBuilder()
        .setColor('#faa61a')
        .setDescription('🔒 **Modmail ticket closed.**');
      await user.send({ embeds: [closeEmbed] });
      return message.channel.delete();
    }

    const replyEmbed = new EmbedBuilder()
      .setColor('#5865f2')
      .setAuthor({ name: `Staff: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setDescription(message.content);

    await user.send({ embeds: [replyEmbed] });
    await message.react('✅');
  }
});

client.login(process.env.DISCORD_TOKEN);
