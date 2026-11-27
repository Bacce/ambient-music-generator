const TICK_RATE = 480;
const BEATS_PER_BAR = 4;
const BAR = TICK_RATE * BEATS_PER_BAR;
const BAR_SNAP_TICKS = 16;
export const MAX_DURATION_SECONDS = 600;
export const MAX_MELODIC_INSTRUMENTS = 15;
const DRUM_CHANNEL = 9;

export const KEYS = {
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

export type KeyName = keyof typeof KEYS;
export type ChordName = keyof typeof CHORDS;
export type Instrument = string;
export type Mood = "peaceful" | "dreamy" | "nostalgic" | "mysterious";
export type Style =
    | "ambient"
    | "cinematic"
    | "lofi"
    | "classical"
    | "jazz"
    | "electronic"
    | "folk"
    | "minimal"
    | "drone";
export type Role =
    | "keys"
    | "pad"
    | "bass"
    | "pluck"
    | "bells"
    | "lead"
    | "texture"
    | "percussion"
    | "drums";

type ChordExtension = "triad" | "seventh" | "ninth";
type Mode = "major" | "minor";
type ArpPattern = "up" | "down" | "updown" | "broken" | "random";
type BassPattern = "pedal" | "root" | "pulse" | "walking" | "octaves";
type PadArticulation = "sustain" | "swell" | "stabs";
type DrumPatternId =
    | "cinematic"
    | "lofi"
    | "jazz"
    | "electronic"
    | "folk"
    | "minimal"
    | "soft";

export interface InstrumentDef {
    id: Instrument;
    label: string;
    program: number | null;
    family: string;
    role: Role;
}

export interface InstrumentFamily {
    id: string;
    label: string;
    instruments: readonly InstrumentDef[];
}

interface FamilySpec {
    id: string;
    label: string;
    start: number;
    role: Role;
    names: readonly string[];
}

const FAMILY_SPECS: readonly FamilySpec[] = [
    {
        id: "piano",
        label: "Piano",
        start: 0,
        role: "keys",
        names: [
            "Acoustic Grand Piano",
            "Bright Acoustic Piano",
            "Electric Grand Piano",
            "Honky-tonk Piano",
            "Electric Piano 1",
            "Electric Piano 2",
            "Harpsichord",
            "Clavinet",
        ],
    },
    {
        id: "chromatic",
        label: "Chromatic Percussion",
        start: 8,
        role: "bells",
        names: [
            "Celesta",
            "Glockenspiel",
            "Music Box",
            "Vibraphone",
            "Marimba",
            "Xylophone",
            "Tubular Bells",
            "Dulcimer",
        ],
    },
    {
        id: "organ",
        label: "Organ",
        start: 16,
        role: "pad",
        names: [
            "Drawbar Organ",
            "Percussive Organ",
            "Rock Organ",
            "Church Organ",
            "Reed Organ",
            "Accordion",
            "Harmonica",
            "Tango Accordion",
        ],
    },
    {
        id: "guitar",
        label: "Guitar",
        start: 24,
        role: "pluck",
        names: [
            "Acoustic Guitar (nylon)",
            "Acoustic Guitar (steel)",
            "Electric Guitar (jazz)",
            "Electric Guitar (clean)",
            "Electric Guitar (muted)",
            "Overdriven Guitar",
            "Distortion Guitar",
            "Guitar Harmonics",
        ],
    },
    {
        id: "bass",
        label: "Bass",
        start: 32,
        role: "bass",
        names: [
            "Acoustic Bass",
            "Electric Bass (finger)",
            "Electric Bass (pick)",
            "Fretless Bass",
            "Slap Bass 1",
            "Slap Bass 2",
            "Synth Bass 1",
            "Synth Bass 2",
        ],
    },
    {
        id: "strings",
        label: "Strings",
        start: 40,
        role: "pad",
        names: [
            "Violin",
            "Viola",
            "Cello",
            "Contrabass",
            "Tremolo Strings",
            "Pizzicato Strings",
            "Orchestral Harp",
            "Timpani",
        ],
    },
    {
        id: "ensemble",
        label: "Ensemble",
        start: 48,
        role: "pad",
        names: [
            "String Ensemble 1",
            "String Ensemble 2",
            "Synth Strings 1",
            "Synth Strings 2",
            "Choir Aahs",
            "Voice Oohs",
            "Synth Voice",
            "Orchestra Hit",
        ],
    },
    {
        id: "brass",
        label: "Brass",
        start: 56,
        role: "lead",
        names: [
            "Trumpet",
            "Trombone",
            "Tuba",
            "Muted Trumpet",
            "French Horn",
            "Brass Section",
            "Synth Brass 1",
            "Synth Brass 2",
        ],
    },
    {
        id: "reed",
        label: "Reed",
        start: 64,
        role: "lead",
        names: [
            "Soprano Sax",
            "Alto Sax",
            "Tenor Sax",
            "Baritone Sax",
            "Oboe",
            "English Horn",
            "Bassoon",
            "Clarinet",
        ],
    },
    {
        id: "pipe",
        label: "Pipe",
        start: 72,
        role: "lead",
        names: [
            "Piccolo",
            "Flute",
            "Recorder",
            "Pan Flute",
            "Blown Bottle",
            "Shakuhachi",
            "Whistle",
            "Ocarina",
        ],
    },
    {
        id: "synth-lead",
        label: "Synth Lead",
        start: 80,
        role: "lead",
        names: [
            "Lead 1 (square)",
            "Lead 2 (sawtooth)",
            "Lead 3 (calliope)",
            "Lead 4 (chiff)",
            "Lead 5 (charang)",
            "Lead 6 (voice)",
            "Lead 7 (fifths)",
            "Lead 8 (bass + lead)",
        ],
    },
    {
        id: "synth-pad",
        label: "Synth Pad",
        start: 88,
        role: "pad",
        names: [
            "Pad 1 (new age)",
            "Pad 2 (warm)",
            "Pad 3 (polysynth)",
            "Pad 4 (choir)",
            "Pad 5 (bowed)",
            "Pad 6 (metallic)",
            "Pad 7 (halo)",
            "Pad 8 (sweep)",
        ],
    },
    {
        id: "synth-effects",
        label: "Synth Effects",
        start: 96,
        role: "texture",
        names: [
            "FX 1 (rain)",
            "FX 2 (soundtrack)",
            "FX 3 (crystal)",
            "FX 4 (atmosphere)",
            "FX 5 (brightness)",
            "FX 6 (goblins)",
            "FX 7 (echoes)",
            "FX 8 (sci-fi)",
        ],
    },
    {
        id: "ethnic",
        label: "Ethnic",
        start: 104,
        role: "pluck",
        names: [
            "Sitar",
            "Banjo",
            "Shamisen",
            "Koto",
            "Kalimba",
            "Bagpipe",
            "Fiddle",
            "Shanai",
        ],
    },
    {
        id: "percussive",
        label: "Percussive",
        start: 112,
        role: "percussion",
        names: [
            "Tinkle Bell",
            "Agogo",
            "Steel Drums",
            "Woodblock",
            "Taiko Drum",
            "Melodic Tom",
            "Synth Drum",
            "Reverse Cymbal",
        ],
    },
    {
        id: "sound-effects",
        label: "Sound Effects",
        start: 120,
        role: "texture",
        names: [
            "Guitar Fret Noise",
            "Breath Noise",
            "Seashore",
            "Bird Tweet",
            "Telephone Ring",
            "Helicopter",
            "Applause",
            "Gunshot",
        ],
    },
];

const ROLE_OVERRIDES: Record<string, Role> = {
    "harpsichord": "keys",
    "clavinet": "keys",
    "orchestral-harp": "pluck",
    "pizzicato-strings": "pluck",
    "tremolo-strings": "pad",
    "timpani": "bass",
    "reverse-cymbal": "texture",
    "tinkle-bell": "bells",
    "agogo": "bells",
    "steel-drums": "percussion",
    "woodblock": "percussion",
    "taiko-drum": "percussion",
    "melodic-tom": "percussion",
    "synth-drum": "percussion",
};

function slugify(label: string): string {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const melodicFamilies: InstrumentFamily[] = FAMILY_SPECS.map(spec => ({
    id: spec.id,
    label: spec.label,
    instruments: spec.names.map((label, index) => {
        const id = slugify(label);

        return {
            id,
            label,
            program: spec.start + index,
            family: spec.id,
            role: ROLE_OVERRIDES[id] ?? spec.role,
        };
    }),
}));

export const DRUM_KIT: InstrumentDef = {
    id: "drums",
    label: "Drum Kit",
    program: null,
    family: "drums",
    role: "drums",
};

export const INSTRUMENT_FAMILIES: readonly InstrumentFamily[] = [
    ...melodicFamilies,
    { id: "drums", label: "Drums", instruments: [DRUM_KIT] },
];

export const INSTRUMENTS: readonly InstrumentDef[] =
    INSTRUMENT_FAMILIES.flatMap(family => family.instruments);

const INSTRUMENT_BY_ID = new Map(
    INSTRUMENTS.map(instrument => [instrument.id, instrument])
);

export function instrumentLabel(instrument: Instrument): string {
    return INSTRUMENT_BY_ID.get(instrument)?.label ?? instrument;
}

export const DEFAULT_INSTRUMENTS: readonly Instrument[] = [
    "acoustic-grand-piano",
    "pad-2-warm",
    "string-ensemble-1",
    "music-box",
];

export const SUGGESTED_INSTRUMENTS: Record<Style, readonly Instrument[]> = {
    ambient: DEFAULT_INSTRUMENTS,
    cinematic: [
        "string-ensemble-1",
        "church-organ",
        "french-horn",
        "timpani",
        "choir-aahs",
        "drums",
    ],
    lofi: [
        "electric-piano-1",
        "electric-bass-finger",
        "electric-guitar-jazz",
        "vibraphone",
        "drums",
    ],
    classical: [
        "acoustic-grand-piano",
        "violin",
        "cello",
        "string-ensemble-2",
    ],
    jazz: [
        "acoustic-grand-piano",
        "acoustic-bass",
        "tenor-sax",
        "vibraphone",
        "drums",
    ],
    electronic: [
        "synth-bass-1",
        "pad-1-new-age",
        "lead-2-sawtooth",
        "fx-3-crystal",
        "drums",
    ],
    folk: [
        "acoustic-guitar-steel",
        "acoustic-bass",
        "violin",
        "woodblock",
    ],
    minimal: [
        "electric-piano-2",
        "pad-3-polysynth",
        "music-box",
        "synth-bass-2",
    ],
    drone: [
        "pad-2-warm",
        "church-organ",
        "string-ensemble-2",
        "fx-4-atmosphere",
    ],
};

interface MoodProfile {
    tonic: ChordName;
    mode: Mode;
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
        tonic: "I",
        mode: "major",
        melodyChance: 0.55,
        melodyNotes: [1, 2],
        melodyLengths: [1, 1.5, 2],
        melodyVelocity: 64,
        musicboxChance: 0.35,
        reverb: 100,
    },
    dreamy: {
        tonic: "I",
        mode: "major",
        melodyChance: 0.75,
        melodyNotes: [2, 3],
        melodyLengths: [0.5, 1, 1.5, 2],
        melodyVelocity: 58,
        musicboxChance: 0.55,
        reverb: 118,
    },
    nostalgic: {
        tonic: "I",
        mode: "major",
        melodyChance: 0.7,
        melodyNotes: [2, 3],
        melodyLengths: [1, 1.5, 2],
        melodyVelocity: 66,
        musicboxChance: 0.4,
        reverb: 105,
    },
    mysterious: {
        tonic: "i",
        mode: "minor",
        melodyChance: 0.5,
        melodyNotes: [1, 2],
        melodyLengths: [1.5, 2],
        melodyVelocity: 54,
        musicboxChance: 0.25,
        reverb: 120,
    },
};

export const MOODS: readonly Mood[] = [
    "peaceful",
    "dreamy",
    "nostalgic",
    "mysterious",
];

interface StyleProfile {
    label: string;
    description: string;
    progressions: Record<Mode, readonly (readonly ChordName[])[]>;
    extension: ChordExtension;
    swing: number;
    arpStep: number;
    arpPattern: ArpPattern;
    bassPattern: BassPattern;
    padArticulation: PadArticulation;
    drumPattern: DrumPatternId | null;
    melodyDensity: number;
    reverb: number;
    groove: number;
    counterpoint: number;
}

const STYLE_PROFILES: Record<Style, StyleProfile> = {
    ambient: {
        label: "Ambient",
        description: "Slow sustained pads, unhurried arpeggios and airy space.",
        progressions: {
            major: [
                ["I", "V", "vi", "IV"],
                ["I", "vi", "IV", "V"],
                ["I", "iii", "IV", "I"],
                ["IV", "I", "V", "vi"],
            ],
            minor: [
                ["i", "bVI", "bIII", "bVII"],
                ["i", "iv", "bVII", "bIII"],
                ["i", "bVII", "bVI", "iv"],
            ],
        },
        extension: "ninth",
        swing: 0,
        arpStep: 0.5,
        arpPattern: "updown",
        bassPattern: "pedal",
        padArticulation: "sustain",
        drumPattern: null,
        melodyDensity: 0.8,
        reverb: 112,
        groove: 6,
        counterpoint: 0.2,
    },
    cinematic: {
        label: "Cinematic",
        description: "Wide swells, low foundations and sparse dramatic hits.",
        progressions: {
            major: [
                ["I", "V", "vi", "IV"],
                ["vi", "IV", "I", "V"],
                ["I", "IV", "vi", "V"],
                ["IV", "I", "V", "I"],
            ],
            minor: [
                ["i", "bVI", "bIII", "bVII"],
                ["i", "iv", "v", "i"],
                ["i", "bVII", "bVI", "bIII"],
            ],
        },
        extension: "triad",
        swing: 0,
        arpStep: 1,
        arpPattern: "down",
        bassPattern: "pedal",
        padArticulation: "swell",
        drumPattern: "cinematic",
        melodyDensity: 0.7,
        reverb: 118,
        groove: 4,
        counterpoint: 0.35,
    },
    lofi: {
        label: "Lo-fi",
        description: "Lazy swing, warm seventh chords and dusty drums.",
        progressions: {
            major: [
                ["ii", "V", "I", "vi"],
                ["I", "vi", "ii", "V"],
                ["IV", "iii", "ii", "I"],
                ["vi", "ii", "V", "I"],
            ],
            minor: [
                ["i", "bVII", "bVI", "v"],
                ["i", "iv", "bVII", "bIII"],
                ["i", "v", "bVI", "iv"],
            ],
        },
        extension: "seventh",
        swing: 0.33,
        arpStep: 0.5,
        arpPattern: "broken",
        bassPattern: "root",
        padArticulation: "sustain",
        drumPattern: "lofi",
        melodyDensity: 0.75,
        reverb: 96,
        groove: 14,
        counterpoint: 0.3,
    },
    classical: {
        label: "Classical",
        description: "Chamber counterpoint, broken chords and restrained dynamics.",
        progressions: {
            major: [
                ["I", "IV", "V", "I"],
                ["I", "vi", "IV", "V"],
                ["I", "ii", "V", "I"],
                ["I", "IV", "I", "V"],
            ],
            minor: [
                ["i", "iv", "v", "i"],
                ["i", "bVI", "iv", "v"],
                ["i", "bVII", "bIII", "bVI"],
            ],
        },
        extension: "triad",
        swing: 0,
        arpStep: 0.5,
        arpPattern: "up",
        bassPattern: "root",
        padArticulation: "sustain",
        drumPattern: null,
        melodyDensity: 0.9,
        reverb: 90,
        groove: 3,
        counterpoint: 0.45,
    },
    jazz: {
        label: "Jazz",
        description: "Swung ride, walking bass and conversational seventh chords.",
        progressions: {
            major: [
                ["ii", "V", "I", "vi"],
                ["I", "vi", "ii", "V"],
                ["iii", "vi", "ii", "V"],
                ["I", "IV", "iii", "vi"],
            ],
            minor: [
                ["i", "iv", "v", "i"],
                ["i", "bVII", "bVI", "v"],
                ["i", "bVI", "iv", "v"],
            ],
        },
        extension: "seventh",
        swing: 0.55,
        arpStep: 0.5,
        arpPattern: "broken",
        bassPattern: "walking",
        padArticulation: "stabs",
        drumPattern: "jazz",
        melodyDensity: 0.85,
        reverb: 80,
        groove: 8,
        counterpoint: 0.5,
    },
    electronic: {
        label: "Electronic",
        description: "Four-on-the-floor pulse, octave bass and crisp arpeggios.",
        progressions: {
            major: [
                ["I", "V", "vi", "IV"],
                ["vi", "IV", "I", "V"],
                ["I", "IV", "I", "V"],
                ["IV", "V", "vi", "I"],
            ],
            minor: [
                ["i", "bVI", "bIII", "bVII"],
                ["i", "bVII", "bVI", "v"],
                ["i", "iv", "bVII", "bIII"],
            ],
        },
        extension: "seventh",
        swing: 0,
        arpStep: 0.25,
        arpPattern: "up",
        bassPattern: "octaves",
        padArticulation: "stabs",
        drumPattern: "electronic",
        melodyDensity: 0.8,
        reverb: 88,
        groove: 2,
        counterpoint: 0.25,
    },
    folk: {
        label: "Folk",
        description: "Acoustic strumming, simple bass and hand percussion.",
        progressions: {
            major: [
                ["I", "IV", "I", "V"],
                ["I", "V", "IV", "I"],
                ["I", "vi", "IV", "V"],
                ["I", "IV", "V", "I"],
            ],
            minor: [
                ["i", "bVII", "bIII", "bVII"],
                ["i", "iv", "i", "v"],
                ["i", "bVII", "bVI", "bVII"],
            ],
        },
        extension: "triad",
        swing: 0.08,
        arpStep: 0.5,
        arpPattern: "broken",
        bassPattern: "root",
        padArticulation: "sustain",
        drumPattern: "folk",
        melodyDensity: 0.9,
        reverb: 70,
        groove: 8,
        counterpoint: 0.35,
    },
    minimal: {
        label: "Minimal",
        description: "Repetitive cells, long tones and carefully placed silence.",
        progressions: {
            major: [
                ["I", "I", "IV", "I"],
                ["I", "V", "I", "I"],
                ["I", "IV", "I", "IV"],
            ],
            minor: [
                ["i", "i", "bVI", "i"],
                ["i", "bVII", "i", "i"],
            ],
        },
        extension: "triad",
        swing: 0,
        arpStep: 0.25,
        arpPattern: "up",
        bassPattern: "pulse",
        padArticulation: "sustain",
        drumPattern: "minimal",
        melodyDensity: 0.55,
        reverb: 104,
        groove: 3,
        counterpoint: 0.15,
    },
    drone: {
        label: "Drone",
        description: "Held harmony, slow timbral drift and almost no rhythm.",
        progressions: {
            major: [["I", "I", "I", "I"]],
            minor: [["i", "i", "i", "i"]],
        },
        extension: "triad",
        swing: 0,
        arpStep: 1,
        arpPattern: "up",
        bassPattern: "pedal",
        padArticulation: "sustain",
        drumPattern: null,
        melodyDensity: 0.35,
        reverb: 126,
        groove: 2,
        counterpoint: 0.1,
    },
};

export const STYLES: readonly Style[] = [
    "ambient",
    "cinematic",
    "lofi",
    "classical",
    "jazz",
    "electronic",
    "folk",
    "minimal",
    "drone",
];

export function styleLabel(style: Style): string {
    return STYLE_PROFILES[style].label;
}

export function styleDescription(style: Style): string {
    return STYLE_PROFILES[style].description;
}

export function moodLabel(mood: Mood): string {
    return mood.charAt(0).toUpperCase() + mood.slice(1);
}

export interface AmbientMidiOptions {
    duration: number;
    bpm: number;
    key: KeyName;
    mood: Mood;
    style: Style;
    variation: number;
    instruments: Instrument[];
    seed: number;
    rhythm: boolean;
    randomStops: boolean;
}

export type AmbientMidiProps = Partial<AmbientMidiOptions>;

export const AMBIENT_MIDI_DEFAULTS: AmbientMidiOptions = {
    duration: 120,
    bpm: 64,
    key: "C",
    mood: "peaceful",
    style: "ambient",
    variation: 50,
    instruments: [...DEFAULT_INSTRUMENTS],
    seed: 12345,
    rhythm: false,
    randomStops: false,
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
    style: Style;
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

interface MelodyResult {
    notes: MelodyNote[];
    anchor: number | null;
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

/**
 * Drop whole bars of silence at the start of the piece. Setup, controller and
 * meta events stay at tick 0; musical events shift left and the duration
 * shrinks, so a piece whose first instrument enters late starts immediately.
 */
function trimLeadingEmptyBars(
    tracks: MidiEvent[][],
    totalTicks: number,
    barTicks: number,
): number {
    let firstNoteTick = Infinity;

    for (const track of tracks) {
        for (const event of track) {
            if (
                event.data.length > 2
                && (event.data[0] & 0xf0) === 0x90
                && event.data[2] > 0
            ) {
                firstNoteTick = Math.min(firstNoteTick, event.tick);
            }
        }
    }

    if (!Number.isFinite(firstNoteTick)) return totalTicks;

    // Humanization can pull a downbeat a few ticks into the previous bar.
    // Treat that as the downbeat bar so the first real bar is not left behind.
    const maxShift = Math.floor((totalTicks - 1) / barTicks) * barTicks;
    const shift = Math.min(
        maxShift,
        Math.floor((firstNoteTick + BAR_SNAP_TICKS) / barTicks) * barTicks,
    );

    if (shift <= 0) return totalTicks;

    for (const track of tracks) {
        for (const event of track) {
            event.tick = Math.max(0, event.tick - shift);
        }
    }

    return totalTicks - shift;
}

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

function chordIntervals(
    name: ChordName,
    extension: ChordExtension,
): number[] {
    const base = [...CHORDS[name]];

    if (extension === "triad") return base;

    const root = base[0];
    const minorThird = base[1] - root === 3;
    const seventh = root + (minorThird ? 10 : 11);

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
    style: StyleProfile,
    variation: number,
    low: number,
    high: number,
    chanceScale: number,
    anchor: number | null,
    force = false,
): MelodyResult {
    const profile = MOOD_PROFILES[mood];
    const variationFactor = 0.5 + variation / 100;
    const chance = clamp(
        profile.melodyChance * style.melodyDensity * chanceScale,
        0,
        1,
    );

    if (!force && random() > chance) return { notes: [], anchor };

    const [minimum, maximum] = profile.melodyNotes;
    const extra = variation >= 60 ? 1 : 0;
    const targetCount = minimum
        + Math.floor(random() * (maximum - minimum + 1 + extra));
    const scale = scalePitches(MOOD_NOTES[mood], root, low, high);
    const chordPool = chordTones
        .flatMap(pitch => [pitch, pitch + 12, pitch + 24])
        .filter(pitch => pitch >= low && pitch <= high);

    if (chordPool.length === 0) {
        chordPool.push(...scale);
    }

    const notes: MelodyNote[] = [];
    let beat = random() < 0.4 ? choose(random, [1, 2]) : 0;
    let previous: MelodyNote | null = null;
    let lastPitch = anchor;

    while (notes.length < targetCount && beat < 4) {
        const strong = beat === 0 || beat === 1 || beat === 2;
        const useChordTone = strong || random() < 0.45;
        const pool = useChordTone ? chordPool : scale;
        const target = lastPitch ?? choose(random, chordPool);
        const motion = choose(random, [-2, -1, 1, 2]);
        let pitch = useChordTone
            ? nearestPitch(random, pool, target)
            : nearestPitch(random, pool, target + motion);

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
        let length = Math.min(
            choose(random, profile.melodyLengths) * variationFactor,
            maxLength,
        );

        if (length < 0.25) break;

        // Occasional grace note a step before the main note.
        if (
            variation > 30
            && random() < 0.12 * (variation / 100)
            && beat >= 0.5
            && (!previous || previous.beat + previous.length <= beat - 0.25)
        ) {
            const gracePitch = nearestPitch(
                random,
                scale,
                pitch + (random() < 0.5 ? -1 : 1),
            );

            if (gracePitch !== pitch) {
                notes.push({
                    pitch: gracePitch,
                    beat: beat - 0.25,
                    length: 0.22,
                    velocity: clamp(
                        profile.melodyVelocity + jitter(random, 8),
                        20,
                        100,
                    ),
                });
            }
        }

        const note: MelodyNote = {
            pitch,
            beat,
            length,
            velocity: clamp(
                profile.melodyVelocity + jitter(random, 6),
                20,
                100,
            ),
        };

        notes.push(note);
        previous = note;
        lastPitch = pitch;
        beat += length + (random() < 0.45 ? choose(random, [0.5, 1]) : 0);
        beat = Math.round(beat * 2) / 2;
    }

    for (const note of notes) {
        note.length = Math.min(note.length, 4 - note.beat);
    }

    return { notes, anchor: lastPitch };
}

interface DrumHit {
    step: number;
    note: number;
    velocity: number;
}

const DRUM_NOTE = {
    kick: 36,
    kickSoft: 35,
    snare: 38,
    clap: 39,
    closedHat: 42,
    openHat: 46,
    ride: 51,
    rideBell: 53,
    crash: 49,
    lowTom: 45,
    midTom: 47,
    highTom: 50,
    conga: 63,
    shaker: 70,
    claves: 75,
    woodblock: 76,
};

function hits(
    note: number,
    steps: readonly number[],
    velocity: number,
): DrumHit[] {
    return steps.map(step => ({ step, note, velocity }));
}

const DRUM_PATTERNS: Record<DrumPatternId, readonly DrumHit[]> = {
    cinematic: [
        ...hits(DRUM_NOTE.kick, [0, 8], 92),
        ...hits(DRUM_NOTE.lowTom, [10], 58),
        ...hits(DRUM_NOTE.snare, [12], 74),
        ...hits(DRUM_NOTE.crash, [0], 68),
    ],
    lofi: [
        ...hits(DRUM_NOTE.kick, [0, 7, 10], 88),
        ...hits(DRUM_NOTE.snare, [4, 12], 76),
        ...hits(DRUM_NOTE.closedHat, [0, 2, 4, 6, 8, 10, 12], 42),
        ...hits(DRUM_NOTE.openHat, [14], 52),
        ...hits(DRUM_NOTE.shaker, [3, 11], 30),
    ],
    jazz: [
        ...hits(DRUM_NOTE.kick, [0, 8], 40),
        ...hits(DRUM_NOTE.snare, [4, 12], 58),
        ...hits(DRUM_NOTE.ride, [0, 3, 4, 6, 8, 11, 12, 14], 58),
        ...hits(DRUM_NOTE.rideBell, [6], 48),
    ],
    electronic: [
        ...hits(DRUM_NOTE.kick, [0, 4, 8, 12], 98),
        ...hits(DRUM_NOTE.clap, [4, 12], 78),
        ...hits(DRUM_NOTE.closedHat, [2, 6, 10, 14], 46),
        ...hits(DRUM_NOTE.openHat, [14], 58),
        ...hits(DRUM_NOTE.crash, [0], 54),
    ],
    folk: [
        ...hits(DRUM_NOTE.kick, [0, 8], 74),
        ...hits(DRUM_NOTE.snare, [4, 12], 62),
        ...hits(DRUM_NOTE.shaker, [0, 2, 4, 6, 8, 10, 12, 14], 38),
        ...hits(DRUM_NOTE.conga, [3, 7, 11, 15], 48),
    ],
    minimal: [
        ...hits(DRUM_NOTE.kick, [0], 62),
        ...hits(DRUM_NOTE.closedHat, [6, 14], 30),
        ...hits(DRUM_NOTE.claves, [4, 12], 34),
    ],
    soft: [
        ...hits(DRUM_NOTE.kick, [0, 8], 46),
        ...hits(DRUM_NOTE.shaker, [4, 12], 28),
        ...hits(DRUM_NOTE.closedHat, [6, 14], 24),
    ],
};

function buildArpOrder(
    random: Random,
    pattern: ArpPattern,
    count: number,
): number[] {
    const ascending = Array.from({ length: count }, (_, index) => index);

    if (pattern === "down") return ascending.reverse();
    if (pattern === "updown") {
        const down = ascending.slice(1, -1).reverse();
        return [...ascending, ...down];
    }
    if (pattern === "broken") {
        const even = ascending.filter(index => index % 2 === 0);
        const odd = ascending.filter(index => index % 2 === 1);
        return [...even, ...odd];
    }
    if (pattern === "random") {
        for (let index = ascending.length - 1; index > 0; index--) {
            const swap = Math.floor(random() * (index + 1));
            [ascending[index], ascending[swap]] = [ascending[swap], ascending[index]];
        }
    }
    return ascending;
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
        style,
        variation,
        instruments,
        seed,
        rhythm,
        randomStops,
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

    if (!Object.hasOwn(STYLE_PROFILES, style))
        throw new Error("Unsupported style");

    if (!Number.isFinite(variation) || variation < 0 || variation > 100)
        throw new Error("variation must be between 0 and 100");

    if (!Number.isInteger(seed))
        throw new Error("seed must be an integer");

    if (typeof rhythm !== "boolean")
        throw new Error("rhythm must be a boolean");

    if (typeof randomStops !== "boolean")
        throw new Error("randomStops must be a boolean");

    if (!Array.isArray(instruments) || instruments.length === 0)
        throw new Error("at least one instrument is required");

    if (new Set(instruments).size !== instruments.length)
        throw new Error("instruments must be unique");

    for (const instrument of instruments) {
        if (!INSTRUMENT_BY_ID.has(instrument))
            throw new Error(`Unknown instrument: ${instrument}`);
    }

    const melodicCount = instruments.filter(
        instrument => instrument !== DRUM_KIT.id
    ).length;

    if (melodicCount > MAX_MELODIC_INSTRUMENTS)
        throw new Error(
            `at most ${MAX_MELODIC_INSTRUMENTS} melodic instruments are supported`
        );

    const profile = MOOD_PROFILES[mood];
    const styleProfile = STYLE_PROFILES[style];
    const variationFactor = 0.5 + variation / 100;
    const resolvedSeed = seed === -1
        ? Math.floor(Math.random() * 2 ** 32)
        : seed;
    const random = createRandom(resolvedSeed);
    const keyRoot = KEYS[key];

    const totalTicks = Math.round(duration * bpm / 60 * TICK_RATE);
    const bars = Math.ceil(totalTicks / BAR);
    const instrumentDefs = instruments.map(
        instrument => INSTRUMENT_BY_ID.get(instrument) as InstrumentDef
    );

    // The rhythm toggle layers a beat on top of the selected instruments
    // without changing the user's instrument list.
    if (rhythm && !instrumentDefs.some(instrument => instrument.role === "drums")) {
        instrumentDefs.push(DRUM_KIT);
    }

    const roles = new Set(instrumentDefs.map(instrument => instrument.role));
    const hasLead = roles.has("lead");
    const hasBass = roles.has("bass");
    const hasPluck = roles.has("pluck");

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
        if (pitch < 0 || pitch > 127) return;

        const onTick = clamp(Math.round(start), 0, totalTicks);
        const offTick = Math.min(
            Math.max(onTick + 1, Math.round(start + length)),
            totalTicks,
        );

        if (onTick >= totalTicks || offTick <= onTick) return;

        const on: MidiEvent = {
            tick: onTick,
            data: [0x90 | channel, pitch, clamp(Math.round(velocity), 1, 127)],
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

    const ROLE_MIX: Record<Role, { volume: number; pan: number }> = {
        keys: { volume: 96, pan: 0 },
        pad: { volume: 70, pan: 0 },
        bass: { volume: 86, pan: 0 },
        pluck: { volume: 76, pan: -24 },
        bells: { volume: 78, pan: 32 },
        lead: { volume: 82, pan: 12 },
        texture: { volume: 52, pan: -30 },
        percussion: { volume: 76, pan: 24 },
        drums: { volume: 84, pan: 0 },
    };

    function makeTrack(
        instrument: InstrumentDef,
        channel: number,
    ): MidiEvent[] {
        const track: MidiEvent[] = [];
        const nameBytes = asciiBytes(instrument.label);
        const mix = ROLE_MIX[instrument.role];

        addEvent(track, 0, [
            0xff, 0x03,
            ...vlq(nameBytes.length),
            ...nameBytes,
        ], 0);

        if (instrument.program !== null) {
            addEvent(track, 0, [
                0xc0 | channel,
                instrument.program,
            ], 0);
        }

        addEvent(track, 0, [0xb0 | channel, 7, mix.volume], 0);
        addEvent(track, 0, [0xb0 | channel, 10, mix.pan + 64], 0);
        addEvent(track, 0, [
            0xb0 | channel,
            91,
            Math.round((profile.reverb + styleProfile.reverb) / 2),
        ], 0);

        // Full expression immediately: a step to 0 at tick 0 would mute the
        // first bars, since MIDI controllers do not interpolate.
        addEvent(track, 0, [0xb0 | channel, 11, 100], 0);

        if (totalTicks >= BAR) {
            // Ramp the expression down over the final bar in small steps.
            const fadeStart = totalTicks - BAR;
            const fadeSteps = 16;

            for (let step = 0; step <= fadeSteps; step++) {
                addEvent(
                    track,
                    fadeStart + BAR * step / fadeSteps,
                    [0xb0 | channel, 11, Math.round(100 * (1 - step / fadeSteps))],
                    0,
                );
            }
        } else {
            addEvent(track, totalTicks, [0xb0 | channel, 11, 0], 0);
        }

        return track;
    }

    function swingBeat(beat: number): number {
        const fraction = beat - Math.floor(beat);

        if (Math.abs(fraction - 0.5) < 0.01)
            return beat + styleProfile.swing * 0.5;
        if (Math.abs(fraction - 0.75) < 0.01)
            return beat + styleProfile.swing * 0.35;
        if (Math.abs(fraction - 0.25) < 0.01)
            return beat + styleProfile.swing * 0.2;

        return beat;
    }

    function humanize(base: number): number {
        return Math.round(
            (random() * 2 - 1) * base * (0.35 + variation / 140)
        );
    }

    function beatTick(bar: number, beat: number): number {
        return bar * BAR + swingBeat(beat) * TICK_RATE + humanize(styleProfile.groove);
    }

    function velocity(base: number, energy: number, amount = 5): number {
        return clamp(
            Math.round(base * (0.84 + 0.16 * energy)) + jitter(random, amount),
            1,
            127,
        );
    }

    // Arrangement: roles enter in layers and thin out for the outro.
    const introBars = bars >= 6 ? Math.min(2, Math.floor(bars * 0.1)) : 0;
    const outroBars = bars >= 6 ? Math.min(2, Math.floor(bars * 0.08)) : 0;
    const bodyStart = introBars;
    const bodyEnd = Math.max(bodyStart + 1, bars - outroBars);
    const rhythmVerseStart = bodyStart
        + Math.floor((bodyEnd - bodyStart) * 0.2);
    const rhythmVerseEnd = Math.max(
        rhythmVerseStart + 1,
        bodyStart + Math.floor((bodyEnd - bodyStart) * 0.75),
    );

    // Long-running parts occasionally rest for a whole bar. The rest lands on
    // a bar line, never on the first body bar or the final resolution.
    const stopBarsByInstrument = new Map<string, Set<number>>();

    if (randomStops) {
        const longInstruments = instrumentDefs.filter(
            instrument => instrument.role === "pad"
                || instrument.role === "texture"
                || instrument.role === "bass"
        );
        const stopChance = 0.04 + variation * 0.0016;
        const stopRandom = createRandom(resolvedSeed ^ 0x9e3779b9);

        if (longInstruments.length > 0) {
            for (let bar = bodyStart + 1; bar < bodyEnd - 1; bar++) {
                if (stopRandom() >= stopChance) continue;

                const instrument = choose(stopRandom, longInstruments);
                const stops = stopBarsByInstrument.get(instrument.id)
                    ?? new Set<number>();

                stops.add(bar);
                stopBarsByInstrument.set(instrument.id, stops);
            }
        }
    }

    function roleStart(role: Role): number {
        const lastBar = Math.max(0, bars - 1);

        switch (role) {
            case "pad":
            case "texture":
                return 0;
            case "bass":
            case "keys":
                return Math.min(lastBar, introBars);
            case "pluck":
            case "percussion":
                return Math.min(lastBar, introBars + 1);
            case "bells":
                return Math.min(lastBar, introBars + 2);
            case "drums":
                return Math.min(lastBar, introBars + 1);
            case "lead":
                return Math.min(
                    lastBar,
                    introBars + Math.max(2, Math.floor(bars * 0.15)),
                );
            default:
                return Math.min(lastBar, introBars);
        }
    }

    function roleActive(role: Role, bar: number): boolean {
        const start = roleStart(role);

        if (bar < start) return false;

        const sustainsOutro = (
            role === "pad"
            || role === "keys"
            || role === "bass"
            || role === "texture"
            || role === "bells"
        );

        if (bar >= bodyEnd && !sustainsOutro) return false;

        if (
            bar > start
            && bar < bodyEnd
            && (role === "lead" || role === "pluck" || role === "percussion")
            && random() < 0.035 * variationFactor
        ) {
            return false;
        }

        return true;
    }

    function energyAt(bar: number): number {
        if (bar < bodyStart) {
            return 0.62 + 0.38 * (bar / Math.max(1, bodyStart));
        }

        if (bar >= bodyEnd) return 0.58;

        return 1;
    }

    const progression = choose(random, styleProfile.progressions[profile.mode]);
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
        const intervals = chordIntervals(chord, styleProfile.extension).map(
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

    let nextChannel = 0;

    function allocateChannel(): number {
        while (nextChannel === DRUM_CHANNEL) nextChannel++;

        if (nextChannel > 15) {
            throw new Error(
                `at most ${MAX_MELODIC_INSTRUMENTS} melodic instruments are supported`
            );
        }

        return nextChannel++;
    }

    const roleInstances = new Map<Role, number>();

    function bassRootFor(chord: ChordName): number {
        const chordRoot = CHORDS[chord][0];
        let root = 36 + ((keyRoot + chordRoot) % 12);

        if (root > 47) root -= 12;

        return root;
    }

    function chordTonesFor(chord: ChordName, root: number): number[] {
        const chordRoot = CHORDS[chord][0];
        const tones = chordIntervals(chord, styleProfile.extension).map(
            interval => root + interval - chordRoot
        );

        return tones.map(tone => {
            while (tone < 32) {
                tone += 12;
            }

            while (tone > 55) {
                tone -= 12;
            }

            return tone;
        });
    }

    for (const instrument of instrumentDefs) {
        const role = instrument.role;
        const roleInstance = roleInstances.get(role) ?? 0;
        const channel = role === "drums" ? DRUM_CHANNEL : allocateChannel();
        const track = makeTrack(instrument, channel);
        const spans: NoteSpan[] = [];
        const stopBars = stopBarsByInstrument.get(instrument.id);
        let melodyAnchor: number | null = null;

        roleInstances.set(role, roleInstance + 1);

        for (let bar = 0; bar < bars; bar++) {
            if (!roleActive(role, bar)) continue;
            if (stopBars?.has(bar)) continue;

            const start = bar * BAR;
            const energy = energyAt(bar);
            const { chord, voicing } = harmony[bar];

            if (role === "keys") {
                const bassRoot = bassRootFor(chord);

                if (!hasBass) {
                    for (const beat of [0, 2]) {
                        addNote(
                            track,
                            channel,
                            bassRoot + (beat === 2 ? 7 : 0),
                            beatTick(bar, beat),
                            TICK_RATE * 1.8,
                            velocity(66, energy),
                            spans,
                        );
                    }
                }

                const compBeats = styleProfile.padArticulation === "stabs"
                    ? [0, 2]
                    : [0];
                const compLength = styleProfile.padArticulation === "stabs"
                    ? TICK_RATE * 0.7
                    : BAR * 0.94;

                for (const beat of compBeats) {
                    for (const pitch of voicing) {
                        addNote(
                            track,
                            channel,
                            pitch,
                            beatTick(bar, beat),
                            compLength,
                            velocity(48 + jitter(random, 4), energy, 4),
                            spans,
                        );
                    }
                }

                if (!hasPluck) {
                    const step = Math.max(styleProfile.arpStep, 0.5);
                    const steps = Math.round(BEATS_PER_BAR / step);
                    const tones = [
                        ...voicing.map(pitch => pitch - 12),
                        ...voicing,
                    ];
                    const order = buildArpOrder(
                        random,
                        styleProfile.arpPattern,
                        tones.length,
                    );

                    for (let index = 0; index < steps; index++) {
                        const beat = index * step;
                        const pitch = tones[order[index % order.length]] + (
                            roleInstance > 0 ? 12 : 0
                        );

                        addNote(
                            track,
                            channel,
                            pitch,
                            beatTick(bar, beat),
                            Math.min(step * 1.6, BEATS_PER_BAR - beat) * TICK_RATE,
                            velocity(
                                (beat === 0 ? 64 : 54) + jitter(random, 4),
                                energy,
                                4,
                            ),
                            spans,
                        );
                    }
                }

                if (!hasLead) {
                    const melody = generateMelody(
                        random,
                        keyRoot,
                        mood,
                        voicing,
                        styleProfile,
                        variation,
                        69,
                        91,
                        0.9 + styleProfile.counterpoint * 0.2,
                        melodyAnchor,
                    );

                    melodyAnchor = melody.anchor;

                    for (const note of melody.notes) {
                        addNote(
                            track,
                            channel,
                            note.pitch,
                            start + note.beat * TICK_RATE + humanize(styleProfile.groove * 0.5),
                            note.length * TICK_RATE,
                            velocity(note.velocity, energy, 4),
                            spans,
                        );
                    }
                }
            }

            if (role === "pad") {
                const articulation = styleProfile.padArticulation;
                const beats = articulation === "sustain" ? [0] : [0, 2];
                const length = articulation === "stabs"
                    ? TICK_RATE * 0.8
                    : articulation === "swell"
                        ? TICK_RATE * 1.9
                        : BAR * 0.96;

                for (const [index, beat] of beats.entries()) {
                    const swell = articulation === "swell"
                        ? 0.78 + index * 0.18
                        : 1;

                    for (const pitch of voicing) {
                        addNote(
                            track,
                            channel,
                            pitch + (roleInstance > 0 ? 12 : 0),
                            beatTick(bar, beat),
                            length,
                            velocity(50 * swell, energy, 3),
                            spans,
                        );
                    }
                }

                if (roleInstance === 0 && !hasBass) {
                    const bassRoot = bassRootFor(chord);

                    addNote(
                        track,
                        channel,
                        bassRoot,
                        start,
                        BAR * 0.98,
                        velocity(36, energy, 2),
                        spans,
                    );
                }
            }

            if (role === "bass") {
                const root = bassRootFor(chord) + (roleInstance > 0 ? -12 : 0);
                const fifth = root + 7;
                const octave = root + 12;
                const tones = chordTonesFor(chord, root);
                const pattern = styleProfile.bassPattern;

                if (pattern === "pedal") {
                    addNote(
                        track,
                        channel,
                        root,
                        start,
                        BAR * 0.98,
                        velocity(68, energy, 3),
                        spans,
                    );
                } else if (pattern === "root") {
                    for (const [beat, pitch] of [[0, root], [2, fifth]] as const) {
                        addNote(
                            track,
                            channel,
                            pitch,
                            beatTick(bar, beat),
                            TICK_RATE * 1.8,
                            velocity(70, energy, 3),
                            spans,
                        );
                    }
                } else if (pattern === "pulse") {
                    for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
                        const pitch = beat % 2 === 0 ? root : fifth;

                        addNote(
                            track,
                            channel,
                            pitch,
                            beatTick(bar, beat),
                            TICK_RATE * 0.8,
                            velocity(64 + (beat === 0 ? 6 : 0), energy, 3),
                            spans,
                        );
                    }
                } else if (pattern === "walking") {
                    const nextRoot = bassRootFor(harmony[(bar + 1) % bars].chord);
                    const approach = nextRoot + (nextRoot > root ? -1 : 1);
                    const walk = [
                        root,
                        tones[1] ?? fifth,
                        tones[2] ?? octave,
                        approach,
                    ];

                    for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
                        addNote(
                            track,
                            channel,
                            walk[beat],
                            beatTick(bar, beat),
                            TICK_RATE * 0.85,
                            velocity(66 + (beat === 0 ? 6 : 0), energy, 5),
                            spans,
                        );
                    }
                } else {
                    for (let step = 0; step < BEATS_PER_BAR * 2; step++) {
                        const beat = step * 0.5;
                        const pitch = step % 2 === 0 ? root : octave;

                        addNote(
                            track,
                            channel,
                            pitch,
                            beatTick(bar, beat),
                            TICK_RATE * 0.38,
                            velocity(62 + (step % 4 === 0 ? 8 : 0), energy, 3),
                            spans,
                        );
                    }
                }
            }

            if (role === "pluck") {
                const step = styleProfile.arpStep;
                const steps = Math.round(BEATS_PER_BAR / step);
                const tones = [
                    ...voicing.map(pitch => pitch - 12),
                    ...voicing,
                    ...voicing.map(pitch => pitch + 12),
                ].filter(pitch => pitch >= 36 && pitch <= 96);
                const order = buildArpOrder(
                    random,
                    styleProfile.arpPattern,
                    tones.length,
                );
                const transpose = roleInstance > 0 ? -12 : 0;

                for (let index = 0; index < steps; index++) {
                    const beat = index * step;
                    const pitch = tones[order[index % order.length]] + transpose;

                    addNote(
                        track,
                        channel,
                        pitch,
                        beatTick(bar, beat),
                        Math.min(step * 2.4, BEATS_PER_BAR - beat) * TICK_RATE,
                        velocity(
                            (beat === 0 ? 68 : 54) + jitter(random, 5),
                            energy,
                            5,
                        ),
                        spans,
                    );
                }
            }

            if (role === "bells") {
                const chance = profile.musicboxChance * styleProfile.melodyDensity;
                const force = bar === roleStart("bells");

                if (force || random() < chance) {
                    const beat = force
                        ? 0
                        : choose(random, [0.5, 1, 1.5, 2, 2.5, 3]);
                    const base = choose(random, voicing) + 12;
                    const pitch = base + choose(random, [0, 0, 12]);

                    addNote(
                        track,
                        channel,
                        pitch,
                        beatTick(bar, beat),
                        Math.min(TICK_RATE * 1.6, (BEATS_PER_BAR - beat) * TICK_RATE),
                        velocity(58, energy, 4),
                        spans,
                    );

                    if (variation > 45 && random() < 0.3) {
                        addNote(
                            track,
                            channel,
                            pitch + 7,
                            beatTick(bar, beat + 0.5),
                            TICK_RATE * 1.2,
                            velocity(46, energy, 4),
                            spans,
                        );
                    }
                }
            }

            if (role === "lead") {
                const transpose = roleInstance > 0 ? -12 : 0;
                const melody = generateMelody(
                    random,
                    keyRoot,
                    mood,
                    voicing,
                    styleProfile,
                    variation,
                    64 + transpose,
                    90 + transpose,
                    roleInstance > 0 ? 0.55 : 1,
                    melodyAnchor,
                    bar === roleStart("lead"),
                );

                melodyAnchor = melody.anchor;

                for (const note of melody.notes) {
                    addNote(
                        track,
                        channel,
                        note.pitch + transpose,
                        start + note.beat * TICK_RATE + humanize(styleProfile.groove * 0.5),
                        note.length * TICK_RATE,
                        velocity(note.velocity, energy, 4),
                        spans,
                    );
                }

                // A sustained counterline keeps long instrumental passages alive.
                if (
                    melody.notes.length === 0
                    && styleProfile.counterpoint > 0.25
                    && random() < styleProfile.counterpoint * variationFactor
                ) {
                    const pitch = choose(random, voicing) + 12;

                    addNote(
                        track,
                        channel,
                        pitch,
                        start,
                        BAR * 0.9,
                        velocity(46, energy, 3),
                        spans,
                    );
                }
            }

            if (role === "texture") {
                const force = bar === roleStart("texture");

                if (
                    force
                    || (bar % 2 === 0 && random() < 0.55 * variationFactor)
                ) {
                    const beat = force ? 0 : choose(random, [0, 1, 2]);
                    const pitch = choose(random, voicing) + 12;

                    addNote(
                        track,
                        channel,
                        pitch,
                        beatTick(bar, beat),
                        TICK_RATE * choose(random, [2, 3, 4]),
                        velocity(38, energy, 5),
                        spans,
                    );
                }

                if (variation > 55 && random() < 0.18) {
                    addNote(
                        track,
                        channel,
                        choose(random, voicing) - 12,
                        start,
                        BAR * 0.98,
                        velocity(30, energy, 3),
                        spans,
                    );
                }
            }

            if (role === "percussion") {
                const pattern = bar % 2 === 0
                    ? [0, 1.5, 2, 3]
                    : [0.5, 1, 2.5, 3.5];
                const base = 48 + keyRoot;

                for (const beat of pattern) {
                    if (random() < 0.18) continue;

                    addNote(
                        track,
                        channel,
                        base + choose(random, [0, 0, 7, 12]),
                        beatTick(bar, beat),
                        TICK_RATE * 0.3,
                        velocity(beat === 0 ? 72 : 54, energy, 6),
                        spans,
                    );
                }
            }

            if (role === "drums") {
                const patternId = styleProfile.drumPattern ?? "soft";
                const base = DRUM_PATTERNS[patternId];

                for (const hit of base) {
                    // Crashes mark four-bar phrases instead of every bar.
                    if (
                        (hit.note === DRUM_NOTE.crash
                            || hit.note === DRUM_NOTE.rideBell)
                        && bar % 4 !== 0
                    ) {
                        continue;
                    }

                    const beat = hit.step * 0.25;

                    addNote(
                        track,
                        channel,
                        hit.note,
                        beatTick(bar, beat),
                        TICK_RATE * 0.2,
                        velocity(hit.velocity, energy, 6),
                        spans,
                    );
                }

                // The rhythm toggle thickens the middle of the piece into an
                // actual verse: offbeat hats plus a backbeat where the style
                // has none.
                if (
                    rhythm
                    && bars >= 6
                    && bar >= rhythmVerseStart
                    && bar < rhythmVerseEnd
                ) {
                    for (const step of [2, 6, 10, 14]) {
                        if (base.some(hit =>
                            hit.note === DRUM_NOTE.closedHat && hit.step === step
                        )) {
                            continue;
                        }

                        addNote(
                            track,
                            channel,
                            DRUM_NOTE.closedHat,
                            beatTick(bar, step * 0.25),
                            TICK_RATE * 0.18,
                            velocity(34, energy, 4),
                            spans,
                        );
                    }

                    for (const step of [4, 12]) {
                        if (base.some(hit =>
                            (hit.note === DRUM_NOTE.snare
                                || hit.note === DRUM_NOTE.clap)
                            && hit.step === step
                        )) {
                            continue;
                        }

                        addNote(
                            track,
                            channel,
                            DRUM_NOTE.snare,
                            beatTick(bar, step * 0.25),
                            TICK_RATE * 0.2,
                            velocity(58, energy, 5),
                            spans,
                        );
                    }
                }

                // Small fill at the end of each eight-bar phrase.
                if (variation > 40 && bar % 8 === 7) {
                    for (const [offset, note] of [
                        [3, DRUM_NOTE.snare],
                        [3.25, DRUM_NOTE.snare],
                        [3.5, DRUM_NOTE.highTom],
                        [3.75, DRUM_NOTE.lowTom],
                    ] as const) {
                        addNote(
                            track,
                            channel,
                            note,
                            beatTick(bar, offset),
                            TICK_RATE * 0.18,
                            velocity(58, energy, 6),
                            spans,
                        );
                    }
                }
            }
        }

        cutOverlaps(spans);
        tracks.push(track);
    }

    return {
        tracks,
        totalTicks: trimLeadingEmptyBars(tracks, totalTicks, BAR),
        ticksPerBeat: TICK_RATE,
        bpm,
        seed: resolvedSeed,
        style,
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
