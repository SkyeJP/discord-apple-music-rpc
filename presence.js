require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');

const client = new Client();
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

// Cache Spotify token
let tokenExpiration = 0;
async function getSpotifyToken() {
    if (Date.now() < tokenExpiration) return;
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    tokenExpiration = Date.now() + (data.body['expires_in'] * 1000);
}

async function getSpotifyImage(trackName, artistName) {
    try {
        await getSpotifyToken();
        const search = await spotifyApi.searchTracks(`track:${trackName} artist:${artistName}`, { limit: 1 });
        return search.body.tracks.items[0]?.album?.images[0]?.url || null;
    } catch (e) {
        console.log(`[DEBUG] Spotify search failed: ${e.message}`);
        return null;
    }
}

async function updatePresence() {
    try {
        const apiUrl = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${process.env.LASTFM_USER}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=1`;
        const response = await axios.get(apiUrl, { timeout: 10000 });
        const track = response.data?.recenttracks?.track?.[0];

        if (!track || track?.["@attr"]?.nowplaying !== "true") {
            client.user.setPresence({ activities: [] });
            console.log("⏸️ Idle.");
            return;
        }

        const title = track.name;
        const artist = track.artist["#text"];
        
        // 1. Try Spotify for high-res art, fallback to Last.fm
        let imageUrl = await getSpotifyImage(title, artist);
        if (!imageUrl) imageUrl = track.image?.[3]?.["#text"];

        const pr = new RichPresence(client)
            .setApplicationId("1108588077900898414")
            .setType('LISTENING')
            .setName('Apple Music') // Mimics "Listening to Apple Music"
            .setDetails(title)
            .setState(`by ${artist}`);

        if (imageUrl) {
            // Use mp:external to bypass Discord's proxy block
            const proxyUrl = `mp:external/${imageUrl.replace(/^https?:\/\//, "")}`;
            pr.setAssetsLargeImage(proxyUrl);
            pr.setAssetsLargeText(track.album["#text"] || "Apple Music");
            
            // 2. Corner Logo Implementation
            // 'apple-logo' must be an asset name uploaded to your Discord Dev Portal
            pr.setAssetsSmallImage('apple-logo'); 
            pr.setAssetsSmallText('Apple Music');
        }

        pr.addButton('Listen on Apple Music', track.url);

        client.user.setPresence({ activities: [pr] });
        console.log(`✅ Playing: ${title} (Spotify Art: ${imageUrl ? 'Yes' : 'No'})`);

    } catch (error) {
        console.error(`[ERROR] ${error.message}`);
    }
}

client.on('ready', () => {
    console.log(`🚀 System Online: ${client.user.tag}`);
    setInterval(updatePresence, 30000);
    updatePresence();
});

client.login(process.env.DISCORD_TOKEN);
