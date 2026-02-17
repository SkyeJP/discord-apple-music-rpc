require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();

const TOKEN = process.env.DISCORD_TOKEN;
const LASTFM_USER = process.env.LASTFM_USER;
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const DISCORD_APP_ID = process.env.DISCORD_APP_ID || "1108588077900898414";

async function updatePresence() {
    try {
        // We use 'params' so Axios builds the URL for us, avoiding INVALID_URL errors.
        const response = await axios.get(`http://ws.audioscrobbler.com/2.0/`, {
            params: {
                method: "user.getrecenttracks",
                user: LASTFM_USER.trim(), // Strips accidental spaces from .env
                api_key: LASTFM_API_KEY.trim(),
                format: "json",
                limit: 1
            }
        });

        const data = response.data;
        if (!data.recenttracks || !data.recenttracks.track) return;

        let track = data.recenttracks.track;
        
        // Inspired by your bot: Handle both Array and Object responses
        const isPlaying = Array.isArray(track)
            ? track[0]?.["@attr"]?.nowplaying === "true"
            : track?.["@attr"]?.nowplaying === "true";

        if (isPlaying) {
            // Normalize track object if it's an array
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
                .setAssetsSmallText('Apple Music via Last.fm')
                .addButton('View on Last.fm', songInfo.trackUrl);

            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] 🎵 Now Listening: ${songInfo.title}`);
        } else {
            // Clear presence if nothing is playing
            client.user.setPresence({ activities: [] });
        }
    } catch (error) {
        // Detailed logging to catch why the URL might be failing
        if (error.code === 'ERR_INVALID_URL') {
            console.error("❌ Presence Update Error: INVALID_URL. Check if LASTFM_USER or API_KEY are empty.");
        } else {
            console.error("Presence Update Error:", error.message);
        }
    }
}

client.on('ready', () => {
    console.log(`Presence system active for ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000); 
});

client.login(TOKEN);
