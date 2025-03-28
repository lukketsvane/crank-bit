import type { TuneData, MidiData, NoteEvent } from "./types"

const midiData: MidiData = {
  header: {
    PPQ: 384,
    bpm: 75,
    timeSignature: [4, 4],
    name: "I'm Confessin' (That I Love You)",
  },
  tempo: [
    {
      absoluteTime: 0,
      seconds: 0,
      bpm: 75,
    },
  ],
  timeSignature: [
    {
      absoluteTime: 0,
      seconds: 0,
      numerator: 4,
      denominator: 4,
      click: 24,
      notesQ: 8,
    },
  ],
  startTime: 0,
  duration: 64, 
  tracks: [
    {
      startTime: 0,
      duration: 64,
      length: 100,
      notes: [
        { name: "G4", midi: 67, time: 0, velocity: 0.9, duration: 0.5 },
        { name: "G4", midi: 67, time: 0.5, velocity: 0.9, duration: 0.5 },
        { name: "G4", midi: 67, time: 1.0, velocity: 0.9, duration: 1.0 },
        { name: "D5", midi: 74, time: 2.0, velocity: 1.0, duration: 1.0 },
        { name: "A4", midi: 69, time: 3.0, velocity: 0.9, duration: 0.5 },
        { name: "G4", midi: 67, time: 3.5, velocity: 0.9, duration: 0.5 },
        
        { name: "F4", midi: 65, time: 4.0, velocity: 0.9, duration: 1.0 },
        { name: "G4", midi: 67, time: 5.0, velocity: 0.9, duration: 1.0 },
        { name: "A4", midi: 69, time: 6.0, velocity: 0.9, duration: 1.0 },
        { name: "D4", midi: 62, time: 7.0, velocity: 0.8, duration: 1.0 },
        
        { name: "G4", midi: 67, time: 8.0, velocity: 0.9, duration: 0.5 },
        { name: "G4", midi: 67, time: 8.5, velocity: 0.9, duration: 0.5 },
        { name: "G4", midi: 67, time: 9.0, velocity: 0.9, duration: 1.0 },
        { name: "D5", midi: 74, time: 10.0, velocity: 1.0, duration: 1.0 },
        { name: "A4", midi: 69, time: 11.0, velocity: 0.9, duration: 0.5 },
        { name: "G4", midi: 67, time: 11.5, velocity: 0.9, duration: 0.5 },
        
        { name: "F4", midi: 65, time: 12.0, velocity: 0.9, duration: 1.0 },
        { name: "G4", midi: 67, time: 13.0, velocity: 0.9, duration: 1.0 },
        { name: "D4", midi: 62, time: 14.0, velocity: 0.8, duration: 2.0 },
        
        { name: "A4", midi: 69, time: 16.0, velocity: 0.9, duration: 0.5 },
        { name: "A4", midi: 69, time: 16.5, velocity: 0.9, duration: 0.5 },
        { name: "A4", midi: 69, time: 17.0, velocity: 0.9, duration: 1.0 },
        { name: "D5", midi: 74, time: 18.0, velocity: 1.0, duration: 1.0 },
        { name: "B4", midi: 71, time: 19.0, velocity: 0.9, duration: 1.0 },
        
        { name: "A4", midi: 69, time: 20.0, velocity: 0.9, duration: 0.5 },
        { name: "G4", midi: 67, time: 20.5, velocity: 0.9, duration: 0.5 },
        { name: "F#4", midi: 66, time: 21.0, velocity: 0.9, duration: 1.0 },
        { name: "E4", midi: 64, time: 22.0, velocity: 0.9, duration: 1.0 },
        { name: "D4", midi: 62, time: 23.0, velocity: 0.8, duration: 1.0 },
        
        { name: "G4", midi: 67, time: 24.0, velocity: 0.9, duration: 0.5 },
        { name: "G4", midi: 67, time: 24.5, velocity: 0.9, duration: 0.5 },
        { name: "G4", midi: 67, time: 25.0, velocity: 0.9, duration: 1.0 },
        { name: "D5", midi: 74, time: 26.0, velocity: 1.0, duration: 1.0 },
        { name: "A4", midi: 69, time: 27.0, velocity: 0.9, duration: 0.5 },
        { name: "G4", midi: 67, time: 27.5, velocity: 0.9, duration: 0.5 },
        
        { name: "F4", midi: 65, time: 28.0, velocity: 0.9, duration: 1.0 },
        { name: "G4", midi: 67, time: 29.0, velocity: 0.9, duration: 1.0 },
        { name: "D4", midi: 62, time: 30.0, velocity: 0.8, duration: 2.0 },
      ],
      controlChanges: {},
      id: 1,
      name: "Melody",
      channelNumber: 0,
      isPercussion: false,
    },
    {
      startTime: 0,
      duration: 64,
      length: 120,
      notes: [
        { name: "D3", midi: 50, time: 0.0, velocity: 0.7, duration: 0.5 },
        { name: "G3", midi: 55, time: 0.5, velocity: 0.7, duration: 0.5 },
        { name: "B3", midi: 59, time: 1.0, velocity: 0.7, duration: 0.5 },
        { name: "D4", midi: 62, time: 1.5, velocity: 0.7, duration: 0.5 },
        
        { name: "D3", midi: 50, time: 2.0, velocity: 0.7, duration: 0.5 },
        { name: "G3", midi: 55, time: 2.5, velocity: 0.7, duration: 0.5 },
        { name: "B3", midi: 59, time: 3.0, velocity: 0.7, duration: 0.5 },
        { name: "D4", midi: 62, time: 3.5, velocity: 0.7, duration: 0.5 },
        
        { name: "D3", midi: 50, time: 4.0, velocity: 0.7, duration: 0.5 },
        { name: "G3", midi: 55, time: 4.5, velocity: 0.7, duration: 0.5 },
        { name: "B3", midi: 59, time: 5.0, velocity: 0.7, duration: 0.5 },
        { name: "F4", midi: 65, time: 5.5, velocity: 0.7, duration: 0.5 },
        
        { name: "E3", midi: 52, time: 6.0, velocity: 0.7, duration: 0.5 },
        { name: "G3", midi: 55, time: 6.5, velocity: 0.7, duration: 0.5 },
        { name: "C4", midi: 60, time: 7.0, velocity: 0.7, duration: 0.5 },
        { name: "E4", midi: 64, time: 7.5, velocity: 0.7, duration: 0.5 },
        
        { name: "D3", midi: 50, time: 8.0, velocity: 0.7, duration: 0.5 },
        { name: "G3", midi: 55, time: 8.5, velocity: 0.7, duration: 0.5 },
        { name: "B3", midi: 59, time: 9.0, velocity: 0.7, duration: 0.5 },
        { name: "D4", midi: 62, time: 9.5, velocity: 0.7, duration: 0.5 },
        
        { name: "D3", midi: 50, time: 10.0, velocity: 0.7, duration: 0.5 },
        { name: "G3", midi: 55, time: 10.5, velocity: 0.7, duration: 0.5 },
        { name: "B3", midi: 59, time: 11.0, velocity: 0.7, duration: 0.5 },
        { name: "D4", midi: 62, time: 11.5, velocity: 0.7, duration: 0.5 },
        
        { name: "D3", midi: 50, time: 12.0, velocity: 0.7, duration: 0.5 },
        { name: "G3", midi: 55, time: 12.5, velocity: 0.7, duration: 0.5 },
        { name: "B3", midi: 59, time: 13.0, velocity: 0.7, duration: 0.5 },
        { name: "F4", midi: 65, time: 13.5, velocity: 0.7, duration: 0.5 },
        
        { name: "E3", midi: 52, time: 14.0, velocity: 0.7, duration: 0.5 },
        { name: "G3", midi: 55, time: 14.5, velocity: 0.7, duration: 0.5 },
        { name: "C4", midi: 60, time: 15.0, velocity: 0.7, duration: 0.5 },
        { name: "E4", midi: 64, time: 15.5, velocity: 0.7, duration: 0.5 },
        
        { name: "F#3", midi: 54, time: 16.0, velocity: 0.7, duration: 0.5 },
        { name: "A3", midi: 57, time: 16.5, velocity: 0.7, duration: 0.5 },
        { name: "D4", midi: 62, time: 17.0, velocity: 0.7, duration: 0.5 },
        { name: "C4", midi: 60, time: 17.5, velocity: 0.7, duration: 0.5 },
        
        { name: "F#3", midi: 54, time: 18.0, velocity: 0.7, duration: 0.5 },
        { name: "A3", midi: 57, time: 18.5, velocity: 0.7, duration: 0.5 },
        { name: "D4", midi: 62, time: 19.0, velocity: 0.7, duration: 0.5 },
        { name: "C4", midi: 60, time: 19.5, velocity: 0.7, duration: 0.5 },
        
        { name: "E3", midi: 52, time: 20.0, velocity: 0.7, duration: 0.5 },
        { name: "A3", midi: 57, time: 20.5, velocity: 0.7, duration: 0.5 },
        { name: "C#4", midi: 61, time: 21.0, velocity: 0.7, duration: 0.5 },
        { name: "G4", midi: 67, time: 21.5, velocity: 0.7, duration: 0.5 },
        
        { name: "F#3", midi: 54, time: 22.0, velocity: 0.7, duration: 0.5 },
        { name: "A3", midi: 57, time: 22.5, velocity: 0.7, duration: 0.5 },
        { name: "D4", midi: 62, time: 23.0, velocity: 0.7, duration: 0.5 },
        { name: "C4", midi: 60, time: 23.5, velocity: 0.7, duration: 0.5 },
        
        { name: "D3", midi: 50, time: 24.0, velocity: 0.7, duration: 0.5 },
        { name: "G3", midi: 55, time: 24.5, velocity: 0.7, duration: 0.5 },
        { name: "B3", midi: 59, time: 25.0, velocity: 0.7, duration: 0.5 },
        { name: "D4", midi: 62, time: 25.5, velocity: 0.7, duration: 0.5 },
        
        { name: "D3", midi: 50, time: 26.0, velocity: 0.7, duration: 0.5 },
        { name: "G3", midi: 55, time: 26.5, velocity: 0.7, duration: 0.5 },
        { name: "B3", midi: 59, time: 27.0, velocity: 0.7, duration: 0.5 },
        { name: "D4", midi: 62, time: 27.5, velocity: 0.7, duration: 0.5 },
        
        { name: "D3", midi: 50, time: 28.0, velocity: 0.7, duration: 0.5 },
        { name: "G3", midi: 55, time: 28.5, velocity: 0.7, duration: 0.5 },
        { name: "B3", midi: 59, time: 29.0, velocity: 0.7, duration: 0.5 },
        { name: "F4", midi: 65, time: 29.5, velocity: 0.7, duration: 0.5 },
        
        { name: "G2", midi: 43, time: 30.0, velocity: 0.8, duration: 2.0 },
        { name: "D3", midi: 50, time: 30.0, velocity: 0.8, duration: 2.0 },
        { name: "G3", midi: 55, time: 30.0, velocity: 0.8, duration: 2.0 },
        { name: "B3", midi: 59, time: 30.0, velocity: 0.8, duration: 2.0 },
      ],
      controlChanges: {},
      id: 2,
      name: "Accompaniment",
      channelNumber: 1,
      isPercussion: false,
    },
  ],
}

