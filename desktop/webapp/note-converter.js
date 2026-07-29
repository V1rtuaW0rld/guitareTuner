/**
 * Core Audio - Note Converter
 * Handles musical frequency calculations, Equal Temperament conversions (A4 = 440 Hz),
 * MIDI note mapping, and cents offset evaluations.
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * Converts a frequency in Hz to its closest musical note information.
 * 
 * @param {number} frequency Frequency in Hz
 * @param {number} [referenceA4=440] Reference frequency for A4 in Hz
 * @returns {{
 *   noteName: string,
 *   octave: number,
 *   fullNote: string,
 *   midi: number,
 *   exactFrequency: number,
 *   cents: number,
 *   isTunable: boolean
 * }}
 */
export function frequencyToNote(frequency, referenceA4 = 440) {
  if (!frequency || frequency <= 0 || isNaN(frequency)) {
    return {
      noteName: '-',
      octave: 0,
      fullNote: '--',
      midi: 0,
      exactFrequency: 0,
      cents: 0,
      isTunable: false
    };
  }

  // Calculate fractional MIDI note number (A4 = MIDI 69 = 440 Hz)
  const midiFractional = 69 + 12 * Math.log2(frequency / referenceA4);
  const closestMidi = Math.round(midiFractional);

  // Exact target frequency for the rounded note
  const exactFrequency = referenceA4 * Math.pow(2, (closestMidi - 69) / 12);

  // Difference in cents: 100 cents per semitone
  // Cents = 1200 * log2(measured_freq / target_freq)
  const cents = 1200 * Math.log2(frequency / exactFrequency);

  // Calculate note name and octave
  const noteIndex = ((closestMidi % 12) + 12) % 12;
  const noteName = NOTE_NAMES[noteIndex];
  const octave = Math.floor(closestMidi / 12) - 1;
  const fullNote = `${noteName}${octave}`;

  return {
    noteName,
    octave,
    fullNote,
    midi: closestMidi,
    exactFrequency: Number(exactFrequency.toFixed(2)),
    cents: Number(cents.toFixed(1)),
    isTunable: true
  };
}

/**
 * Calculates exact frequency for a given note string (e.g., "E2", "A2", "A4").
 * @param {string} noteStr Note string with octave
 * @param {number} [referenceA4=440] Reference frequency for A4
 * @returns {number} Frequency in Hz
 */
export function noteToFrequency(noteStr, referenceA4 = 440) {
  const match = noteStr.match(/^([A-G]#?)(-?\d+)$/i);
  if (!match) return 0;

  const name = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);
  const noteIndex = NOTE_NAMES.indexOf(name);

  if (noteIndex === -1) return 0;

  const midi = (octave + 1) * 12 + noteIndex;
  return referenceA4 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Transposes a note string by semitones (e.g. transposeNote('E2', 1) -> 'F2')
 */
export function transposeNote(noteStr, semitones) {
  const match = noteStr.match(/^([A-G]#?)(-?\d+)$/i);
  if (!match) return noteStr;

  const name = match[1].toUpperCase();
  const octave = parseInt(match[2], 10);
  const noteIndex = NOTE_NAMES.indexOf(name);

  const totalMidi = (octave + 1) * 12 + noteIndex + semitones;
  const newNoteIndex = ((totalMidi % 12) + 12) % 12;
  const newOctave = Math.floor(totalMidi / 12) - 1;
  return `${NOTE_NAMES[newNoteIndex]}${newOctave}`;
}
