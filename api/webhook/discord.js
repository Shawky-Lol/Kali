
import axios from 'axios';
import { users } from '../auth/discord/redirect.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook signature (recommended for security)
  // You can implement Discord webhook verification here

  const { type, data, member, guild_id } = req.body;

  // Handle slash commands or other interactions
  if (type === 1) { // PING
    return res.json({ type: 1 });
  }

  if (type === 2) { // APPLICATION_COMMAND
    const { name } = data;

    if (name === 'pull') {
      // Check if user is authorized (same user ID from your old code)
      if (member?.user?.id !== '1329967952820310058') {
        return res.json({
          type: 4,
          data: {
            content: '❌ You are not authorized to use this command.',
            flags: 64 // Ephemeral
          }
        });
      }

      const result = [];
      const userEntries = Object.entries(users);

      if (userEntries.length === 0) {
        return res.json({
          type: 4,
          data: {
            content: '⚠️ No users to pull.'
          }
        });
      }

      for (const [userId, { access_token, username }] of userEntries) {
        try {
          await axios.put(`https://discord.com/api/guilds/${guild_id}/members/${userId}`, {
            access_token,
          }, {
            headers: {
              Authorization: `Bot ${process.env.BOT_TOKEN}`,
              'Content-Type': 'application/json',
            },
          });
          result.push(`✅ Pulled ${username}`);
        } catch (err) {
          console.error(`Error pulling ${username}:`, err.response?.data || err.message);
          result.push(`❌ Failed to pull ${username}`);
        }
      }

      return res.json({
        type: 4,
        data: {
          content: result.join('\n') || '⚠️ No users to pull.'
        }
      });
    }

    if (name === 'stats') {
      return res.json({
        type: 4,
        data: {
          embeds: [{
            title: '📊 Authentication Stats',
            description: `Total verified users: **${Object.keys(users).length}**`,
            color: 0x5865f2,
            fields: Object.keys(users).length > 0 ? Object.entries(users).slice(0, 10).map(([id, data]) => ({
              name: data.username,
              value: `ID: ${id}`,
              inline: true
            })) : [{
              name: 'No users',
              value: 'No one has verified yet.',
              inline: false
            }],
            timestamp: new Date().toISOString()
          }]
        }
      });
    }
  }

  return res.status(400).json({ error: 'Unknown interaction' });
}