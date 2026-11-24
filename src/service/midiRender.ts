import { BasicMIDI } from "spessasynth_core";
import { WorkletSynthesizer } from "spessasynth_lib";
import { assetUrl } from "./assets.ts";

const PROCESSOR_URL = "spessasynth_processor.min.js";
const SOUNDFONT_URL = "soundfonts/GeneralUserGS.sf3";
const SAMPLE_RATE = 44100;
const REVERB_TAIL_SECONDS = 2;

let soundfontPromise: Promise<ArrayBuffer> | null = null;

function loadSoundfont(): Promise<ArrayBuffer> {
    if (!soundfontPromise) {
        soundfontPromise = fetch(assetUrl(SOUNDFONT_URL))
            .then(response => {
                if (!response.ok) {
                    throw new Error(
                        `Could not load the soundfont (${response.status} ${response.statusText}).`
                    );
                }

                return response.arrayBuffer();
            })
            .catch(error => {
                soundfontPromise = null;
                throw error;
            });
    }

    return soundfontPromise;
}

/**
 * Renders the MIDI bytes to stereo PCM with an OfflineAudioContext.
 * The soundfont is fetched once and reused across exports.
 */
export async function renderMidiToBuffer(
    midiBytes: Uint8Array<ArrayBuffer>,
    durationSeconds: number,
): Promise<AudioBuffer> {
    const length = Math.ceil(
        SAMPLE_RATE * (durationSeconds + REVERB_TAIL_SECONDS),
    );
    const context = new OfflineAudioContext({
        numberOfChannels: 2,
        sampleRate: SAMPLE_RATE,
        length,
    });

    const [, soundfont] = await Promise.all([
        context.audioWorklet.addModule(assetUrl(PROCESSOR_URL)),
        loadSoundfont(),
    ]);

    // Do not call other synth methods between construction and startOfflineRender:
    // Chromium ignores worklet messages on OfflineAudioContext otherwise.
    const synth = new WorkletSynthesizer(context, { eventsEnabled: false });
    synth.connect(context.destination);

    await synth.startOfflineRender({
        soundBankList: [{
            bankOffset: 0,
            // startOfflineRender transfers this buffer to the worklet.
            soundBankBuffer: soundfont.slice(0),
        }],
        midiSequence: BasicMIDI.fromArrayBuffer(midiBytes.slice().buffer),
        loopCount: 0,
    });
    await synth.isReady;

    return context.startRendering();
}
