require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();
const TOKEN = process.env.DISCORD_TOKEN?.trim();
const username = process.env.LASTFM_USER?.trim();
const apiKey = process.env.LASTFM_API_KEY?.trim();

async function updatePresence() {
    console.log(`\n[${new Date().toLocaleTimeString()}] --- Starting Update Cycle ---`);
    
    try {
        const apiUrl = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`;
        console.log(`[DEBUG] Fetching from Last.fm...`);
        
        const response = await axios.get(apiUrl, { timeout: 15000, family: 4 });
        const track = response.data?.recenttracks?.track?.[0] || response.data?.recenttracks?.track;

        if (!track) {
            console.log(`[DEBUG] No track data found in response.`);
            return;
        }

        const isPlaying = track?.["@attr"]?.nowplaying === "true";
        console.log(`[DEBUG] Status: ${isPlaying ? "Playing" : "Idle"}`);

        if (isPlaying) {
            console.log(`[DEBUG] Raw Track Name: "${track.name}"`);
            console.log(`[DEBUG] Raw Artist: "${track.artist?.["#text"]}"`);
            console.log(`[DEBUG] Raw Album: "${track.album?.["#text"]}"`);
            console.log(`[DEBUG] Raw Image URL: "${track.image?.[3]?.["#text"]}"`);
            console.log(`[DEBUG] Raw Track URL: "${track.url}"`);

            // Creating presence object
            const pr = new RichPresence(client).setApplicationId("1108588077900898414");

            // Step-by-step building with individual try/catch to find the killer field
            try {
                pr.setType('LISTENING');
                pr.setName(track.name || "Music");
                pr.setDetails(track.name || "Unknown");
                pr.setState(`by ${track.artist?.["#text"] || "Unknown"}`);
                console.log(`[DEBUG] Text fields set successfully.`);
            } catch (e) { console.log(`[ERROR] Failed setting text fields: ${e.message}`); }

            try {
                const img = track.image?.[3]?.["#text"];
                if (img && img.includes('http')) {
                    pr.setAssetsLargeImage(img);
                    console.log(`[DEBUG] Image set successfully.`);
                }
            } catch (e) { console.log(`[ERROR] Failed setting Image: ${e.message}`); }

            try {
                if (track.url && track.url.startsWith('http')) {
                    pr.addButton('View on Last.fm', track.url);
                    console.log(`[DEBUG] Button set successfully.`);
                }
            } catch (e) { console.log(`[ERROR] Failed setting Button: ${e.message}`); }

            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Presence Updated!`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log(`[${new Date().toLocaleTimeString()}] ⏸️ Idle - Presence Cleared.`);
        }
    } catch (error) {
        console.error(`[CRITICAL ERROR] ${error.stack || error.message}`);
    }
}

client.on('ready', () => {
    console.log(`🚀 System Online: ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000);
});

client.login(TOKEN).catch(err => console.error("Login Failed:", err.message));
