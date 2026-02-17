require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');
const dns = require('dns');

// Force IPv4 for stability on Linux servers
dns.setDefaultResultOrder('ipv4first');

const client = new Client();
const TOKEN = process.env.DISCORD_TOKEN?.trim();
const USER = process.env.LASTFM_USER?.trim();
const KEY = process.env.LASTFM_API_KEY?.trim();

async function updatePresence() {
    try {
        // Build URL using params for safe encoding
        const res = await axios.get("http://ws.audioscrobbler.com/2.0/", {
            params: {
                method: "user.getrecenttracks",
                user: USER,
                api_key: KEY,
                format: "json",
                limit: 1
            },
            timeout: 15000 // Give it plenty of time to respond
        });

        const track = res.data?.recenttracks?.track?.[0];
        if (!track) return;

        if (track['@attr']?.nowplaying === 'true') {
            const pr = new RichPresence(client)
                .setApplicationId("1108588077900898414")
                .setType('LISTENING')
                .setName(track.name)
                .setDetails(track.name)
                .setState(`by ${track.artist['#text']}`)
                .setAssetsLargeImage(track.image[3]['#text'])
                .addButton('View on Last.fm', track.url);

            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] 🎵 Playing: ${track.name}`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log(`[${new Date().toLocaleTimeString()}] ⏸️ Idle.`);
        }
    } catch (err) {
        // If it's a network glitch or "INVALID_URL" ghost, just log a dot and move on
        if (err.code === 'ERR_INVALID_URL' || err.code === 'ECONNABORTED') {
            process.stdout.write('.'); // Minimal logging for network jitter
        } else {
            console.log(`\n[${new Date().toLocaleTimeString()}] 📡 Network jitter...`);
        }
    }
}

client.on('ready', () => {
    console.log(`🚀 System Online: ${client.user.tag}`);
    // Run every 30 seconds
    setInterval(updatePresence, 16000);
    updatePresence();
});

// Prevent the process from exiting on errors
process.on('unhandledRejection', (reason) => {
    // Ignore silenty to keep the container running
});

client.login(TOKEN).catch(console.error);
