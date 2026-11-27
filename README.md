# Ambient Music Generator

Browser-based ambient MIDI generator and player. Choose duration, tempo, key,
style, mood, variation and instrumentation; the app composes layered parts,
previews them with the General MIDI soundfont, and downloads a `.mid` file.

## Features

- **9 styles** — ambient, cinematic, lo-fi, classical, jazz, electronic, folk,
  minimal and drone. Each style supplies its own progressions, chord
  extensions, swing, arpeggio/bass patterns, pad articulation, drum groove and
  reverb character.
- **4 moods** — peaceful, dreamy, nostalgic and mysterious alter the mode,
  melodic material and harmonic color.
- **Full General MIDI instrument catalog** — 128 melodic programs grouped by
  family plus a drum kit. Up to 15 melodic instruments can be layered at once
  (MIDI channel limit); the generator assigns roles automatically:
  keys, pads, bass, plucked arpeggios, bells, lead melody, texture,
  melodic percussion and drums.
- **Variation control** — humanizes timing and velocity, adds ornaments,
  phrase fills, dropouts and octave doublings.
- **Optional rhythm** — off by default for slow, beatless background music;
  the toggle layers a style-appropriate drum groove and a rhythmic middle
  passage on top of the selected instruments.
- **Arrangement** — parts enter in layers, energy shapes the intro/outro, and
  the final bar resolves to the tonic before fading out.
- **Live preview** — piano roll, realtime playback, progress and volume.
- **MIDI and MP3 download** — the generated piece can be saved as `.mid` or
  rendered offline to a 192 kbps `.mp3`, including a 2 s reverb tail.

## Development

```sh
npm install
npm run dev      # start Vite
npm run build    # type-check and build
npm run preview  # serve the production build
npm run lint
```

Playback uses `spessasynth_lib` with `GeneralUserGS.sf3`; the worklet processor,
soundfont and MP3 encoder wasm are synced into `public/` by
`scripts/sync-spessasynth.mjs`.

MP3 export renders the piece offline with `OfflineAudioContext` and encodes it
with `wasm-media-encoders`. Rendering keeps the whole stereo PCM buffer in
memory (~353 KB per second), so a 10-minute piece needs about 212 MB; mobile
browsers may not handle the longest exports.
