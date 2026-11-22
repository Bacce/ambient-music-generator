const TICK_RATE = 480;
const BEATS_PER_BAR = 4;
const BAR = TICK_RATE * BEATS_PER_BAR;

const KEYS = {
    C: 0, D: 2, Eb: 3, F: 5, G: 7, A: 9, Bb: 10,
};

const CHORDS = {
    I: [0, 4, 7, 11],
    ii: [2, 5, 9, 12],
    iii: [4, 7, 11, 14],
    IV: [5, 9, 12, 16],
    V: [7, 11, 14, 17],
    vi: [9, 12, 16, 19],
    vii: [11, 14, 17, 21],
};

const PROGRAMS = {
    piano: 0,
    pad: 89,
    strings: 48,
    musicbox: 10,
};

export type KeyName = keyof typeof KEYS;
export type ChordName = keyof typeof CHORDS;
export type Instrument = keyof typeof PROGRAMS;
export type Mood = "peaceful" | "dreamy" | "nostalgic" | "mysterious";

const PROGRESSIONS: readonly (readonly ChordName[])[] = [
    ["I", "V", "vi", "IV"],
    ["I", "vi", "IV", "V"],
    ["vi", "IV", "I", "V"],
    ["I", "IV", "ii", "V"],
    ["I", "iii", "IV", "V"],
    ["vi", "ii", "V", "I"],
    ["I", "V", "IV", "I"],
];

export interface AmbientMidiOptions {
    duration: number;
    bpm: number;
    key: KeyName;
    mood: Mood;
    instruments: Instrument[];
    seed: number;
}

export type AmbientMidiProps = Partial<AmbientMidiOptions>;

export const AMBIENT_MIDI_DEFAULTS: AmbientMidiOptions = {
    duration: 120,
    bpm: 64,
    key: "C",
    mood: "peaceful",
    instruments: ["piano", "pad", "strings", "musicbox"],
    seed: 12345,
};

const MOOD_NOTES: Record<Mood, readonly number[]> = {
    peaceful: [0, 2, 4, 7, 9],
    dreamy: [0, 4, 7, 9, 11],
    nostalgic: [0, 2, 5, 7, 9],
    mysterious: [0, 1, 3, 7, 10],
};

export interface MidiEvent {
    tick: number;
    data: number[];
    priority: number;
}

export interface AmbientSequence {
    tracks: MidiEvent[][];
    totalTicks: number;
    ticksPerBeat: number;
    bpm: number;
    seed: number;
}

interface MelodyNote {
    pitch: number;
    beat: number;
    length: number;
    velocity: number;
}

type Random = () => number;

function createRandom(seed: number): Random {
    let state = seed >>> 0;

    return () => {
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function choose<T>(random: Random, items: readonly T[]): T {
    return items[Math.floor(random() * items.length)];
}

function vlq(value: number): number[] {
    let buffer = value & 0x7f;

    while ((value >>= 7)) {
        buffer <<= 8;
        buffer |= (value & 0x7f) | 0x80;
    }

    const result: number[] = [];

    while (true) {
        result.push(buffer & 0xff);

        if (buffer & 0x80) buffer >>= 8;
        else break;
    }

    return result;
}

function write16(value: number): number[] {
    return [value >> 8 & 255, value & 255];
}

function write32(value: number): number[] {
    return [
        value >>> 24 & 255,
        value >>> 16 & 255,
        value >>> 8 & 255,
        value & 255,
    ];
}

const encoder = new TextEncoder();

function asciiBytes(text: string): number[] {
    return [...encoder.encode(text)];
}

function makeChunk(type: string, data: number[]): number[] {
    return [
        ...asciiBytes(type),
        ...write32(data.length),
        ...data,
    ];
}

function toBase64(bytes: number[]): string {
    let binary = "";
    const CHUNK = 0x8000;

    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.slice(i, i + CHUNK));
    }

    return btoa(binary);
}

function generateMelody(
    random: Random,
    root: number,
    mood: Mood,
): MelodyNote[] {
    const allowed = MOOD_NOTES[mood] ?? MOOD_NOTES.peaceful;

    return Array.from({ length: 4 }, (_, i) => {
        const degree = choose(random, allowed);
        const octave = random() > 0.7 ? 12 : 0;

        return {
            pitch: 60 + root + degree + octave,
            beat: i,
            length: choose(random, [0.5, 1, 1.5]),
            velocity: 35 + Math.floor(random() * 15),
        };
    });
}

