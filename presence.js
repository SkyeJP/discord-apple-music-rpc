require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();

// Force clean all variables to remove hidden spaces or newlines
const clean = (str) => str ? str.replace(/[\r\n\t ]/g, '') : "";

const TOKEN = clean(process.env.DISCORD_TOKEN);
const LASTFM_USER = clean(process.env.LASTFM_USER);
const LASTFM_API_KEY = clean(process.env.LASTFM_API_KEY);
const DISCORD_APP_ID = clean(process.env.DISCORD_APP_ID) || "1108588077900898414";

async function updatePresence() {
    // Define the request configuration
    const config = {
        params: {
            method: "user.getrecenttracks",
            user: LASTFM_USER,
            api_key: LASTFM_API_KEY,
            format: "json",
            limit: 1
        },
        timeout: 10000
    };

    // Construct and log the URL for debugging
    const fullUrl = axios.getUri({
        method: 'get',
        url: 'http://ws.audioscrobbler.com/2.0/',
        ...config
    });
    
    console.log(`[${new Date().toLocaleTimeString()}] Fetching: ${fullUrl}`);

    try {
        const response = await axios.get(`http://ws.audioscrobbler.com/2.0/`, config);
        const data = response.data;
        
        if (!data?.recenttracks?.track) {
            console.log("⚠️ No track data found in response.");
            return;
        }

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
            console.log(`✅ Success! Now showing: ${songInfo.title}`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log("⏸️ Nothing playing currently.");
        }
    } catch (error) {
        console.error(`❌ Presence Update Error: ${error.message}`);
        // If it fails with INVALID_URL, we'll see exactly why in the "Fetching:" log above.
    }
}

client.on('ready', () => {
    console.log(`Presence system active for ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000); 
});

client.login(TOKEN).catch(err => {
    console.error("🔥 Login Failed:", err.message);
});
