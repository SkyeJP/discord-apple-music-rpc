require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();

// This function strips EVERYTHING except basic alphanumeric characters
const superClean = (str) => str ? str.replace(/[^a-zA-Z0-9]/g, '') : "";

const TOKEN = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : "";
const LASTFM_USER = superClean(process.env.LASTFM_USER);
const LASTFM_API_KEY = superClean(process.env.LASTFM_API_KEY);
const DISCORD_APP_ID = superClean(process.env.DISCORD_APP_ID) || "1108588077900898414";

async function updatePresence() {
    try {
        // Build the URL using the native class to ensure it's valid from the start
        const apiURL = new URL("http://ws.audioscrobbler.com/2.0/");
        apiURL.searchParams.set("method", "user.getrecenttracks");
        apiURL.searchParams.set("user", LASTFM_USER);
        apiURL.searchParams.set("api_key", LASTFM_API_KEY);
        apiURL.searchParams.set("format", "json");
        apiURL.searchParams.set("limit", "1");

        // Use the href directly from the validated URL object
        const response = await axios.get(apiURL.href, { timeout: 10000 });
        
        const track = response.data?.recenttracks?.track;
        if (!track) return;

        const currentTrack = Array.isArray(track) ? track[0] : track;
        const isPlaying = currentTrack?.["@attr"]?.nowplaying === "true";

        if (isPlaying) {
            const pr = new RichPresence(client)
                .setApplicationId(DISCORD_APP_ID)
                .setType('LISTENING')
                .setName(currentTrack.name)
                .setDetails(currentTrack.name)
                .setState(`by ${currentTrack.artist?.["#text"] || "Unknown"}`)
                .setAssetsLargeImage(currentTrack.image[3]?.["#text"])
                .setAssetsSmallImage('lastfm-small')
                .addButton('View on Last.fm', currentTrack.url);

            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Playing: ${currentTrack.name}`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log(`[${new Date().toLocaleTimeString()}] ⏸️ Idle`);
        }
    } catch (error) {
        console.error("❌ Request Failed:", error.message);
        // If this still says INVALID_URL, the issue is your Docker Network/DNS
    }
}

client.on('ready', () => {
    console.log(`System Online: ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000);
});

client.login(TOKEN).catch(err => console.error("Login Error:", err.message));
