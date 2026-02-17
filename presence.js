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
        const res = await axios.get("http://ws.audioscrobbler.com/2.0/", {
            params: {
                method: "user.getrecenttracks",
                user: LASTFM_USER.trim(),
                api_key: LASTFM_API_KEY.trim(),
                format: "json",
                limit: 1
            }
        });

        const data = res.data;
        if (!data.recenttracks || !data.recenttracks.track) return;

        let track = data.recenttracks.track;
        
        // Handle both Array and Object responses (from your bot logic)
        const isPlaying = Array.isArray(track)
            ? track[0]?.["@attr"]?.nowplaying === "true"
            : track?.["@attr"]?.nowplaying === "true";

        if (isPlaying) {
            // Normalize track object
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
            console.log(`[${new Date().toLocaleTimeString()}] 🎵 Now Listening: ${songInfo.title} by ${songInfo.artist}`);
        } else {
            // Clear presence if not playing
            client.user.setPresence({ activities: [] });
        }
    } catch (err) {
        console.error("Presence Update Error:", err.message);
    }
}

client.on('ready', () => {
    console.log(`Presence system active for ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000); 
});

client.login(TOKEN);
