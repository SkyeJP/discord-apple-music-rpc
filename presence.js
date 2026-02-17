async function updatePresence() {
    try {
        // Use the params object to build the URL safely
        const res = await axios.get("https://ws.audioscrobbler.com/2.0/", {
            params: {
                method: "user.getrecenttracks",
                api_key: LASTFM_API_KEY.trim(), // .trim() removes accidental spaces
                user: LASTFM_USER.trim(),
                limit: 1,
                format: "json"
            }
        });

        const track = res.data.recenttracks.track[0];

        if (track && track['@attr'] && track['@attr'].nowplaying === 'true') {
            const pr = new RichPresence(client)
                .setApplicationId(DISCORD_APP_ID)
                .setType('LISTENING')
                .setName(track.name)
                .setDetails(track.name)
                .setState(`by ${track.artist['#text']}`)
                .setAssetsLargeImage(track.image[3]['#text'])
                .setAssetsLargeText(track.album['#text'] || "No Album")
                .setAssetsSmallImage('lastfm-small');

            client.user.setPresence({ activities: [pr] });
            console.log(`🎵 Now Playing: ${track.name}`);
        } else {
            client.user.setPresence({ activities: [] });
        }
    } catch (err) {
        // More detailed error logging
        if (err.code === 'ERR_INVALID_URL') {
            console.error("❌ The URL constructed was invalid. Check your .env values for illegal characters.");
        } else {
            console.error("Last.fm Sync Error:", err.message);
        }
    }
}
