require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();

// Cleaning utility
const clean = (str) => str ? str.replace(/[^a-zA-Z0-9_.-]/g, '') : "";

const TOKEN = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : "";
const LASTFM_USER = clean(process.env.LASTFM_USER);
const LASTFM_API_KEY = clean(process.env.LASTFM_API_KEY);
const DISCORD_APP_ID = clean(process.env.DISCORD_APP_ID) || "1108588077900898414";

async function updatePresence() {
    // Manually defined URL - No variables inside the string to test if it's a parsing error
    const base = "http://ws.audioscrobbler.com/2.0/";
    
    try {
        console.log(`[${new Date().toLocaleTimeString()}] Fetching for user: ${LASTFM_USER}`);

        const response = await axios({
            method: 'get',
            url: base,
            // Using the 'params' object is the safest way to avoid INVALID_URL
            params: {
                method: "user.getrecenttracks",
                user: LASTFM_USER,
                api_key: LASTFM_API_KEY,
                format: "json",
                limit: 1
            },
            timeout: 15000
        });

        const data = response.data;
        if (!data?.recenttracks?.track) return;

        let track = data.recenttracks.track;
        const isPlaying = Array.isArray(track)
            ? track[0]?.["@attr"]?.nowplaying === "true"
            : track?.["@attr"]?.nowplaying === "true";

        if (isPlaying) {
            if (Array.isArray(track)) track = track[0];

            const pr = new RichPresence(client)
                .setApplicationId(DISCORD_APP_ID)
                .setType('LISTENING')
                .setName(track.name)
                .setDetails(track.name)
                .setState(`by ${track.artist?.["#text"] || "Unknown"}`)
                .setAssetsLargeImage(track.image[3]?.["#text"])
                .setAssetsSmallImage('lastfm-small')
                .addButton('View on Last.fm', track.url);

            client.user.setPresence({ activities: [pr] });
            console.log(`✅ Success: ${track.name}`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log("⏸️ Idle.");
        }
    } catch (error) {
        // This will print the exact URL that AXIOS tried to use
        if (error.config) {
            console.error("❌ Failed URL:", axios.getUri(error.config));
        }
        console.error("❌ Error Type:", error.code);
        console.error("❌ Message:", error.message);
    }
}

client.on('ready', () => {
    console.log(`System Online: ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000);
});

client.login(TOKEN).catch(err => console.error("Login Error:", err.message));
