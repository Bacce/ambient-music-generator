const TICK_RATE = 480;
const BEATS_PER_BAR = 4;
const BAR = TICK_RATE * BEATS_PER_BAR;
const MAX_DURATION_SECONDS = 600;

const KEYS = {
    C: 0, D: 2, Eb: 3, F: 5, G: 7, A: 9, Bb: 10,
};

// Diatonic triads plus the borrowed chords used by the modal moods.
const CHORDS = {
    I: [0, 4, 7],
    ii: [2, 5, 9],
    iii: [4, 7, 11],
    IV: [5, 9, 12],
    V: [7, 11, 14],
    vi: [9, 12, 16],
    vii: [11, 14, 17],
    i: [0, 3, 7],
    iv: [5, 8, 12],
    v: [7, 10, 14],
    bIII: [3, 7, 10],
    bVI: [8, 12, 15],
    bVII: [10, 14, 17],
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

type ChordExtension = "triad" | "seventh" | "ninth";

interface MoodProfile {
    progressions: readonly (readonly ChordName[])[];
    tonic: ChordName;
    extension: ChordExtension;
    melodyChance: number;
    melodyNotes: readonly [number, number];
    melodyLengths: readonly number[];
    melodyVelocity: number;
    musicboxChance: number;
    reverb: number;
}

const MOOD_NOTES: Record<Mood, readonly number[]> = {
    peaceful: [0, 2, 4, 7, 9],
    dreamy: [0, 4, 7, 9, 11],
    nostalgic: [0, 2, 5, 7, 9],
    mysterious: [0, 1, 3, 7, 10],
};

const MOOD_PROFILES: Record<Mood, MoodProfile> = {
    peaceful: {
        progressions: [
            ["I", "V", "vi", "IV"],
            ["I", "vi", "IV", "V"],
            ["I", "IV", "I", "V"],
            ["I", "iii", "IV", "I"],
        ],
        tonic: "I",
        extension: "triad",
        melodyChance: 0.55,
        melodyNotes: [1, 2],
        melodyLengths: [1, 1.5, 2],
        melodyVelocity: 40,
        musicboxChance: 0.35,
        reverb: 100,
    },
    dreamy: {
        progressions: [
            ["I", "iii", "vi", "IV"],
            ["IV", "I", "vi", "iii"],
            ["I", "vi", "ii", "IV"],
            ["vi", "IV", "I", "V"],
        ],
        tonic: "I",
        extension: "ninth",
        melodyChance: 0.75,
        melodyNotes: [2, 3],
        melodyLengths: [0.5, 1, 1.5, 2],
        melodyVelocity: 36,
        musicboxChance: 0.55,
        reverb: 118,
    },
    nostalgic: {
        progressions: [
            ["I", "iii", "IV", "V"],
            ["vi", "IV", "I", "V"],
            ["I", "IV", "ii", "V"],
            ["I", "vi", "iii", "IV"],
        ],
        tonic: "I",
        extension: "seventh",
        melodyChance: 0.7,
        melodyNotes: [2, 3],
        melodyLengths: [1, 1.5, 2],
        melodyVelocity: 42,
        musicboxChance: 0.4,
        reverb: 105,
    },
    mysterious: {
        progressions: [
            ["i", "bVI", "bIII", "bVII"],
            ["i", "iv", "bVII", "bIII"],
            ["i", "v", "bVI", "iv"],
            ["i", "bVII", "bVI", "v"],
        ],
        tonic: "i",
        extension: "seventh",
        melodyChance: 0.5,
        melodyNotes: [1, 2],
        melodyLengths: [1.5, 2],
        melodyVelocity: 32,
        musicboxChance: 0.25,
        reverb: 120,
    },
};

interface InstrumentMix {
    volume: number;
    pan: number;
}

const INSTRUMENT_MIX: Record<Instrument, InstrumentMix> = {
    piano: { volume: 100, pan: 0 },
    pad: { volume: 72, pan: 0 },
    strings: { volume: 66, pan: -35 },
    musicbox: { volume: 82, pan: 40 },
};

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

interface Harmony {
    chord: ChordName;
    voicing: number[];
}

interface NoteSpan {
    pitch: number;
    on: MidiEvent;
    off: MidiEvent;
}

/**
 * MIDI cannot represent two overlapping notes of the same pitch on one
 * channel unambiguously. Shorten the earlier note to the retrigger point.
 */
function cutOverlaps(spans: readonly NoteSpan[]): void {
    const byPitch = new Map<number, NoteSpan[]>();

    for (const span of spans) {
        const notes = byPitch.get(span.pitch);

        if (notes) notes.push(span);
        else byPitch.set(span.pitch, [span]);
    }

    for (const notes of byPitch.values()) {
        notes.sort((a, b) => a.on.tick - b.on.tick || a.off.tick - b.off.tick);

        for (let index = 0; index < notes.length - 1; index++) {
            const note = notes[index];
            const next = notes[index + 1];

            if (next.on.tick <= note.on.tick) continue;

            if (note.off.tick > next.on.tick) {
                note.off.tick = Math.max(note.on.tick + 1, next.on.tick);
            }
        }
    }
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

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function jitter(random: Random, amount: number): number {
    return Math.round((random() * 2 - 1) * amount);
}

function average(values: readonly number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
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

function chordIntervals(name: ChordName, mood: Mood): number[] {
    const base = [...CHORDS[name]];
    const extension = MOOD_PROFILES[mood].extension;

    if (extension === "triad") return base;

    const root = base[0];
    const minorThird = base[1] - root === 3;
    const seventh = root + (
        minorThird
            ? 10
            : mood === "mysterious" ? 10 : 11
    );

    base.push(seventh);

    if (extension === "ninth") base.push(root + 14);

    return base;
}

/**
 * Picks the inversion of a chord whose pitches move least from the previous
 * voicing. Keeps sustained pad/string layers from jumping around the register.
 */
function voiceChord(
    pitches: readonly number[],
    previous: readonly number[] | null,
): number[] {
    const sorted = [...pitches].sort((a, b) => a - b);
    const candidates: number[][] = [];

    for (let inversion = 0; inversion < sorted.length; inversion++) {
        let candidate = sorted
            .map((pitch, index) => index < inversion ? pitch + 12 : pitch)
            .sort((a, b) => a - b);

        while (average(candidate) < 58) {
            candidate = candidate.map(pitch => pitch + 12);
        }

        while (average(candidate) > 76) {
            candidate = candidate.map(pitch => pitch - 12);
        }

        candidates.push(candidate);
    }

    if (!previous || previous.length === 0) return candidates[0];

    let best = candidates[0];
    let bestCost = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
        const shared = Math.min(candidate.length, previous.length);
        let cost = Math.abs(candidate.length - previous.length) * 6;

        for (let index = 0; index < shared; index++) {
            cost += Math.abs(candidate[index] - previous[index]);
        }

        if (cost < bestCost) {
            bestCost = cost;
            best = candidate;
        }
    }

    return best;
}

function scalePitches(
    scale: readonly number[],
    root: number,
    low: number,
    high: number,
): number[] {
    const pitches: number[] = [];

    for (let pitch = low; pitch <= high; pitch++) {
        const pitchClass = ((pitch - root) % 12 + 12) % 12;

        if (scale.includes(pitchClass)) pitches.push(pitch);
    }

    return pitches;
}

function nearestPitch(
    random: Random,
    pitches: readonly number[],
    target: number,
): number {
    const sorted = [...pitches].sort(
        (a, b) => Math.abs(a - target) - Math.abs(b - target)
    );

    return choose(random, sorted.slice(0, 2));
}

function generateMelody(
    random: Random,
    root: number,
    mood: Mood,
    chordTones: readonly number[],
): MelodyNote[] {
    const profile = MOOD_PROFILES[mood];

    if (random() > profile.melodyChance) return [];

    const [minimum, maximum] = profile.melodyNotes;
    const targetCount = minimum + Math.floor(random() * (maximum - minimum + 1));
    const scale = scalePitches(MOOD_NOTES[mood], root, 70, 88);
    const chordPool = chordTones
        .map(pitch => pitch + 12)
        .filter(pitch => pitch <= 90);
    const notes: MelodyNote[] = [];

    let beat = random() < 0.4 ? choose(random, [1, 2]) : 0;
    let previous: MelodyNote | null = null;

    while (notes.length < targetCount && beat < 4) {
        const strong = beat === 0 || beat === 1 || beat === 2;
        const useChordTone = strong || random() < 0.45;
        const pool = useChordTone ? chordPool : scale;
        const anchor = previous?.pitch ?? choose(random, chordPool);

        let pitch = useChordTone
            ? nearestPitch(random, pool, anchor)
            : nearestPitch(
                random,
                pool,
                anchor + choose(random, [-2, -1, 1, 2]),
            );

        // Never retrigger a pitch while its previous note is still sounding.
        if (
            previous &&
            pitch === previous.pitch &&
            previous.beat + previous.length > beat
        ) {
            previous.length = Math.max(0.25, beat - previous.beat);

            if (previous.length <= 0.25) {
                const alternatives = (useChordTone ? chordPool : scale)
                    .filter(candidate => candidate !== previous?.pitch);

                if (alternatives.length > 0) {
                    pitch = choose(random, alternatives);
                }
            }
        }

        const maxLength = 4 - beat;
        const length = Math.min(choose(random, profile.melodyLengths), maxLength);

        if (length < 0.25) break;

        const note: MelodyNote = {
            pitch,
            beat,
            length,
            velocity: clamp(
                profile.melodyVelocity + jitter(random, 5),
                20,
                90,
            ),
        };

        notes.push(note);
        previous = note;
        beat += length + (random() < 0.45 ? choose(random, [0.5, 1]) : 0);
        beat = Math.round(beat * 2) / 2;
    }

    // Keep the phrase inside its bar so it cannot collide with the next bar.
    for (const note of notes) {
        note.length = Math.min(note.length, 4 - note.beat);
    }

    return notes;
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

    if (duration > MAX_DURATION_SECONDS)
        throw new Error(`duration must be at most ${MAX_DURATION_SECONDS} seconds`);

    if (!Number.isFinite(bpm) || bpm < 30 || bpm > 240)
        throw new Error("bpm must be between 30 and 240");

    if (!Object.hasOwn(KEYS, key))
        throw new Error("Unsupported key");

    if (!Object.hasOwn(MOOD_NOTES, mood))
        throw new Error("Unsupported mood");

    if (!Number.isInteger(seed))
        throw new Error("seed must be an integer");

    if (!Array.isArray(instruments) || instruments.length === 0)
        throw new Error("at least one instrument is required");

    if (new Set(instruments).size !== instruments.length)
        throw new Error("instruments must be unique");

    for (const instrument of instruments) {
        if (!Object.hasOwn(PROGRAMS, instrument))
            throw new Error(`Unknown instrument: ${instrument}`);
    }

    const profile = MOOD_PROFILES[mood];
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
        const roundedTick = Math.round(tick);

        if (roundedTick < 0 || roundedTick > totalTicks) return;
        track.push({ tick: roundedTick, data, priority });
    }

    function addNote(
        track: MidiEvent[],
        channel: number,
        pitch: number,
        start: number,
        length: number,
        velocity: number,
        spans: NoteSpan[],
    ): void {
        const onTick = Math.round(start);
        const offTick = Math.min(Math.round(start + length), totalTicks);

        if (onTick >= totalTicks || offTick <= onTick) return;

        const on: MidiEvent = {
            tick: onTick,
            data: [0x90 | channel, pitch, velocity],
            priority: 2,
        };
        const off: MidiEvent = {
            tick: offTick,
            data: [0x80 | channel, pitch, 0],
            priority: 0,
        };

        track.push(on, off);
        spans.push({ pitch, on, off });
    }

    function makeTrack(instrument: Instrument, channel: number): MidiEvent[] {
        const track: MidiEvent[] = [];
        const nameBytes = asciiBytes(instrument);
        const mix = INSTRUMENT_MIX[instrument];

        addEvent(track, 0, [
            0xff, 0x03,
            ...vlq(nameBytes.length),
            ...nameBytes,
        ], 0);

        addEvent(track, 0, [
            0xc0 | channel,
            PROGRAMS[instrument],
        ], 0);

        addEvent(track, 0, [0xb0 | channel, 7, mix.volume], 0);
        addEvent(track, 0, [0xb0 | channel, 10, mix.pan + 64], 0);
        addEvent(track, 0, [0xb0 | channel, 91, profile.reverb], 0);

        if (totalTicks >= BAR * 2) {
            // Fade the expression in over two bars and out over the last one.
            addEvent(track, 0, [0xb0 | channel, 11, 0], 0);
            addEvent(track, BAR * 2, [0xb0 | channel, 11, 100], 0);
            addEvent(track, totalTicks - BAR, [0xb0 | channel, 11, 100], 0);
        } else {
            addEvent(track, 0, [0xb0 | channel, 11, 100], 0);
        }

        addEvent(track, totalTicks, [0xb0 | channel, 11, 0], 0);

        return track;
    }

    const progression = choose(random, profile.progressions);
    const resolutionBar = bars >= 4 ? bars - 1 : -1;

    function chordForBar(bar: number): ChordName {
        if (bar === resolutionBar) return profile.tonic;
        return progression[bar % progression.length];
    }

    // Voice the whole form once so every instrument agrees on the harmony.
    const harmony: Harmony[] = [];
    let previousVoicing: readonly number[] | null = null;

    for (let bar = 0; bar < bars; bar++) {
        const chord = chordForBar(bar);
        const intervals = chordIntervals(chord, mood).map(
            interval => 60 + keyRoot + interval
        );
        const voicing = voiceChord(intervals, previousVoicing);

        previousVoicing = voicing;
        harmony.push({ chord, voicing });
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

    for (const [channel, instrument] of instruments.entries()) {
        const track = makeTrack(instrument, channel);
        const spans: NoteSpan[] = [];

        if (instrument === "pad") {
            // Tonic pedal under the whole piece.
            addNote(track, channel, 36 + keyRoot, 0, totalTicks, 16, spans);
        }

        for (let bar = 0; bar < bars; bar++) {
            const start = bar * BAR;
            const { chord, voicing } = harmony[bar];

            if (instrument === "piano") {
                // Root and fifth ground the harmony; the upper beats arpeggiate.
                const chordRoot = CHORDS[chord][0];
                let bassRoot = 36 + (keyRoot + chordRoot) % 12;

                if (bassRoot > 47) bassRoot -= 12;

                const bass = [bassRoot, bassRoot + 7];
                const arpeggio = voicing.map(pitch => pitch - 12);

                for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
                    const isBassBeat = beat === 0 || beat === 2;
                    const pitch = isBassBeat
                        ? bass[beat / 2]
                        : arpeggio[(beat + bar) % arpeggio.length];
                    const noteStart = clamp(
                        start + beat * TICK_RATE + (beat === 0 ? 0 : jitter(random, 4)),
                        start,
                        totalTicks,
                    );

                    addNote(
                        track,
                        channel,
                        pitch,
                        noteStart,
                        TICK_RATE * (isBassBeat ? 1.8 : 1.5),
                        clamp(
                            44 + (beat === 0 ? 6 : 0) + jitter(random, 4),
                            20,
                            80,
                        ),
                        spans,
                    );
                }

                const melody = generateMelody(
                    random,
                    keyRoot,
                    mood,
                    voicing,
                );

                for (const note of melody) {
                    addNote(
                        track,
                        channel,
                        note.pitch,
                        start + note.beat * TICK_RATE,
                        note.length * TICK_RATE,
                        note.velocity,
                        spans,
                    );
                }
            }

            if (instrument === "pad") {
                for (const pitch of voicing) {
                    addNote(
                        track,
                        channel,
                        pitch,
                        start,
                        BAR * 0.96,
                        clamp(25 + jitter(random, 3), 12, 50),
                        spans,
                    );
                }
            }

            if (instrument === "strings") {
                const voices = [voicing[0] - 12, voicing[2] - 12];

                for (const pitch of voices) {
                    addNote(
                        track,
                        channel,
                        pitch,
                        start,
                        BAR * 0.97,
                        clamp(30 + jitter(random, 3), 15, 55),
                        spans,
                    );
                }
            }

            if (instrument === "musicbox" && random() < profile.musicboxChance) {
                const beat = choose(random, [1, 2, 3]);
                const pitch = choose(
                    random,
                    voicing.map(tone => tone + 12),
                );
                const noteStart = clamp(
                    start + beat * TICK_RATE + jitter(random, 6),
                    start + beat * TICK_RATE - 6,
                    start + (BEATS_PER_BAR - 1) * TICK_RATE,
                );

                addNote(
                    track,
                    channel,
                    pitch,
                    noteStart,
                    Math.min(
                        TICK_RATE * 1.5,
                        start + BAR - noteStart,
                    ),
                    34 + jitter(random, 4),
                    spans,
                );
            }
        }

        cutOverlaps(spans);
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
        const sorted = [...track].sort((a, b) =>
            a.tick - b.tick || a.priority - b.priority
        );

        const data: number[] = [];
        let previousTick = 0;

        for (const item of sorted) {
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
