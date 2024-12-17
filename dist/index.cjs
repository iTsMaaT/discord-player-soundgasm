"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  SoundgasmExtractor: () => SoundgasmExtractor
});
module.exports = __toCommonJS(src_exports);

// src/SoundgasmExtractor.ts
var import_discord_player = require("discord-player");
var import_node_html_parser = require("node-html-parser");

// src/downloader.ts
var import_http = __toESM(require("http"), 1);
var import_https = __toESM(require("https"), 1);
function downloadStream(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("http://") ? import_http.default : import_https.default;
    lib.get(url, opts, (res) => resolve(res)).once("error", reject);
  });
}

// src/SoundgasmExtractor.ts
var import_https2 = __toESM(require("https"), 1);
var import_http2 = __toESM(require("http"), 1);
var SoundgasmExtractor = class extends import_discord_player.BaseExtractor {
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
    if (!this.options.skipProbing) {
      const data = await downloadStream(audioUrl, context.requestOptions);
      try {
        const mediaplex = require("mediaplex");
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
          (audioUrl.startsWith("http://") ? import_http2.default : import_https2.default).get(url, (res) => {
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
    const track = new import_discord_player.Track(this.context.player, {
      title: trackInfo.title,
      url: trackInfo.url,
      duration: import_discord_player.Util.buildTimeCode(import_discord_player.Util.parseMS(trackInfo.duration)),
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
    const root = (0, import_node_html_parser.parse)(html);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SoundgasmExtractor
});
