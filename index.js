const { Client, GatewayIntentBits, Partials, ChannelType, PermissionsBitField } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, 
    GatewayIntentBits.DirectMessages, // To see DMs
    GatewayIntentBits.GuildMembers    // To find the server
  ],
  partials: [
    Partials.Channel, // CRITICAL: This allows the bot to see DMs
    Partials.Message, 
    Partials.User
  ]
});

// The rest of your code follows...
