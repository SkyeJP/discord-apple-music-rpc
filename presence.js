require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');

const client = new Client();

// 1. Setup Spotify API
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID?.trim(),
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET?.trim()
});

let tokenExpiration = 0;

// 2. Function to get high-quality art from Spotify
async function getSpotifyImage(trackName, artistName) {
    try {
        if (Date.now() > tokenExpiration) {
            const data = await spotifyApi.clientCredentialsGrant();
            spotifyApi.setAccessToken(data.body['access_token']);
            tokenExpiration = Date.now() + (data.body['expires_in'] * 1000);
        }
        const search = await spotifyApi.searchTracks(`track:${trackName} artist:${artistName}`, { limit: 1 });
        return search.body.tracks.items[0]?.album?.images[0]?.url || null;
    } catch (e) {
        console.log(`[DEBUG] Spotify lookup failed (usually bad credentials): ${e.message}`);
        return null;
    }
}

// 3. Main Presence Logic
async function updatePresence() {
    try {
        const url = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${process.env.LASTFM_USER}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=1`;
        const res = await axios.get(url);
        const track = res.data?.recenttracks?.track?.[0];

        if (!track || track?.["@attr"]?.nowplaying !== "true") {
            client.user.setPresence({ activities: [] });
            return;
        }

        const title = track.name;
        const artist = track.artist["#text"];
        
        // 1. Get the Raw Image URL
        let rawImg = await getSpotifyImage(title, artist);
        if (!rawImg) rawImg = track.image?.find(i => i.size === "extralarge")?.["#text"];

        // 2. Build Activity Object Manually
        const activity = {
            applicationId: "1108588077900898414",
            type: 'LISTENING',
            name: 'Apple Music',
            details: title,
            state: `by ${artist}`,
            assets: {
                largeText: track.album["#text"] || "Apple Music",
                // Only set assets if we have a valid image
                ...(rawImg && { 
                    largeImage: `mp:external/${rawImg.replace(/^https?:\/\//, "")}`
                })
            },
            buttons: track.url ? [{ label: 'Listen on Apple Music', url: track.url }] : []
        };

        // 3. Update Presence
        client.user.setPresence({ activities: [activity] });
        console.log(`✅ Final Attempt: ${title} | Img: ${rawImg ? "YES" : "NO"}`);

    } catch (error) {
        console.log(`[ERROR] ${error.message}`);
    }
}

// 4. Start the Bot
client.on('ready', () => {
    console.log(`🚀 System Online: ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000); // Update every 30 seconds
});

// 5. Critical Login Block (The part that was cut off!)
const TOKEN = process.env.DISCORD_TOKEN?.trim();
if (!TOKEN) {
    console.error("FATAL: DISCORD_TOKEN is missing!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("CRITICAL: Login failed!", err.message);
    process.exit(1);
});
