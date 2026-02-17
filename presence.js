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
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&api_key=${LASTFM_API_KEY}&user=${LASTFM_USER}&limit=1&format=json`;
        const res = await axios.get(url);
        const track = res.data.recenttracks.track[0];
        if (track && track['@attr'] && track['@attr'].nowplaying === 'true') {
            const trackName = track.name;
            const artistName = track.artist['#text'];
            const albumName = track.album['#text'] || "Unknown Album";
            const trackUrl = track.url;
            const imageUrl = track.image[3]['#text']; // 'extralarge' size
            const pr = new RichPresence(client)
                .setApplicationId(DISCORD_APP_ID)
                .setType('LISTENING') // Sets "Listening to..."
                .setName(trackName)
                .setDetails(trackName)
                .setState(`by ${artistName}`)
                .setAssetsLargeImage(imageUrl)
                .setAssetsLargeText(albumName)
                .setAssetsSmallImage('lastfm-small')
                .setAssetsSmallText('Apple Music via Last.fm')
                .addButton('View on Last.fm', trackUrl);
            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] 🎵 Now Listening: ${trackName} - ${artistName}`);
        } else {
            client.user.setPresence({ activities: [] });
        }
    } catch (err) {
        console.error("Last.fm Sync Error:", err.message);
    }
}
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log("Monitoring Last.fm for 'Listening to' status...");
    updatePresence();    
    setInterval(updatePresence, 30000);
});

client.login(TOKEN);
