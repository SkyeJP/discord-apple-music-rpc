require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const fetch = require('node-fetch');
const dns = require('dns');

// Force Linux to prioritize IPv4 to prevent DNS-related "INVALID_URL" errors
dns.setDefaultResultOrder('ipv4first');

const client = new Client();
const TOKEN = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : "";
const USER = process.env.LASTFM_USER ? process.env.LASTFM_USER.trim() : "";
const KEY = process.env.LASTFM_API_KEY ? process.env.LASTFM_API_KEY.trim() : "";

async function updatePresence() {
    const params = new URLSearchParams({
        method: "user.getrecenttracks",
        user: USER,
        api_key: KEY,
        format: "json",
        limit: "1"
    });

    const target = `http://ws.audioscrobbler.com/2.0/?${params.toString()}`;

    try {
        const response = await fetch(target, { timeout: 15000 });
        
        if (!response.ok) {
            console.log(`[${new Date().toLocaleTimeString()}] ⚠️ API Temporary Hiccup (${response.status})`);
            return;
        }

        const data = await response.json();
        const track = data?.recenttracks?.track?.[0] || data?.recenttracks?.track;
        
        if (!track) return;

        const isPlaying = track["@attr"]?.nowplaying === "true";

        if (isPlaying) {
            const pr = new RichPresence(client)
                .setApplicationId("1108588077900898414")
                .setType('LISTENING')
                .setName(track.name)
                .setDetails(track.name)
                .setState(`by ${track.artist['#text']}`)
                .setAssetsLargeImage(track.image[3]['#text'])
                .addButton('View on Last.fm', track.url);

            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Now Playing: ${track.name}`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log(`[${new Date().toLocaleTimeString()}] ⏸️ Idle.`);
        }
    } catch (err) {
        // Silencing the flicker if it's a known networking "INVALID_URL" ghost
        if (err.message.includes('INVALID_URL')) {
            console.log(`[${new Date().toLocaleTimeString()}] 📡 Network jitter detected, retrying in next cycle...`);
        } else {
            console.error("❌ Fetch Error:", err.message);
        }
    }
}

client.on('ready', () => {
    console.log(`🚀 System Online: ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000);
});

client.login(TOKEN).catch(err => console.error("Login Error:", err.message));
