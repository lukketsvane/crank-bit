export type Note =
  | "C6"
  | "B5"
  | "A5"
  | "G5"
  | "F5"
  | "E5"
  | "D5"
  | "C5"
  | "B4"
  | "A4"
  | "G4"
  | "F4"
  | "E4"
  | "D4"
  | "C4"
  | "B3"
  | "A3"
  | "G3"
  | "F3"
  | "E3"
  | "D3"
  | "C3"
  | "B2"
  | "A2"
  | "G2"
  | "F2"
  | "E2"
  | "D2"
  | "C2"
  | "Eb6"
  | "Eb5"
  | "Eb4"
  | "Eb3"
  | "Eb2"
  | "Db6"
  | "Db5"
  | "Db4"
  | "Db3"
  | "Db2"
  | "Bb5"
  | "Bb4"
  | "Bb3"
  | "Bb2"
  | "Ab5"
  | "Ab4"
  | "Ab3"
  | "Ab2"
  | "Gb4"
  | "Gb3"
  | "Gb2"
  | "RIDE"
  | "HAT"
  | "SNARE"
  | "KICK"

export type SynthType = "Sine" | "Saw" | "Square" | "Triangle" | "Music Box"
export type Scale = "Major Pentatonic" | "Minor Pentatonic" | "Stack of 4ths"
export type Mode = "Live" | "Dark" | "Light"

// Define the grid structure
export interface GridCell {
  active: boolean
  note: Note
  beat: number
}

// Add a type for our save/load functionality
export interface SavedTune {
  name: string
  bpm: number
  synthType: SynthType
  pattern: {
    note: Note
    beats: number[]
  }[]
}

