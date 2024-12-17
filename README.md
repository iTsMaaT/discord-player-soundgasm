# Soundgasm Extractor

This is a Soundgasm extractor for use with the discord-player library. It fetches metadata from Soundgasm pages and streams audio directly.

## Installation

```bash
npm install soundgasm-extractor
```

## Usage

```js
const { Player } = require("discord-player");

const { SoundgasmExtractor } = require("soundgasm-extractor");
// Or
import { SoundgasmExtractor } from "soundgasm-extractor";

const player = new Player(client, {});

await player.extractors.register(SoundgasmExtractor, { /* options */ });
```

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `skipProbing` | `boolean` | `false` | Skips probing for the track duration. You can enable this to save some precious milliseconds as probing those kind of streams dont seem to work anyway. |