require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();
const TOKEN = process.env.DISCORD_TOKEN?.trim();
const username = process.env.LASTFM_USER?.trim();
const apiKey = process.env.LASTFM_API_KEY?.trim();

// Function to fix Last.fm image URLs and ensure they have a protocol
const fixUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('//')) return `https:${url}`;
    try {
        new URL(url); // Validate string is a real URL
        return url;
    } catch {
        return null;
    }
};

async function updatePresence() {
    try {
        const apiUrl = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`;
        
        // family: 4 prevents the DNS jitter seen in earlier logs
        const response = await axios.get(apiUrl, { timeout: 15000, family: 4 });
        const data = response.data;

        if (!data.recenttracks?.track) return;

        let track = data.recenttracks.track;
        if (Array.isArray(track)) track = track[0];

        const isPlaying = track?.["@attr"]?.nowplaying === "true";

        if (isPlaying) {
            const title = track.name || "Unknown Track";
            const artist = track.artist?.["#text"] || "Unknown Artist";
            const album = track.album?.["#text"] || "Unknown Album";
            
            // Sanitize URLs to prevent the "Logic Error: INVALID_URL" crash
            const songUrl = fixUrl(track.url);
            const imageUrl = fixUrl(track.image?.[3]?.["#text"]);

            const pr = new RichPresence(client)
                .setApplicationId("1108588077900898414")
                .setType('LISTENING')
                .setName(title)
                .setDetails(title)
                .setState(`by ${artist}`)
                .setAssetsSmallImage('lastfm-small');

            if (imageUrl) pr.setAssetsLargeImage(imageUrl);
            if (album) pr.setAssetsLargeText(album);

            // Only add button if URL is absolutely valid
            if (songUrl) {
                pr.addButton('View on Last.fm', songUrl);
            }

            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Now Playing: ${title}`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log(`[${new Date().toLocaleTimeString()}] ⏸️ Idle.`);
        }
    } catch (error) {
        // Distinguish between network jitter (dots) and actual code logic errors
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
