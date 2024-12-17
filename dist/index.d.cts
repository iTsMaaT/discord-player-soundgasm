import { BaseExtractor, ExtractorSearchContext, ExtractorInfo, Track } from 'discord-player';

interface SoundgasmExtractorOptions {
    skipProbing: boolean;
    attemptAlternateProbing: boolean;
}
declare class SoundgasmExtractor extends BaseExtractor<SoundgasmExtractorOptions> {
    static identifier: string;
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    validate(query: string): Promise<boolean>;
    handle(query: string, context: ExtractorSearchContext): Promise<ExtractorInfo>;
    stream(track: Track): Promise<string>;
    getRelatedTracks(): Promise<ExtractorInfo>;
    private fetchSoundgasmPage;
    private extractDataFromPage;
}

export { SoundgasmExtractor, type SoundgasmExtractorOptions };
