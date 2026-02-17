require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();
const TOKEN = process.env.DISCORD_TOKEN?.trim();
const username = process.env.LASTFM_USER?.trim();
const apiKey = process.env.LASTFM_API_KEY?.trim();

async function updatePresence() {
    try {
        const apiUrl = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`;
        
        const response = await axios.get(apiUrl, { timeout: 15000, family: 4 });
        const data = response.data;

        if (!data.recenttracks?.track) return;

        let track = data.recenttracks.track;
        if (Array.isArray(track)) track = track[0];

        const isPlaying = track?.["@attr"]?.nowplaying === "true";

        if (isPlaying) {
            // Robust info gathering to prevent crashes if a field is missing
            const title = track.name || "Unknown Track";
            const artist = track.artist?.["#text"] || "Unknown Artist";
            const album = track.album?.["#text"] || "Unknown Album";
            const url = track.url || `https://www.last.fm/user/${username}`;
            const image = (track.image && track.image[3] && track.image[3]["#text"]) 
                          ? track.image[3]["#text"] 
                          : null;

            const pr = new RichPresence(client)
                .setApplicationId("1108588077900898414")
                .setType('LISTENING')
                .setName(title)
                .setDetails(title)
                .setState(`by ${artist}`)
                .setAssetsLargeImage(image)
                .setAssetsLargeText(album)
                .setAssetsSmallImage('lastfm-small');

            // Only add button if we have a valid URL string
            if (url && typeof url === 'string' && url.startsWith('http')) {
                pr.addButton('View on Last.fm', url);
            }

            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Now Playing: ${title}`);
        } else {
            // When nothing is playing, clear the status
            client.user.setPresence({ activities: [] });
            console.log(`[${new Date().toLocaleTimeString()}] ⏸️ Idle.`);
        }
    } catch (error) {
        // If it's a network glitch, just log a dot. If it's a code error, show it.
        if (error.code === 'ERR_INVALID_URL' || error.code === 'ECONNABORTED') {
            process.stdout.write('.');
        } else {
            console.error(`\n[${new Date().toLocaleTimeString()}] ❌ Logic Error:`, error.message);
        }
    }
}

client.on('ready', () => {
    console.log(`🚀 System Online: ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000);
});

client.login(TOKEN).catch(console.error);
