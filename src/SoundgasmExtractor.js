const { BaseExtractor, Track } = require("discord-player");
const { parse } = require("node-html-parser");

class SoundgasmExtractor extends BaseExtractor {
    static identifier = "com.itsmaat.discord-player.soundgasm-extractor";

    // Activate the extractor
    async activate() {
        this.protocols = ["soundgasm"]; // Registers the protocol
    }

    // Deactivate the extractor
    async deactivate() {
        this.protocols = []; // Removes the protocol
    }

    // Validates the query to ensure it's a Soundgasm URL
    async validate(query) {
        const regex = /^https:\/\/soundgasm\.net\/.*$/;
        return regex.test(query);
    }

    // Handles search queries and returns metadata
    async handle(query) {
        const pageData = await this.fetchSoundgasmPage(query);
        if (!pageData) throw new Error("Unable to fetch Soundgasm page");

        const { audioUrl, metadata } = this.extractDataFromPage(pageData);
        if (!audioUrl || !metadata) throw new Error("Unable to extract necessary data");

        const trackObj = {
            title: metadata.title,
            author: metadata.author,
            url: query,
            duration: metadata.duration,
            thumbnail: metadata.thumbnail,
            description: metadata.description,
            requestedBy: null, // This can be set based on your bot's context
            raw: { stream: audioUrl },
        };

        const track = new Track(this.context.player, trackObj);

        return this.createResponse(null, [track]);
    }

    // Streams the audio URL
    async stream(track) {
        return track.raw.stream;
    }

    // Retrieves related tracks (optional, you can improve this based on Soundgasm's structure)
    async getRelatedTracks(track) {
        return this.createResponse(null, []); // No related tracks for now
    }

    // Fetches the Soundgasm page HTML
    async fetchSoundgasmPage(link) {
        try {
            const response = await fetch(link);
            return await response.text();
        } catch (error) {
            console.error("Failed to fetch Soundgasm page:", error);
            return null;
        }
    }

    // Extracts audio URL and metadata from the Soundgasm page
    extractDataFromPage(html) {
        const root = parse(html);

        // Extract the audio URL (m4a)
        const scriptContent = root.querySelectorAll("script").pop()?.text;
        if (!scriptContent) return null;

        const startIndex = scriptContent.indexOf("\"https://media.soundgasm.net/sounds/");
        const endIndex = scriptContent.indexOf(".m4a\"", startIndex) + 4;

        if (startIndex === -1 || endIndex === -1) return null;

        const audioUrl = scriptContent.substring(startIndex + 1, endIndex);

        // Extract metadata
        const title = root.querySelector(".jp-title")?.text.trim() || "Unknown Title";
        const author = root.querySelector("div > a[href^=\"https://soundgasm.net/u/\"]")?.text || "Unknown Author";
        const description = root.querySelector(".jp-description p")?.text.trim() || "";  // Updated to get full description

        // Duration isn't available in the HTML, so we can mark it as "Unknown"
        const duration = "0:00";

        // Use Soundgasm's favicon as the thumbnail placeholder
        const thumbnail = "https://soundgasm.net/favicon.ico";

        const metadata = { title, author, duration, thumbnail, description };

        return { audioUrl, metadata };
    }
}

module.exports = { SoundgasmExtractor };