import { BaseExtractor,
    ExtractorInfo,
    ExtractorSearchContext,
    QueryType,
    SearchQueryType,
    Track,
    Util,
    Player,
    RawTrackData,
} from "discord-player";
import { HTMLElement, parse } from "node-html-parser";
import { createReadStream, existsSync } from "fs";
import type { IncomingMessage } from "http";
import { stat } from "fs/promises";
import { downloadStream } from "./downloader";

export interface SoundgasmExtractorOptions {
    skipProbing: boolean;
}

export class SoundgasmExtractor extends BaseExtractor<SoundgasmExtractorOptions> {
    public static identifier = "com.itsmaat.discord-player.soundgasm-extractor";

    async activate(): Promise<void> {
        this.protocols = ["soundgasm"];
    }

    async deactivate(): Promise<void> {
        this.protocols = [];
    }

    async validate(query: string): Promise<boolean> {
        const regex = /^https:\/\/soundgasm\.net\/.*$/;
        return regex.test(query);
    }

    async handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo> {
        const pageData = await this.fetchSoundgasmPage(query);
        if (!pageData) throw new Error("Unable to fetch Soundgasm page");

        const { audioUrl, metadata } = this.extractDataFromPage(pageData)!;

        if (!audioUrl || !metadata) throw new Error("Unable to extract necessary data");

        
        const trackInfo = {
            title: metadata.title,
            author: metadata.author,
            url: query,
            duration: metadata.duration,
            thumbnail: "https://upload.wikimedia.org/wikipedia/commons/2/2a/ITunes_12.2_logo.png",
            description: metadata.description,
            requestedBy: null,
            raw: { stream: audioUrl },
        };

        const track = new Track(this.context.player, {
            title: trackInfo.title,
            url: trackInfo.url,
            duration: Util.buildTimeCode(Util.parseMS(trackInfo.duration)),
            description: trackInfo.description,
            thumbnail: trackInfo.thumbnail,
            views: 0,
            author: trackInfo.author,
            requestedBy: context.requestedBy,
            source: "arbitrary",
            engine: trackInfo.url,
            metadata: trackInfo,
            raw: trackInfo.raw,
            async requestMetadata() {
                return trackInfo;
            },
        });
        
        if (!this.options.skipProbing) {
            const data = (await downloadStream(audioUrl, context.requestOptions)) as IncomingMessage;

            try {
                const mediaplex = require("mediaplex") as typeof import("mediaplex");
                const timeout = this.context.player.options.probeTimeout ?? 5000;
                
                const { result, stream } = (await Promise.race([
                    mediaplex.probeStream(data),
                    new Promise((_, r) => {
                        setTimeout(() => r(new Error("Timeout")), timeout);
                    }),
                ])) as Awaited<ReturnType<typeof mediaplex.probeStream>>;
                console.log(result);
                
                if (result) trackInfo.duration = result.duration * 1000;
                
                stream.destroy();
            } catch (err) {
                console.log((err as Error).stack);
            }
        }

        return this.createResponse(null, [track]);
        
    }

    async stream(track: Track): Promise<string> {
        try {
            const raw = track.raw as unknown as { stream: string };
            return raw.stream;
        } catch (err) {
            console.log((err as Error).stack);
            return "";
        }
    }
    

    async getRelatedTracks(): Promise<ExtractorInfo> {
        return this.createResponse(null, []);
    }

    private async fetchSoundgasmPage(link: string): Promise<string | null> {
        try {
            const response = await fetch(link);
            return await response.text();
        } catch (error) {
            console.error("Failed to fetch Soundgasm page:", error);
            return null;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private extractDataFromPage(html: string): { audioUrl: string; metadata: any } | null {
        const root = parse(html);

        const scriptContent = root.querySelectorAll("script").pop()?.text;
        if (!scriptContent) return null;

        const startIndex = scriptContent.indexOf("\"https://media.soundgasm.net/sounds/");
        const endIndex = scriptContent.indexOf(".m4a\"", startIndex) + 4;

        if (startIndex === -1 || endIndex === -1) return null;

        const audioUrl = scriptContent.substring(startIndex + 1, endIndex);

        const title = root.querySelector(".jp-title")?.text.trim() || "Unknown Title";
        const author = root.querySelector("div > a[href^=\"https://soundgasm.net/u/\"]")?.text || "Unknown Author";
        const description = root.querySelector(".jp-description p")?.text.trim() || "";

        const duration = 0;

        const metadata = { title, author, duration, description };

        return { audioUrl, metadata };
    }
}
