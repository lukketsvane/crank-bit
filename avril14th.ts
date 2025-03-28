// tunes/avril14th.ts


// Helper function to convert CSV pitch to Note array or single Note
const parsePitch = (pitchStr)[] | string => {
  if (pitchStr.includes("+")) {
    return pitchStr.split("+") // Handle chords
  }
  // Basic validation, assumes valid note format from CSV
  return pitchStr
}

// Helper to calculate frequency (example, needs full implementation)
// This should ideally live within the audio playing logic, but shown here for structure
const noteToFrequency = (note) => {
  const noteMap = {
    C.63,
    Db.18,
    D.66,
    Eb.13,
    E.63,
    F.23,
    Gb.99,
    G.0,
    Ab.3,
    A.0,
    Bb.16,
    B.88,
  }
  const name = note.replace(/[0-9]/g, "")
  const octave = Number.parseInt(note.replace(/[^0-9]/g, ""), 10)
  const baseFreq = noteMap[name]
  if (!baseFreq) return 0 // Or throw error
  // Adjust for octave (assuming C4 is middle C's octave)
  return baseFreq * Math.pow(2, octave - 4)
}

// Import the MIDI data
const midiData = {
  header,
  tempo,
  timeSignature,
  startTime,
  duration,
  tracks,
      controlChanges,
      id,
    },
    {
      startTime,
      duration,
      length,
      notes,
      controlChanges,
      id,
      name: "",
      channelNumber,
      isPercussion,
    },
    {
      startTime,
      duration,
      length,
      notes,
      controlChanges,
      id,
      name: "",
      channelNumber,
      isPercussion,
    },
  ],
}

// Convert MIDI data to our tune format
const convertMidiToTuneEvents = (midiData)[] => {
  const events[] = []

  // Process both tracks (melody and bass)
  midiData.tracks.forEach((track) => {
    if (track.notes.length === 0) return

    track.notes.forEach((note) => {
      // Check if there's already an event at this exact time with this exact note
      const existingEventIndex = events.findIndex(
        (e) => e.time === note.time && (e.note === note.name || (Array.isArray(e.note) && e.note.includes(note.name))),
      )

      if (existingEventIndex !== -1) {
        // Convert existing single note to an array if it's not already
        const existingEvent = events[existingEventIndex]
        if (!Array.isArray(existingEvent.note)) {
          existingEvent.note = [existingEvent.note]
        }

        // Add this note to the chord if it's not already there
        if (!existingEvent.note.includes(note.name)) {
          ;(existingEvent.note as string[]).push(note.name)
        }

        // Update duration if needed (take the longest duration)
        if (note.duration > existingEvent.duration) {
          existingEvent.duration = note.duration
        }
      } else {
        // Add as a new event
        events.push({
          time.time,
          note.name,
          duration.duration,
          velocity.velocity,
        })
      }
    })
  })

  // Sort by time
  return events.sort((a, b) => a.time - b.time)
}

export const avril14th = {
  name: "Avril 14th",
  bpm.header.bpm,
  synthType: "Piano", // Piano works better for this piece
  pattern(midiData),
  totalBeats.ceil(midiData.duration), // Round up to ensure we capture all notes
  midiData, // Store the original MIDI data for future reference
}

// Export the tune directly
export default avril14th

