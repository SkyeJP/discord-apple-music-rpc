require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const fetch = require('node-fetch'); // Switched to node-fetch

const client = new Client();

const TOKEN = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : "";
const LASTFM_USER = process.env.LASTFM_USER ? process.env.LASTFM_USER.trim() : "";
const LASTFM_API_KEY = process.env.LASTFM_API_KEY ? process.env.LASTFM_API_KEY.trim() : "";
const DISCORD_APP_ID = process.env.DISCORD_APP_ID || "1108588077900898414";

async function updatePresence() {
    try {
        // Construct the URL using pure objects to bypass string parsing errors
        const params = new URLSearchParams();
        params.append("method", "user.getrecenttracks");
        params.append("user", LASTFM_USER);
        params.append("api_key", LASTFM_API_KEY);
        params.append("format", "json");
        params.append("limit", "1");

        const targetUrl = `http://ws.audioscrobbler.com/2.0/?${params.toString()}`;
        
        // Log it so we can verify there are no hidden %0D (carriage returns)
        console.log(`[${new Date().toLocaleTimeString()}] Requesting: ${targetUrl}`);

        const response = await fetch(targetUrl, { timeout: 10000 });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const track = data?.recenttracks?.track;
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
            console.log(`✅ Success: ${currentTrack.name}`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log("⏸️ Idle.");
        }
    } catch (error) {
        console.error("❌ Process Error:", error.message);
    }
}

client.on('ready', () => {
    console.log(`System Online: ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000);
});

client.login(TOKEN).catch(err => console.error("Login Error:", err.message));
