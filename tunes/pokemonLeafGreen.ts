// tunes/pokemonLeafGreen.ts
import type { TuneData, NoteEvent } from "./types"

// Pokemon Leaf Green soundtrack tune with various instrument sounds
const pokemonLeafGreen: TuneData = {
  name: "Pokemon Leaf Green",
  bpm: 120,
  synthType: "Music Box", // Default synth type for the tune
  totalBeats: 32, // 8 bars of 4 beats each
  pattern: [
    // Main melody - Music Box
    { time: 0, note: "E5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 0.5, note: "G5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 1, note: "A5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 1.5, note: "B5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 2, note: "A5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 2.5, note: "G5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 3, note: "E5", duration: 0.75, velocity: 0.9, synthType: "Music Box" },
    { time: 3.75, note: "D5", duration: 0.25, velocity: 0.8, synthType: "Music Box" },
    
    { time: 4, note: "E5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 4.5, note: "G5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 5, note: "A5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 5.5, note: "B5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 6, note: "A5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 6.5, note: "G5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 7, note: "E5", duration: 1, velocity: 0.9, synthType: "Music Box" },
    
    // Second part of melody - Music Box
    { time: 8, note: "G5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 8.5, note: "B5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 9, note: "C6", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 9.5, note: "D6", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 10, note: "C6", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 10.5, note: "B5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 11, note: "G5", duration: 1, velocity: 0.9, synthType: "Music Box" },
    
    { time: 12, note: "A5", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 12.5, note: "C6", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 13, note: "D6", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 13.5, note: "E6", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 14, note: "D6", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 14.5, note: "C6", duration: 0.5, velocity: 0.9, synthType: "Music Box" },
    { time: 15, note: "A5", duration: 1, velocity: 0.9, synthType: "Music Box" },
    
    // Bass line - Square wave
    { time: 0, note: "E3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 1, note: "B3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 2, note: "A3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 3, note: "E3", duration: 1, velocity: 0.7, synthType: "Square" },
    
    { time: 4, note: "E3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 5, note: "B3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 6, note: "A3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 7, note: "E3", duration: 1, velocity: 0.7, synthType: "Square" },
    
    { time: 8, note: "G3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 9, note: "D4", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 10, note: "C4", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 11, note: "G3", duration: 1, velocity: 0.7, synthType: "Square" },
    
    { time: 12, note: "A3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 13, note: "E4", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 14, note: "D4", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 15, note: "A3", duration: 1, velocity: 0.7, synthType: "Square" },
    
    // Accompaniment chords - Saw wave
    { time: 0, note: ["E4", "G4", "B4"], duration: 2, velocity: 0.5, synthType: "Saw" },
    { time: 2, note: ["A4", "C5", "E5"], duration: 2, velocity: 0.5, synthType: "Saw" },
    
    { time: 4, note: ["E4", "G4", "B4"], duration: 2, velocity: 0.5, synthType: "Saw" },
    { time: 6, note: ["A4", "C5", "E5"], duration: 2, velocity: 0.5, synthType: "Saw" },
    
    { time: 8, note: ["G4", "B4", "D5"], duration: 2, velocity: 0.5, synthType: "Saw" },
    { time: 10, note: ["C5", "E5", "G5"], duration: 2, velocity: 0.5, synthType: "Saw" },
    
    { time: 12, note: ["A4", "C5", "E5"], duration: 2, velocity: 0.5, synthType: "Saw" },
    { time: 14, note: ["D5", "F5", "A5"], duration: 2, velocity: 0.5, synthType: "Saw" },
    
    // Percussion - kick and hat
    { time: 0, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 1, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 2, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 3, note: "KICK", duration: 0.25, velocity: 0.8 },
    
    { time: 4, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 5, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 6, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 7, note: "KICK", duration: 0.25, velocity: 0.8 },
    
    { time: 8, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 9, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 10, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 11, note: "KICK", duration: 0.25, velocity: 0.8 },
    
    { time: 12, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 13, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 14, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 15, note: "KICK", duration: 0.25, velocity: 0.8 },
    
    { time: 0.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 1.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 2.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 3.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    
    { time: 4.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 5.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 6.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 7.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    
    { time: 8.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 9.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 10.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 11.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    
    { time: 12.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 13.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 14.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 15.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    
    // Second 16 bars - continuation of the pattern
    // Repeat melody with slight variation
    { time: 16, note: "E5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 16.5, note: "G5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 17, note: "A5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 17.5, note: "B5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 18, note: "A5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 18.5, note: "G5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 19, note: "E5", duration: 0.75, velocity: 0.9, synthType: "Piano" },
    { time: 19.75, note: "D5", duration: 0.25, velocity: 0.8, synthType: "Piano" },
    
    { time: 20, note: "E5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 20.5, note: "G5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 21, note: "A5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 21.5, note: "B5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 22, note: "A5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 22.5, note: "G5", duration: 0.5, velocity: 0.9, synthType: "Piano" },
    { time: 23, note: "E5", duration: 1, velocity: 0.9, synthType: "Piano" },
    
    // Second part of melody with different instrument
    { time: 24, note: "G5", duration: 0.5, velocity: 0.9, synthType: "Sine" },
    { time: 24.5, note: "B5", duration: 0.5, velocity: 0.9, synthType: "Sine" },
    { time: 25, note: "C6", duration: 0.5, velocity: 0.9, synthType: "Sine" },
    { time: 25.5, note: "D6", duration: 0.5, velocity: 0.9, synthType: "Sine" },
    { time: 26, note: "C6", duration: 0.5, velocity: 0.9, synthType: "Sine" },
    { time: 26.5, note: "B5", duration: 0.5, velocity: 0.9, synthType: "Sine" },
    { time: 27, note: "G5", duration: 1, velocity: 0.9, synthType: "Sine" },
    
    { time: 28, note: "A5", duration: 0.5, velocity: 0.9, synthType: "Triangle" },
    { time: 28.5, note: "C6", duration: 0.5, velocity: 0.9, synthType: "Triangle" },
    { time: 29, note: "D6", duration: 0.5, velocity: 0.9, synthType: "Triangle" },
    { time: 29.5, note: "E6", duration: 0.5, velocity: 0.9, synthType: "Triangle" },
    { time: 30, note: "D6", duration: 0.5, velocity: 0.9, synthType: "Triangle" },
    { time: 30.5, note: "C6", duration: 0.5, velocity: 0.9, synthType: "Triangle" },
    { time: 31, note: "A5", duration: 1, velocity: 0.9, synthType: "Triangle" },
    
    // Continue bass line
    { time: 16, note: "E3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 17, note: "B3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 18, note: "A3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 19, note: "E3", duration: 1, velocity: 0.7, synthType: "Square" },
    
    { time: 20, note: "E3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 21, note: "B3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 22, note: "A3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 23, note: "E3", duration: 1, velocity: 0.7, synthType: "Square" },
    
    { time: 24, note: "G3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 25, note: "D4", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 26, note: "C4", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 27, note: "G3", duration: 1, velocity: 0.7, synthType: "Square" },
    
    { time: 28, note: "A3", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 29, note: "E4", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 30, note: "D4", duration: 1, velocity: 0.7, synthType: "Square" },
    { time: 31, note: "A3", duration: 1, velocity: 0.7, synthType: "Square" },
    
    // Continue percussion
    { time: 16, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 17, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 18, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 19, note: "KICK", duration: 0.25, velocity: 0.8 },
    
    { time: 20, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 21, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 22, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 23, note: "KICK", duration: 0.25, velocity: 0.8 },
    
    { time: 24, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 25, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 26, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 27, note: "KICK", duration: 0.25, velocity: 0.8 },
    
    { time: 28, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 29, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 30, note: "KICK", duration: 0.25, velocity: 0.8 },
    { time: 31, note: "KICK", duration: 0.25, velocity: 0.8 },
    
    { time: 16.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 17.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 18.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 19.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    
    { time: 20.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 21.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 22.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 23.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    
    { time: 24.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 25.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 26.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 27.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    
    { time: 28.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 29.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 30.5, note: "HAT", duration: 0.25, velocity: 0.6 },
    { time: 31.5, note: "HAT", duration: 0.25, velocity: 0.6 },
  ]
}

export default pokemonLeafGreen