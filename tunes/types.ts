// tunes/types.ts
import type { Note } from "../app/types"

export type NotePitch = string // e.g., "C4", "Ab5", "Gb2" or percussion like "KICK"

export interface NoteEvent {
  time: number // Absolute time in beats from the start
  note: NotePitch | NotePitch[] // Single note or chord
  duration: number // Duration in beats
  velocity?: number // Optional velocity parameter (0 to 1)
}

export interface MidiNote {
  name: string // Note name (e.g., "C5")
  midi: number // MIDI note number
  time: number // Start time in beats
  velocity: number // Velocity (0 to 1)
  duration: number // Duration in beats
}

export interface MidiTrack {
  startTime: number
  duration: number
  length: number
  notes: MidiNote[]
  controlChanges: Record<string, any>
  id: number
  name?: string
  channelNumber?: number
  isPercussion?: boolean
}

export interface MidiData {
  header: {
    PPQ: number
    bpm: number
    timeSignature: number[]
    name?: string
  }
  tempo: Array<{
    absoluteTime: number
    seconds: number
    bpm: number
  }>
  timeSignature: Array<{
    absoluteTime: number
    seconds: number
    numerator: number
    denominator: number
    click: number
    notesQ: number
  }>
  startTime: number
  duration: number
  tracks: MidiTrack[]
}

export type SynthType = "Sine" | "Saw" | "Square" | "Triangle" | "Music Box" | "Piano"
export type Mode = "Live" | "Dark" | "Light"

export interface GridCellState {
  active: boolean
  isStart: boolean // Is this cell the start of a note?
}

export interface TuneData {
  name: string
  bpm: number
  synthType: SynthType
  pattern: NoteEvent[]
  totalBeats: number // Total length of the piece in beats
  midiData?: MidiData // Original MIDI data if available
}

// Define the grid structure for UI display
export interface GridDisplayCell {
  state: GridCellState
  note: NotePitch
  beat: number // The beat number this cell represents (1-indexed)
}

export interface SavedTune {
  name: string
  bpm: number
  synthType: SynthType
  pattern: NoteEvent[]
  totalBeats: number
  midiData?: MidiData
}

// For backward compatibility with older code
export interface TunePattern {
  name: string
  bpm: number
  synthType: SynthType
  pattern: {
    note: Note
    beats: number[]
  }[]
}