export function composeAmbientSequence(
    props: AmbientMidiProps = {},
): AmbientSequence {
    const settings: AmbientMidiOptions = { ...AMBIENT_MIDI_DEFAULTS, ...props };

    const {
        duration,
        bpm,
        key,
        mood,
        instruments,
        seed,
    } = settings;

    if (!Number.isFinite(duration) || duration <= 0)
        throw new Error("duration must be positive");

    if (!Number.isFinite(bpm) || bpm < 30 || bpm > 240)
        throw new Error("bpm must be between 30 and 240");

    if (!(key in KEYS))
        throw new Error("Unsupported key");

    if (!Array.isArray(instruments))
        throw new Error("instruments must be an array");

    for (const instrument of instruments) {
        if (!(instrument in PROGRAMS))
            throw new Error(`Unknown instrument: ${instrument}`);
    }

    const resolvedSeed = seed === -1
        ? Math.floor(Math.random() * 2 ** 32)
        : seed;
    const random = createRandom(resolvedSeed);
    const keyRoot = KEYS[key];

    const totalTicks = Math.round(duration * bpm / 60 * TICK_RATE);
    const bars = Math.ceil(totalTicks / BAR);

    function addEvent(
        track: MidiEvent[],
        tick: number,
        data: number[],
        priority = 1,
    ): void {
        if (tick < 0 || tick > totalTicks) return;
        track.push({ tick, data, priority });
    }

    function addNote(
        track: MidiEvent[],
        channel: number,
        pitch: number,
        start: number,
        length: number,
        velocity: number,
    ): void {
        const end = Math.min(start + length, totalTicks);

        if (start >= totalTicks || end <= start) return;

        addEvent(track, start, [
            0x90 | channel,
            pitch,
            velocity,
        ], 2);

        addEvent(track, end, [
            0x80 | channel,
            pitch,
            0,
        ], 0);
    }

    function makeTrack(
        name: string,
        channel: number,
        program: number | null,
    ): MidiEvent[] {
        const track: MidiEvent[] = [];

        const nameBytes = asciiBytes(name);
        addEvent(track, 0, [
            0xff, 0x03,
            ...vlq(nameBytes.length),
            ...nameBytes,
        ], 0);

        if (program !== null) {
            addEvent(track, 0, [
                0xc0 | channel,
                program,
            ], 0);
        }

        return track;
    }

    // Select a progression that resolves to the tonic.
    const progression = choose(random, PROGRESSIONS);
    const chords: ChordName[] = [...progression, "I"];

    function chordForBar(bar: number): ChordName {
        return chords[bar % chords.length];
    }

    function notesForChord(name: ChordName, octave = 0): number[] {
        return CHORDS[name].map(
            interval => 60 + keyRoot + interval + octave
        );
    }

    const tracks: MidiEvent[][] = [];

    // Conductor / tempo track
    const conductor: MidiEvent[] = [];
    const microsPerBeat = Math.round(60000000 / bpm);

    addEvent(conductor, 0, [
        0xff, 0x51, 0x03,
        ...[
            microsPerBeat >> 16 & 255,
            microsPerBeat >> 8 & 255,
            microsPerBeat & 255,
        ],
    ], 0);

    addEvent(conductor, 0, [
        0xff, 0x58, 0x04, 4, 2, 24, 8,
    ], 0);

    tracks.push(conductor);

    for (const instrument of instruments) {
        const channel = instruments.indexOf(instrument);
        const track = makeTrack(
            instrument,
            channel,
            PROGRAMS[instrument]
        );

        for (let bar = 0; bar < bars; bar++) {
            const start = bar * BAR;
            const chordName = chordForBar(bar);
            const chord = notesForChord(chordName);

            if (instrument === "piano") {
                // Soft, gently broken chord pattern.
                for (let beat = 0; beat < 4; beat++) {
                    const pitch = chord[beat % chord.length] - 24;

                    addNote(
                        track, channel, pitch,
                        start + beat * TICK_RATE,
                        TICK_RATE * 1.6,
                        42 + Math.floor(random() * 12)
                    );
                }

                // Occasional melodic phrase.
                if (bar % 2 === 0) {
                    const melody = generateMelody(
                        random, keyRoot, mood
                    );

                    melody.forEach(note => {
                        addNote(
                            track,
                            channel,
                            note.pitch,
                            start + note.beat * TICK_RATE,
                            note.length * TICK_RATE,
                            note.velocity
                        );
                    });
                }
            }

            if (instrument === "pad") {
                chord.forEach(pitch => {
                    addNote(
                        track, channel, pitch - 12,
                        start, BAR * 0.95,
                        25
                    );
                });
            }

            if (instrument === "strings") {
                [chord[0] - 12, chord[2] - 12].forEach(pitch => {
                    addNote(
                        track, channel, pitch,
                        start, BAR * 0.95,
                        28
                    );
                });
            }

            if (instrument === "musicbox" && random() > 0.3) {
                const pitch = choose(random, chord) + 12;

                addNote(
                    track, channel, pitch,
                    start + TICK_RATE * 2,
                    TICK_RATE * 1.5,
                    35
                );
            }
        }

        tracks.push(track);
    }

    return {
        tracks,
        totalTicks,
        ticksPerBeat: TICK_RATE,
        bpm,
        seed: resolvedSeed,
    };
}

export function sequenceToMidi(sequence: AmbientSequence): string {
    const { tracks, totalTicks, ticksPerBeat } = sequence;

    // Serialize MIDI tracks.
    const chunks = tracks.map(track => {
        track.sort((a, b) =>
            a.tick - b.tick || a.priority - b.priority
        );

        const data: number[] = [];
        let previousTick = 0;

        for (const item of track) {
            data.push(...vlq(item.tick - previousTick));
            data.push(...item.data);
            previousTick = item.tick;
        }

        data.push(...vlq(totalTicks - previousTick));
        data.push(0xff, 0x2f, 0x00);

        return makeChunk("MTrk", data);
    });

    const header = [
        ...asciiBytes("MThd"),
        ...write32(6),
        ...write16(1),
        ...write16(chunks.length),
        ...write16(ticksPerBeat),
    ];

    return toBase64([
        ...header,
        ...chunks.flat(),
    ]);
}

export function generateAmbientMidi(props: AmbientMidiProps = {}): string {
    return sequenceToMidi(composeAmbientSequence(props));
}
