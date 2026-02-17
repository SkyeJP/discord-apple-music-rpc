require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');
const SpotifyWebApi = require('spotify-web-api-node');

const client = new Client();
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

// The placeholder hash identified in the Vencord source
const LASTFM_PLACEHOLDER_HASH = "2a96cbd8b46e442fc41c2b86b821562f";

async function updatePresence() {
    try {
        const apiUrl = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${process.env.LASTFM_USER}&api_key=${process.env.LASTFM_API_KEY}&format=json&limit=1`;
        const response = await axios.get(apiUrl, { timeout: 10000 });
        const track = response.data?.recenttracks?.track?.[0];

        if (!track || track?.["@attr"]?.nowplaying !== "true") {
            client.user.setPresence({ activities: [] });
            return;
        }

        const title = track.name;
        const artist = track.artist["#text"];
        const lfmImg = track.image?.find(x => x.size === "large")?.["#text"];

        // Vencord-style logic: Check if image is just the Last.fm placeholder
        const hasRealArt = lfmImg && !lfmImg.includes(LASTFM_PLACEHOLDER_HASH);

        let finalImageUrl = null;
        if (!hasRealArt) {
            // If Last.fm has no art, definitely use Spotify
            finalImageUrl = await getSpotifyImage(title, artist);
        } else {
            finalImageUrl = lfmImg;
        }

        const pr = new RichPresence(client)
            .setApplicationId("1108588077900898414")
            .setType('LISTENING')
            .setName('Apple Music')
            .setDetails(title)
            .setState(`by ${artist}`);

        if (finalImageUrl) {
            // Using the proxy fix we discovered
            const cleanUrl = finalImageUrl.replace(/^https?:\/\//, "");
            pr.setAssetsLargeImage(`mp:external/${cleanUrl}`);
            pr.setAssetsSmallImage('apple-logo'); // Matches Vencord's small_image logic
        }

        pr.addButton('Listen on Apple Music', track.url);

        client.user.setPresence({ activities: [pr] });
        console.log(`✅ Now Playing: ${title}`);
    } catch (error) {
        console.error("Presence Update Failed:", error.message);
    }
}

// ... (rest of your Spotify and Login logic)
