import { Sequencer, WorkletSynthesizer } from "spessasynth_lib";
import { assetUrl } from "./assets.ts";
import type { AmbientSequence } from "./midigen.ts";

export interface PlaybackHandle {
    stop(): void;
    readonly currentTime: number;
    readonly durationSeconds: number;
    readonly finished: boolean;
}

interface PlaybackEngine {
    context: AudioContext;
    synth: WorkletSynthesizer;
    sequencer: Sequencer;
}

const PROCESSOR_URL = "spessasynth_processor.min.js";
const SOUNDFONT_URL = "soundfonts/GeneralUserGS.sf3";
const LOAD_TIMEOUT_MS = 15000;
const MIN_VOLUME = 0;
const MAX_VOLUME = 2;

let volume = 1;

function clampVolume(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.min(MAX_VOLUME, Math.max(MIN_VOLUME, value));
}

async function createEngine(): Promise<PlaybackEngine> {
    const context = new AudioContext({ latencyHint: "playback" });

    await context.audioWorklet.addModule(assetUrl(PROCESSOR_URL));

    const synth = new WorkletSynthesizer(context);
    synth.connect(context.destination);

    const response = await fetch(assetUrl(SOUNDFONT_URL));

    if (!response.ok) {
        throw new Error(
            `Could not load the soundfont (${response.status} ${response.statusText}).`
        );
    }

    await synth.soundBankManager.addSoundBank(
        await response.arrayBuffer(),
        "generaluser",
    );
    await synth.isReady;
    synth.setSystemParameter("gain", volume);
    await context.resume();

    const created: PlaybackEngine = {
        context,
        synth,
        sequencer: new Sequencer(synth, { skipToFirstNoteOn: true }),
    };

    engine = created;

    return created;
}

let enginePromise: Promise<PlaybackEngine> | null = null;
let engine: PlaybackEngine | null = null;

export function setPlaybackVolume(next: number): void {
    volume = clampVolume(next);
    engine?.synth.setSystemParameter("gain", volume);
}

function getEngine(): Promise<PlaybackEngine> {
    if (!enginePromise) {
        enginePromise = createEngine().catch(error => {
            enginePromise = null;
            throw error;
        });
    }

    return enginePromise;
}

export async function playSequence(
    sequence: AmbientSequence,
    midiBytes: Uint8Array<ArrayBuffer>,
    onEnded: () => void = () => {},
): Promise<PlaybackHandle> {
    const { context, synth, sequencer } = await getEngine();

    await context.resume();
    synth.stopAll(true);

    if (!sequencer.paused) sequencer.pause();

    await new Promise<void>((resolve, reject) => {
        const id = "ambient-load";
        const cleanup = () => {
            window.clearTimeout(timer);
            sequencer.eventHandler.removeEvent("songChange", id);
            sequencer.eventHandler.removeEvent("midiError", id);
        };
        const timer = window.setTimeout(() => {
            cleanup();
            reject(new Error("Timed out while loading the MIDI sequence."));
        }, LOAD_TIMEOUT_MS);

        sequencer.eventHandler.addEvent("songChange", id, () => {
            cleanup();
            resolve();
        });
        sequencer.eventHandler.addEvent("midiError", id, error => {
            cleanup();
            reject(error);
        });

        try {
            sequencer.loadNewSongList([{
                binary: midiBytes.slice().buffer,
                fileName: "ambient.mid",
            }]);
        } catch (error) {
            cleanup();
            reject(error);
        }
    });

    sequencer.play();

    const durationSeconds =
        sequence.totalTicks * 60 / (sequence.bpm * sequence.ticksPerBeat);
    let stopped = false;
    let ended = false;

    const watch = window.setInterval(() => {
        if (!stopped && !ended && sequencer.isFinished) {
            ended = true;
            window.clearInterval(watch);
            onEnded();
        }
    }, 200);

    return {
        stop() {
            if (stopped) return;

            stopped = true;
            window.clearInterval(watch);
            sequencer.pause();
            synth.stopAll(true);
        },
        get currentTime() {
            return Math.min(sequencer.currentHighResolutionTime, durationSeconds);
        },
        get durationSeconds() {
            return durationSeconds;
        },
        get finished() {
            return ended || stopped || sequencer.isFinished;
        },
    };
}
