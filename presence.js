require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();

// Using .trim() to ensure no hidden Linux/Docker characters break the string
const TOKEN = process.env.DISCORD_TOKEN?.trim();
const username = process.env.LASTFM_USER?.trim();
const apiKey = process.env.LASTFM_API_KEY?.trim();

async function updatePresence() {
    try {
        // EXACT URL construction from Giffmate Utilities
        const apiUrl = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`;
        
        const response = await axios.get(apiUrl);
        const data = response.data;

        if (!data.recenttracks || !data.recenttracks.track) return;

        let track = data.recenttracks.track;
        
        // EXACT isPlaying logic from Giffmate Utilities
        const isPlaying = Array.isArray(track)
          ? track[0]?.["@attr"]?.nowplaying || false
          : track?.["@attr"]?.nowplaying || false;

        if (isPlaying === "true") {
            if (Array.isArray(track)) track = track[0];

            const songInfo = {
                title: track.name,
                artist: track.artist?.["#text"] || "Unknown Artist",
                album: track.album?.["#text"] || "Unknown Album",
                trackUrl: track.url,
                image: track.image[3]["#text"] || null,
            };

            const pr = new RichPresence(client)
                .setApplicationId("1108588077900898414")
                .setType('LISTENING')
                .setName(songInfo.title)
                .setDetails(songInfo.title)
                .setState(`by ${songInfo.artist}`)
                .setAssetsLargeImage(songInfo.image)
                .setAssetsLargeText(songInfo.album)
                .setAssetsSmallImage('lastfm-small')
                .addButton('View on Last.fm', songInfo.trackUrl);

            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Now Playing: ${songInfo.title}`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log(`[${new Date().toLocaleTimeString()}] ⏸️ Idle.`);
        }
    } catch (error) {
        // Log the specific axios error details like the utility bot
        if (error.response) {
            console.log(`Last.fm API Error: ${error.response.status}`);
        } else {
            // Silencing the 'INVALID_URL' ghost to let it retry next cycle
            process.stdout.write('.'); 
        }
    }
}

client.on('ready', () => {
    console.log(`🚀 System Online: ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000);
});

client.login(TOKEN).catch(console.error);
