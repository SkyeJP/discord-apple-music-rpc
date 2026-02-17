require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();
const TOKEN = process.env.DISCORD_TOKEN?.trim();
const username = process.env.LASTFM_USER?.trim();
const apiKey = process.env.LASTFM_API_KEY?.trim();

// Sanitizer: Forces protocol and validates the URL to stop the Logic Error
const validateUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    let formatted = url.trim();
    if (formatted.startsWith('//')) formatted = `https:${formatted}`;
    try {
        new URL(formatted); 
        return formatted;
    } catch {
        return null;
    }
};

async function updatePresence() {
    try {
        const apiUrl = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`;
        
        // Timeout and family:4 help with the network jitter seen in earlier logs
        const response = await axios.get(apiUrl, { timeout: 15000, family: 4 });
        const data = response.data;

        if (!data.recenttracks?.track) return;

        let track = data.recenttracks.track;
        if (Array.isArray(track)) track = track[0];

        const isPlaying = track?.["@attr"]?.nowplaying === "true";

        if (isPlaying) {
            const songUrl = validateUrl(track.url);
            const imageUrl = validateUrl(track.image?.[3]?.["#text"]);

            const pr = new RichPresence(client)
                .setApplicationId("1108588077900898414")
                .setType('LISTENING')
                .setName(track.name || "Music")
                .setDetails(track.name || "Unknown Track")
                .setState(`by ${track.artist?.["#text"] || "Unknown Artist"}`)
                .setAssetsSmallImage('lastfm-small');

            if (imageUrl) pr.setAssetsLargeImage(imageUrl);
            if (track.album?.["#text"]) pr.setAssetsLargeText(track.album["#text"]);

            // Only add button if the URL is strictly valid
            if (songUrl) {
                pr.addButton('View on Last.fm', songUrl);
            }

            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Now Playing: ${track.name}`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log(`[${new Date().toLocaleTimeString()}] ⏸️ Idle.`);
        }
    } catch (error) {
        // Logs dots for network jitter, but full errors for real logic bugs
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            process.stdout.write('.');
        } else {
            console.error(`\n[${new Date().toLocaleTimeString()}] ❌ Logic Error: ${error.message}`);
        }
    }
}

client.on('ready', () => {
    console.log(`🚀 System Online: ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000);
});

client.login(TOKEN).catch(console.error);
