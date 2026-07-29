/**
 * Core Audio - Guitar Tunings Reference
 * Contains common guitar tuning definitions with string indexes, note names, and target frequencies.
 */

import { noteToFrequency } from './note-converter.js?v=2';

/**
 * Builds a string configuration array for a tuning definition.
 * @param {Array<{ stringNum: number, note: string }>} strings 
 */
function buildTuning(strings) {
  return strings.map(s => ({
    stringNum: s.stringNum,
    note: s.note,
    freq: Number(noteToFrequency(s.note).toFixed(2))
  }));
}

import { transposeNote } from './note-converter.js?v=2';

// Base Standard 6 strings
const STANDARD_BASE = [
  { stringNum: 6, note: 'E2' },
  { stringNum: 5, note: 'A2' },
  { stringNum: 4, note: 'D3' },
  { stringNum: 3, note: 'G3' },
  { stringNum: 2, note: 'B3' },
  { stringNum: 1, note: 'E4' }
];

/**
 * Transposes Standard tuning by N semitones (e.g. Capo +1 -> F A# D# G# C F)
 */
function getCapoTuning(semitones) {
  return STANDARD_BASE.map(s => ({
    stringNum: s.stringNum,
    note: transposeNote(s.note, semitones)
  }));
}

export const GUITAR_TUNINGS = {
  standard: {
    name: 'Standard (E A D G B E) [Capo 0]',
    id: 'standard',
    strings: buildTuning(STANDARD_BASE)
  },
  // Capo Negative (-4 to -1)
  capo_minus_4: { name: 'Capo -4 / C Standard (C F A# D# G C)', id: 'capo_minus_4', strings: buildTuning(getCapoTuning(-4)) },
  capo_minus_3: { name: 'Capo -3 / C# Standard (C# F# B E G# C#)', id: 'capo_minus_3', strings: buildTuning(getCapoTuning(-3)) },
  capo_minus_2: { name: 'Capo -2 / D Standard (D G C F A D)', id: 'capo_minus_2', strings: buildTuning(getCapoTuning(-2)) },
  capo_minus_1: { name: 'Capo -1 / Eb Standard (D# G# C# F# A# D#)', id: 'capo_minus_1', strings: buildTuning(getCapoTuning(-1)) },

  // Capo Positive (+1 to +12)
  capo_plus_1: { name: 'Capo +1 (F A# D# G# C F)', id: 'capo_plus_1', strings: buildTuning(getCapoTuning(1)) },
  capo_plus_2: { name: 'Capo +2 (F# B E A C# F#)', id: 'capo_plus_2', strings: buildTuning(getCapoTuning(2)) },
  capo_plus_3: { name: 'Capo +3 (G C F A# D G)', id: 'capo_plus_3', strings: buildTuning(getCapoTuning(3)) },
  capo_plus_4: { name: 'Capo +4 (G# C# F# B D# G#)', id: 'capo_plus_4', strings: buildTuning(getCapoTuning(4)) },
  capo_plus_5: { name: 'Capo +5 (A D G C E A)', id: 'capo_plus_5', strings: buildTuning(getCapoTuning(5)) },
  capo_plus_6: { name: 'Capo +6 (A# D# G# C# F A#)', id: 'capo_plus_6', strings: buildTuning(getCapoTuning(6)) },
  capo_plus_7: { name: 'Capo +7 (B E A D F# B)', id: 'capo_plus_7', strings: buildTuning(getCapoTuning(7)) },
  capo_plus_8: { name: 'Capo +8 (C F A# D# G C)', id: 'capo_plus_8', strings: buildTuning(getCapoTuning(8)) },
  capo_plus_9: { name: 'Capo +9 (C# F# B E G# C#)', id: 'capo_plus_9', strings: buildTuning(getCapoTuning(9)) },
  capo_plus_10: { name: 'Capo +10 (D G C F A D)', id: 'capo_plus_10', strings: buildTuning(getCapoTuning(10)) },
  capo_plus_11: { name: 'Capo +11 (D# G# C# F# A# D#)', id: 'capo_plus_11', strings: buildTuning(getCapoTuning(11)) },
  capo_plus_12: { name: 'Capo +12 / Octave High (E A D G B E)', id: 'capo_plus_12', strings: buildTuning(getCapoTuning(12)) },

  // Special Alternate Tunings
  dropD: {
    name: 'Drop D (D A D G B E)',
    id: 'dropD',
    strings: buildTuning([
      { stringNum: 6, note: 'D2' },
      { stringNum: 5, note: 'A2' },
      { stringNum: 4, note: 'D3' },
      { stringNum: 3, note: 'G3' },
      { stringNum: 2, note: 'B3' },
      { stringNum: 1, note: 'E4' }
    ])
  },
  openD: {
    name: 'Open D (D A D F# A D)',
    id: 'openD',
    strings: buildTuning([
      { stringNum: 6, note: 'D2' },
      { stringNum: 5, note: 'A2' },
      { stringNum: 4, note: 'D3' },
      { stringNum: 3, note: 'F#3' },
      { stringNum: 2, note: 'A3' },
      { stringNum: 1, note: 'D4' }
    ])
  }
};

/**
 * Finds the closest matching string in a selected tuning for a detected frequency.
 * @param {number} frequency 
 * @param {string} [tuningKey='standard'] 
 */
export function getClosestGuitarString(frequency, tuningKey = 'standard') {
  const tuning = GUITAR_TUNINGS[tuningKey] || GUITAR_TUNINGS.standard;
  if (!frequency || frequency <= 0) return null;

  let closestString = null;
  let minDiff = Infinity;

  for (const str of tuning.strings) {
    const diff = Math.abs(frequency - str.freq);
    if (diff < minDiff) {
      minDiff = diff;
      closestString = str;
    }
  }

  return closestString;
}
