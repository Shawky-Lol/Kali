import axios from 'axios';

export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing "code" in query');

  try {
    // Get access token from Discord
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.REDIRECT_URI
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const access_token = tokenRes.data.access_token;

    // Get user info from Discord
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const user = userRes.data;
    console.log("✅ Verified user:", user);

    // Redirect to success page
    return res.redirect('/success.html');
  } catch (err) {
    console.error("❌ Error verifying Discord user:", err?.response?.data || err.message);
    return res.status(500).send("OAuth2 verification failed");
  }
}
