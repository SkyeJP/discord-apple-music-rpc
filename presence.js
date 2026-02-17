require('dotenv').config();
const { Client, RichPresence } = require('discord.js-selfbot-v13');
const axios = require('axios');

const client = new Client();
const TOKEN = process.env.DISCORD_TOKEN?.trim();
const username = process.env.LASTFM_USER?.trim();
const apiKey = process.env.LASTFM_API_KEY?.trim();

async function updatePresence() {
    console.log(`\n[${new Date().toLocaleTimeString()}] --- Starting Update Cycle ---`);
    
    try {
        const apiUrl = `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apiKey}&format=json&limit=1`;
        
        const response = await axios.get(apiUrl, { timeout: 15000, family: 4 });
        const track = response.data?.recenttracks?.track?.[0] || response.data?.recenttracks?.track;

        if (!track) return;

        const isPlaying = track?.["@attr"]?.nowplaying === "true";

        if (isPlaying) {
            const pr = new RichPresence(client).setApplicationId("1108588077900898414");

            pr.setType('LISTENING');
            pr.setName(track.name || "Music");
            pr.setDetails(track.name || "Unknown Track");
            pr.setState(`by ${track.artist?.["#text"] || "Unknown Artist"}`);

            // IMAGE FIX: Use the 'mp:' prefix or 'external' proxying 
            // This bypasses the INVALID_URL check that rejected the raw fastly link
            const rawImg = track.image?.[3]?.["#text"];
            if (rawImg && rawImg.includes('http')) {
                try {
                    // We strip the protocol and use the Discord external proxy format
                    const proxyImg = `mp:external/${rawImg.replace(/^https?:\/\//, "")}`;
                    pr.setAssetsLargeImage(proxyImg);
                    console.log(`[DEBUG] Proxy Image Set: ${proxyImg}`);
                } catch (e) {
                    // Fallback to raw if proxy fails
                    pr.setAssetsLargeImage(rawImg.replace('http:', 'https:'));
                }
            }

            if (track.album?.["#text"]) pr.setAssetsLargeText(track.album["#text"]);
            pr.setAssetsSmallImage('lastfm-small');

            if (track.url && track.url.startsWith('http')) {
                pr.addButton('View on Last.fm', track.url);
            }

            client.user.setPresence({ activities: [pr] });
            console.log(`[${new Date().toLocaleTimeString()}] ✅ Presence Updated!`);
        } else {
            client.user.setPresence({ activities: [] });
            console.log(`[${new Date().toLocaleTimeString()}] ⏸️ Idle.`);
        }
    } catch (error) {
        console.error(`[ERROR] Cycle failed: ${error.message}`);
    }
}

client.on('ready', () => {
    console.log(`🚀 System Online: ${client.user.tag}`);
    updatePresence();
    setInterval(updatePresence, 30000);
});

client.login(TOKEN).catch(err => console.error("Login Failed:", err.message));
