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
import https2 from "https";
import http2 from "http";
var _SoundgasmExtractor = class _SoundgasmExtractor extends BaseExtractor {
  async activate() {
    this.protocols = ["soundgasm"];
    _SoundgasmExtractor.instance = this;
  }
  async deactivate() {
    this.protocols = [];
    _SoundgasmExtractor.instance = null;
  }
  async validate(query) {
    if (typeof query !== "string") return false;
    const regex = /^https:\/\/soundgasm\.net\/.*$/;
    return regex.test(query);
  }
  async handle(query, context) {
    console.log(query);
    if (!await this.validate(query)) throw new Error("Invalid extractor invocation, skipping...");
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
        if (result) trackInfo.duration = result.duration * 1e3;
        stream.destroy();
      } catch {
      }
    } else if (this.options.attemptAlternateProbing) {
      try {
        const bitrateKbps = 128;
        const getFileSize = (url) => new Promise((resolve, reject) => {
          (audioUrl.startsWith("http://") ? http2 : https2).get(url, (res) => {
            const fileSize2 = parseInt(res.headers["content-length"] || "0", 10);
            if (fileSize2) resolve(fileSize2);
            else reject(new Error("Unable to fetch file size."));
          }).on("error", reject);
        });
        const fileSize = await getFileSize(audioUrl);
        const bitrateBps = bitrateKbps * 1e3 / 8;
        const durationInSeconds = fileSize / bitrateBps;
        trackInfo.duration = durationInSeconds * 1e3;
      } catch {
      }
    }
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
    return this.createResponse(null, [track]);
  }
  async stream(track) {
    const raw = track.raw;
    return raw.stream;
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
_SoundgasmExtractor.identifier = "com.itsmaat.discord-player.soundgasm-extractor";
_SoundgasmExtractor.instance = null;
var SoundgasmExtractor = _SoundgasmExtractor;
export {
  SoundgasmExtractor
};
