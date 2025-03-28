import type { Note } from "../app/types"

export type NotePitch = string 

export interface NoteEvent {
  time: number 
  note: NotePitch | NotePitch[] 
  duration: number 
  velocity?: number 
  synthType?: SynthType 
}

export interface MidiNote {
  name: string 
  midi: number 
  time: number 
  velocity: number 
  duration: number 
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
  isStart: boolean 
}

export interface TuneData {
  name: string
  bpm: number
  synthType: SynthType
  pattern: NoteEvent[]
  totalBeats: number 
  midiData?: MidiData 
}

export interface GridDisplayCell {
  state: GridCellState
  note: NotePitch
  beat: number 
}

export interface SavedTune {
  name: string
  bpm: number
  synthType: SynthType
  pattern: NoteEvent[]
  totalBeats: number
  midiData?: MidiData
}

export interface TunePattern {
  name: string
  bpm: number
  synthType: SynthType
  pattern: {
    note: Note
    beats: number[]
  }[]
}

