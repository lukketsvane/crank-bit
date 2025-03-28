# crank:bit

Digital music box with physical or virtual crank input. Built with Next.js and Web Audio API.

## Features
Web interface with note editing, multiple synthesizers, and momentum-based playback. Supports physical control via microbit.

## Controls
```
VIRTUAL: Mouse/touch drag, Arrow keys, Space (toggle winding)
PHYSICAL: Rotary encoder via microbit HID interface
```

## Setup

### Web App
```bash
# Install dependencies
npm install

# Development
npm run dev

# Production build
npm run build
npm start
```

### MicroBit
Flash [crank.ts](./crank.ts) to microbit, pair as Bluetooth keyboard, connect encoder to P0/P1.

## Implementation Notes

### Tune Format
Tunes are structured as collections of note events with timing data:

```typescript
// Example of tune structure (simplified)
interface NoteEvent {
  time: number;        // Absolute time in beats from start
  note: string | string[];  // Single note or chord
  duration: number;    // Duration in beats
  velocity?: number;   // Optional velocity (0-1)
}

interface TuneData {
  name: string;
  bpm: number;
  synthType: SynthType;
  pattern: NoteEvent[];
  totalBeats: number;
  midiData?: MidiData;
}
```

The project includes [avril14th.ts](./tunes/avril14th.ts) as a reference implementation, derived from Aphex Twin's "Avril 14th" and converted from MIDI.

### MicroBit Implementation

Hardware connects a rotary encoder to P0/P1 pins of a microbit V2, which functions as a Bluetooth HID keyboard.

#### [crank.ts](./crank.ts) (MakeCode)
```typescript
// Core encoder handling
if (s1State !== lastS1State && input.runningTime() - lastMovementTime > debounceDelay) {
    let isClockwise = (s2State !== s1State);
    
    if ((isClockwise && currentMode !== MODE_REWIND) || 
        (!isClockwise && currentMode === MODE_FORWARD)) {
        // Advance playback
        keyboard.sendString(keyboard.keys(keyboard._Key.right))
    } else if ((!isClockwise && currentMode !== MODE_FORWARD) || 
               (isClockwise && currentMode === MODE_REWIND)) {
        // Decrease momentum
        keyboard.sendString(keyboard.keys(keyboard._Key.left))
    }
}
```

Mode selection via microbit buttons:
```typescript
input.onButtonPressed(Button.A, function() {
    currentMode = MODE_REWIND;
})

input.onButtonPressed(Button.B, function() {
    currentMode = MODE_FORWARD;
})

input.onButtonPressed(Button.AB, function() {
    currentMode = MODE_TWO_WAY;
})
```

