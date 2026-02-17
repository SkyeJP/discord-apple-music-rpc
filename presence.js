const { Client, CustomStatus, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();

// Settings from your Vencord code
const LASTFM_API_KEY = "790c37d90400163a5a5fe00d6ca32ef0";
const LASTFM_USER = "YOUR_LASTFM_USERNAME";
const DISCORD_APP_ID = "1108588077900898414";
const TOKEN = "YOUR_DISCORD_TOKEN"; // See instructions below on how to get this

async function updatePresence() {
    try {
        const res = await axios.get(`https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&api_key=${LASTFM_API_KEY}&user=${LASTFM_USER}&limit=1&format=json`);
        const track = res.data.recenttracks.track[0];

        if (track && track['@attr'] && track['@attr'].nowplaying === 'true') {
            const pr = new RichPresence(client)
                .setApplicationId(DISCORD_APP_ID)
                .setType('LISTENING') // This makes it "Listening to..."
                .setName(track.name)
                .setDetails(track.name)
                .setState(`by ${track.artist['#text']}`)
                .setAssetsLargeImage(track.image[3]['#text']) // Get the large image
                .setAssetsLargeText(track.album['#text'] || "Unknown Album")
                .setAssetsSmallImage('lastfm-small') // Keep the original icon key
                .addButton('Listen on Last.fm', track.url);

            client.user.setPresence({ activities: [pr] });
            console.log(`Updated: ${track.name} by ${track.artist['#text']}`);
        } else {
            // Clear status if not playing anything
            client.user.setPresence({ activities: [] });
        }
    } catch (err) {
        console.error("Error fetching Last.fm:", err.message);
    }
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    updatePresence();
    setInterval(updatePresence, 30000); // Check every 30 seconds
});

client.login(TOKEN);
