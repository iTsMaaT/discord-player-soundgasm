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

const player = new Player(client, {
  //...
});

await player.extractors.register(SoundgasmExtractor, { /* There is currently no options */ });
```