const convertMidiToTuneEvents = (midiData: MidiData): NoteEvent[] => {
  const events: NoteEvent[] = []

  midiData.tracks.forEach((track) => {
    if (track.notes.length === 0) return

    track.notes.forEach((note) => {
      const existingEventIndex = events.findIndex(
        (e) => e.time === note.time && (e.note === note.name || (Array.isArray(e.note) && e.note.includes(note.name))),
      )

      if (existingEventIndex !== -1) {
        const existingEvent = events[existingEventIndex]
        if (!Array.isArray(existingEvent.note)) {
          existingEvent.note = [existingEvent.note]
        }

        if (!existingEvent.note.includes(note.name)) {
          ;(existingEvent.note as string[]).push(note.name)
        }

        if (note.duration > existingEvent.duration) {
          existingEvent.duration = note.duration
        }
      } else {
        events.push({
          time: note.time,
          note: note.name,
          duration: note.duration,
          velocity: note.velocity,
        })
      }
    })
  })

  return events.sort((a, b) => a.time - b.time)
}

export const imConfessin: TuneData = {
  name: "I'm Confessin'",
  bpm: midiData.header.bpm,
  synthType: "Piano", 
  pattern: convertMidiToTuneEvents(midiData),
  totalBeats: Math.ceil(midiData.duration), 
  midiData: midiData, 
}

export default imConfessin