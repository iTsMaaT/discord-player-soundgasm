var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/SoundgasmExtractor.ts
import {
  BaseExtractor,
  Track,
  Util
} from "discord-player";
import { parse } from "node-html-parser";

// src/downloader.ts
import http from "http";
import https from "https";
function downloadStream(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("http://") ? http : https;
    lib.get(url, opts, (res) => resolve(res)).once("error", reject);
  });
}

// src/SoundgasmExtractor.ts
var SoundgasmExtractor = class extends BaseExtractor {
  async activate() {
    this.protocols = ["soundgasm"];
  }
  async deactivate() {
    this.protocols = [];
  }
  async validate(query) {
    const regex = /^https:\/\/soundgasm\.net\/.*$/;
    return regex.test(query);
  }
  async handle(query, context) {
    const pageData = await this.fetchSoundgasmPage(query);
    if (!pageData) throw new Error("Unable to fetch Soundgasm page");
    const { audioUrl, metadata } = this.extractDataFromPage(pageData);
    if (!audioUrl || !metadata) throw new Error("Unable to extract necessary data");
    const trackInfo = {
      title: metadata.title,
      author: metadata.author,
      url: query,
      duration: metadata.duration,
      thumbnail: "https://upload.wikimedia.org/wikipedia/commons/2/2a/ITunes_12.2_logo.png",
      description: metadata.description,
      requestedBy: null,
      raw: { stream: audioUrl }
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
      }
    });
    if (!this.options.skipProbing) {
      const data = await downloadStream(audioUrl, context.requestOptions);
      try {
        const mediaplex = __require("mediaplex");
        const timeout = this.context.player.options.probeTimeout ?? 5e3;
        const { result, stream } = await Promise.race([
          mediaplex.probeStream(data),
          new Promise((_, r) => {
            setTimeout(() => r(new Error("Timeout")), timeout);
          })
        ]);
        console.log(result);
        if (result) trackInfo.duration = result.duration * 1e3;
        stream.destroy();
      } catch (err) {
        console.log(err.stack);
      }
    }
    return this.createResponse(null, [track]);
  }
  async stream(track) {
    try {
      const raw = track.raw;
      return raw.stream;
    } catch (err) {
      console.log(err.stack);
      return "";
    }
  }
  async getRelatedTracks() {
    return this.createResponse(null, []);
  }
  async fetchSoundgasmPage(link) {
    try {
      const response = await fetch(link);
      return await response.text();
    } catch (error) {
      console.error("Failed to fetch Soundgasm page:", error);
      return null;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extractDataFromPage(html) {
    const root = parse(html);
    const scriptContent = root.querySelectorAll("script").pop()?.text;
    if (!scriptContent) return null;
    const startIndex = scriptContent.indexOf('"https://media.soundgasm.net/sounds/');
    const endIndex = scriptContent.indexOf('.m4a"', startIndex) + 4;
    if (startIndex === -1 || endIndex === -1) return null;
    const audioUrl = scriptContent.substring(startIndex + 1, endIndex);
    const title = root.querySelector(".jp-title")?.text.trim() || "Unknown Title";
    const author = root.querySelector('div > a[href^="https://soundgasm.net/u/"]')?.text || "Unknown Author";
    const description = root.querySelector(".jp-description p")?.text.trim() || "";
    const duration = 0;
    const metadata = { title, author, duration, description };
    return { audioUrl, metadata };
  }
};
SoundgasmExtractor.identifier = "com.itsmaat.discord-player.soundgasm-extractor";
export {
  SoundgasmExtractor
};
