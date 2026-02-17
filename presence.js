require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();

// Aggressively strip EVERYTHING that isn't a standard character
const clean = (str) => str ? str.replace(/[^a-zA-Z0-9_.-]/g, '') : "";

const TOKEN = process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.trim() : ""; // Token needs to keep its dots/dashes
const LASTFM_USER = clean(process.env.LASTFM_USER);
const LASTFM_API_KEY = clean(process.env.LASTFM_API_KEY);
const DISCORD_APP_ID = clean(process.env.DISCORD_APP_ID) || "1108588077900898414";

async function updatePresence() {
    try {
        // Build URL via object to avoid string concatenation issues
        const url = new URL("http://ws.audioscrobbler.com/2.0/");
        url.searchParams.append("method", "user.getrecenttracks");
        url.searchParams.append("user", LASTFM_USER);
        url.searchParams.append("api_key", LASTFM_API_KEY);
        url.searchParams.append("format", "json");
        url.searchParams.append("limit", "1");

        console.log(`[${new Date().toLocaleTimeString()}] Fetching: ${url.href}`);

        const response = await axios.get(url.href, { timeout: 10000 });
        const data = response.data;
        
        if (!data?.recenttracks?.track) return;

        let track = data.recenttracks.track;
        const isPlaying = Array.isArray(track)
            ? track[0]?.["@attr"]?.nowplaying === "true"
            : track?.["@attr"]?.nowplaying === "true";

        if (isPlaying) {
            if (Array.isArray(track)) track = track[0];

            const songInfo = {
                title: track.name,
                artist: track.artist?.["#text"] || "Unknown Artist",
                album: track.album?.["#text"] || "Unknown Album",
                trackUrl: track.url,
                image: track.image[3]?.["#text"] || null,
            };

            const pr = new RichPresence(client)
                .setApplicationId(DISCORD_APP_ID)
                .setType('LISTENING')
                .setName(songInfo.title)
                .setDetails(songInfo.title)
                .setState(`by ${songInfo.artist}`)
                .setAssetsLargeImage(songInfo.image)
                .setAssetsLargeText(songInfo.album)
                .setAssetsSmallImage('lastfm-small')
                .addButton('View on Last.fm', songInfo.trackUrl);

            client.user.setPresence({ activities: [pr] });
            console.log(`✅ Update Successful: ${songInfo.title}`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log("⏸️ Idle (Nothing playing).");
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

client.on('ready', () => {
    console.log(`Presence system active for ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000); 
});

client.login(TOKEN).catch(err => console.error("Login Failed:", err.message));
