require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();
const TOKEN = process.env.DISCORD_TOKEN?.trim();
const username = process.env.LASTFM_USER?.trim();
const apiKey = process.env.LASTFM_API_KEY?.trim();

// Helper to fix Last.fm image protocols and prevent INVALID_URL crashes
const sanitizeImageUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    let cleanUrl = url.trim();
    if (cleanUrl.startsWith('//')) cleanUrl = `https:${cleanUrl}`;
    return cleanUrl.replace('http:', 'https:');
};

async function updatePresence() {
    console.log(`\n[${new Date().toLocaleTimeString()}] --- Starting Update Cycle ---`);
    
    try {
        const apiUrl = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`;
        console.log(`[DEBUG] Fetching from Last.fm...`);
        
        const response = await axios.get(apiUrl, { timeout: 15000, family: 4 });
        const track = response.data?.recenttracks?.track?.[0] || response.data?.recenttracks?.track;

        if (!track) {
            console.log(`[DEBUG] No track data found.`);
            return;
        }

        const isPlaying = track?.["@attr"]?.nowplaying === "true";
        console.log(`[DEBUG] Status: ${isPlaying ? "Playing" : "Idle"}`);

        if (isPlaying) {
            const pr = new RichPresence(client).setApplicationId("1108588077900898414");

            // 1. Text Fields
            pr.setType('LISTENING');
            pr.setName(track.name || "Music");
            pr.setDetails(track.name || "Unknown Track");
            pr.setState(`by ${track.artist?.["#text"] || "Unknown Artist"}`);

            // 2. Image Handling with Sanitization
            const rawImg = track.image?.[3]?.["#text"];
            const cleanImg = sanitizeImageUrl(rawImg);
            
            if (cleanImg) {
                try {
                    pr.setAssetsLargeImage(cleanImg);
                    console.log(`[DEBUG] Image set: ${cleanImg}`);
                } catch (e) {
                    console.log(`[ERROR] Library rejected Image URL: ${e.message}`);
                }
            }
            
            if (track.album?.["#text"]) pr.setAssetsLargeText(track.album["#text"]);
            pr.setAssetsSmallImage('lastfm-small');

            // 3. Button Handling
            if (track.url && track.url.startsWith('http')) {
                pr.addButton('View on Last.fm', track.url);
            }

            // Apply Presence
            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Presence Updated!`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log(`[${new Date().toLocaleTimeString()}] ⏸️ Idle - Presence Cleared.`);
        }
    } catch (error) {
        // Silencing common network timeouts to keep logs clean
        if (error.code === 'ECONNABORTED') {
            console.log(`[DEBUG] Last.fm request timed out. Retrying next cycle.`);
        } else {
            console.error(`[CRITICAL ERROR] ${error.message}`);
        }
    }
}

client.on('ready', () => {
    console.log(`🚀 System Online: ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000);
});

client.login(TOKEN).catch(err => console.error("Login Failed:", err.message));
