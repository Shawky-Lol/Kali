// api/auth/discord/redirect.js
import axios from 'axios';
import qs from 'qs';

// Simple in-memory storage for now (will reset on redeploy)
let users = {};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = req.query.code;
  if (!code) {
    return res.status(400).send('❌ No code provided');
  }

  try {
    console.log('🔄 Starting OAuth flow...');
    
    // Exchange code for access token
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', 
      qs.stringify({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.REDIRECT_URI,
      }), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const access_token = tokenRes.data.access_token;
    console.log('✅ Got access token');

    // Get user info
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const user = userRes.data;
    console.log(`👤 User: ${user.username}`);
    
    // Store user data in memory
    users[user.id] = {
      access_token,
      username: `${user.username}${user.discriminator ? '#' + user.discriminator : ''}`,
      global_name: user.global_name,
      avatar: user.avatar,
      timestamp: new Date().toISOString()
    };

    console.log(`💾 Stored user ${user.username} (Total: ${Object.keys(users).length})`);

    // Send success response with red theme
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Discord Authentication</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white; 
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: rgba(220, 38, 38, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(220, 38, 38, 0.3);
            max-width: 500px;
          }
          .success { 
            background: linear-gradient(45deg, #22c55e, #16a34a);
            padding: 25px; 
            border-radius: 15px; 
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }
          .user-info {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 15px 0;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            display: block;
            filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.5));
          }
          h2 {
            margin: 0 0 15px 0;
            font-size: 1.8rem;
          }
          p {
            margin: 8px 0;
            line-height: 1.4;
          }
          .close-timer {
            background: rgba(255, 255, 255, 0.1);
            padding: 10px;
            border-radius: 5px;
            margin-top: 15px;
            font-size: 0.9rem;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="Exceptional.png" alt="EXCEPTIONAL Logo" class="logo" />
          <div class="success">
            <h2>✅ Authentication Successful!</h2>
            <div class="user-info">
              <p><strong>Welcome:</strong> ${user.global_name || user.username}</p>
              <p><strong>Discord Tag:</strong> ${user.username}${user.discriminator ? '#' + user.discriminator : ''}</p>
              <p><strong>User ID:</strong> ${user.id}</p>
            </div>
            <p>🎉 You've been successfully verified!</p>
            <div class="close-timer">
              This window will close automatically in <span id="countdown">5</span> seconds...
            </div>
          </div>
        </div>
        
        <!-- Enhanced auto-close with countdown -->
        <script>
          let timeLeft = 5;
          const countdownElement = document.getElementById('countdown');
          
          const timer = setInterval(() => {
            timeLeft--;
            countdownElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
              clearInterval(timer);
              window.close();
              // Fallback if window.close() doesn't work
              document.body.innerHTML = '<div style="text-align: center; padding: 50px; color: white;"><h2>✅ You can now close this tab</h2></div>';
            }
          }, 1000);
        </script>
      </body>
      </html>
    `);

    // Optional: Trigger Discord webhook to notify about new authentication
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await axios.post(process.env.DISCORD_WEBHOOK_URL, {
          embeds: [{
            title: "🔐 New User Authenticated",
            description: `**${user.global_name || user.username}** (${user.username}${user.discriminator ? '#' + user.discriminator : ''}) has been verified!`,
            color: 0xdc2626, // Red color to match theme
            timestamp: new Date().toISOString(),
            thumbnail: {
              url: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null
            },
            fields: [
              { name: "User ID", value: user.id, inline: true },
              { name: "Total Verified", value: Object.keys(users).length.toString(), inline: true },
              { name: "Timestamp", value: new Date().toLocaleString(), inline: true }
            ]
          }]
        });
        console.log('📡 Webhook notification sent');
      } catch (webhookError) {
        console.error('⚠️ Webhook error:', webhookError.message);
      }
    }

  } catch (err) {
    console.error('❌ OAuth Error:', err.response?.data || err.message);
    
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Error</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            text-align: center; 
            padding: 50px; 
            background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
            color: white; 
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            background: rgba(220, 38, 38, 0.15);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(220, 38, 38, 0.3);
            max-width: 500px;
          }
          .error { 
            background: linear-gradient(45deg, #ef4444, #dc2626);
            padding: 25px; 
            border-radius: 15px; 
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }
          .logo {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            display: block;
            filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.5));
          }
          .retry-btn {
            display: inline-block;
            background: linear-gradient(45deg, #22c55e, #16a34a);
            color: white;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 25px;
            margin-top: 15px;
            transition: transform 0.2s ease;
          }
          .retry-btn:hover {
            transform: translateY(-2px);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="/Exceptional.png" alt="EXCEPTIONAL Logo" class="logo" />
          <div class="error">
            <h2>❌ Authentication Failed</h2>
            <p>There was an error processing your Discord authentication.</p>
            <p>This might be due to:</p>
            <ul style="text-align: left; margin: 15px 0;">
              <li>Invalid authorization code</li>
              <li>Expired session</li>
              <li>Server configuration issue</li>
            </ul>
            <a href="/" class="retry-btn">🔄 Try Again</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }
}


export { users };