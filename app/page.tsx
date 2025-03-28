// app/page.tsx
"use client"
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { motion } from "framer-motion"
import Head from "next/head"
import { Save, FolderOpen, Pencil, Trash2, Music } from "lucide-react" // Import Music icon
import type { NotePitch, SynthType, Mode, GridDisplayCell, SavedTune, TuneData } from "../tunes/types"
import tunes, { getRandomTune } from "../tunes"
import avril14th from "../tunes/avril14th"

const useOrientation = () => {
  const [isLandscape, setIsLandscape] = useState(true)
  useEffect(() => {
    const checkOrientation = () => setIsLandscape(typeof window !== 'undefined' && window.innerWidth > window.innerHeight)
    checkOrientation()
    window.addEventListener("resize", checkOrientation)
    return () => window.removeEventListener("resize", checkOrientation)
  }, [])
  return isLandscape
}

const useIsLowPowerDevice = () => {
  const [isLowPower, setIsLowPower] = useState(false)
  useEffect(() => {
    const ua = navigator.userAgent
    setIsLowPower(/iPhone/.test(ua) && /CPU.*OS (7|8|9|10|11|12|13)/.test(ua))
  }, [])
  return isLowPower
}

const noteToFrequencyMap: { [key: string]: number } = {
  C: 261.63,
  "C#": 277.18,
  Db: 277.18,
  D: 293.66,
  "D#": 311.13,
  Eb: 311.13,
  E: 329.63,
  F: 349.23,
  "F#": 369.99,
  Gb: 369.99,
  G: 392.0,
  "G#": 415.3,
  Ab: 415.3,
  A: 440.0,
  "A#": 466.16,
  Bb: 466.16,
  B: 493.88,
}

const getFrequency = (note: NotePitch, transpose = 0): number => {
  if (["KICK", "SNARE", "HAT", "RIDE"].includes(note)) return 0 // Drum sounds don't have frequency like tonal notes
  const matches = note.match(/([A-G][b#]?)(\d+)/)
  if (!matches) return 0
  const [, noteName, octaveStr] = matches
  const octave = Number.parseInt(octaveStr, 10)
  const baseFreq = noteToFrequencyMap[noteName]
  if (!baseFreq) return 0
  // Calculate frequency based on A4=440Hz standard
  const freq = baseFreq * Math.pow(2, octave - 4)
  return freq * Math.pow(2, transpose / 12)
}

export default function Home() {
  useEffect(() => {
    try {
      if (screen.orientation?.lock)
        screen.orientation.lock("landscape").catch(() => console.log("Orientation lock failed"))
    } catch (error) {
      console.log("Orientation API not supported")
    }
  }, [])

  const isLandscape = useOrientation()
  const isLowPowerDevice = useIsLowPowerDevice()
  const audioContextRef = useRef<AudioContext | null>(null)
  const activeSourcesRef = useRef<{
    [key: string]: { osc: OscillatorNode; gain: GainNode; source?: AudioBufferSourceNode }[]
  }>({})
  const mainRef = useRef<HTMLDivElement | null>(null)

  const [currentTune, setCurrentTune] = useState<TuneData>(avril14th)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(currentTune.bpm)
  const [synthType, setSynthType] = useState<SynthType>(currentTune.synthType)
  const [mode, setMode] = useState<Mode>("Dark")
  const [transpose, setTranspose] = useState(0)
  const [crankRotation, setCrankRotation] = useState(0)
  const [lastCrankAngle, setLastCrankAngle] = useState(0)
  const [patternPage, setPatternPage] = useState(0)
  const [isHandlingCrankEvent, setIsHandlingCrankEvent] = useState(false)
  const [momentum, setMomentum] = useState(0)
  const [lastCrankTime, setLastCrankTime] = useState(0)
  const [autoPlaySpeed, setAutoPlaySpeed] = useState(0)
  const [isWindingUp, setIsWindingUp] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [selectedNote, setSelectedNote] = useState<{note: NotePitch, time: number} | null>(null)
  const [selectedNoteSynth, setSelectedNoteSynth] = useState<SynthType>("Piano")

  // Refs for values used inside intervals/timeouts to avoid stale closures
  const momentumRef = useRef(momentum)
  const autoPlaySpeedRef = useRef(autoPlaySpeed)
  const windingUpRef = useRef(isWindingUp)
  const currentTimeRef = useRef(currentTime)
  const isPlayingRef = useRef(isPlaying)

  useEffect(() => { momentumRef.current = momentum }, [momentum])
  useEffect(() => { autoPlaySpeedRef.current = autoPlaySpeed }, [autoPlaySpeed])
  useEffect(() => { windingUpRef.current = isWindingUp }, [isWindingUp])
  useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])

  const ALL_NOTES: NotePitch[] = useMemo(() => {
    const noteSet = new Set<NotePitch>();
    // Add standard notes first (optional, could load dynamically)
    ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4", "B3", "A3", "G3", "F3", "E3", "D3", "C3"].forEach(n => noteSet.add(n));
    // Add drums
    ["RIDE", "HAT", "SNARE", "KICK"].forEach(p => noteSet.add(p));
    // Add notes from all loaded tunes
    tunes.forEach((tune) =>
      tune.pattern.forEach((event) => {
        const notes = Array.isArray(event.note) ? event.note : [event.note];
        notes.forEach((n) => noteSet.add(n));
      }),
    );

    // Sort: Drums first, then highest pitch to lowest
    return Array.from(noteSet).sort((a, b) => {
      const drumOrder = ["RIDE", "HAT", "SNARE", "KICK"];
      const aIsDrum = drumOrder.indexOf(a);
      const bIsDrum = drumOrder.indexOf(b);

      if (aIsDrum !== -1 && bIsDrum !== -1) return aIsDrum - bIsDrum; // Sort drums by order
      if (aIsDrum !== -1) return -1; // Drums come before tonal notes
      if (bIsDrum !== -1) return 1;  // Tonal notes come after drums

      // Sort tonal notes by frequency (descending)
      const freqA = getFrequency(a);
      const freqB = getFrequency(b);
      return freqB - freqA; // Higher frequency first
    });
  }, []); // Re-calculate only if `tunes` changes, which it doesn't in this setup


  const beats = useMemo(
    () => Array.from({ length: Math.max(16, currentTune.totalBeats || 16) }, (_, i) => i + 1),
    [currentTune.totalBeats],
  )
  const visibleBeats = 8 // Keep grid to 8 beats wide

  const getVisibleBeatIndices = useCallback(() => {
    const startBeat = patternPage * visibleBeats
    // Ensure we don't go past the total number of beats
    return beats.slice(startBeat, startBeat + visibleBeats).map((beat) => beat - 1)
  }, [patternPage, visibleBeats, beats])

  useEffect(() => {
    setBpm(currentTune.bpm)
    setSynthType(currentTune.synthType)
    setCurrentTime(0)
    currentTimeRef.current = 0
    setPatternPage(0)
    setIsPlaying(false)
    isPlayingRef.current = false
    // Stop any currently playing notes when tune changes
    Object.values(activeSourcesRef.current)
      .flat()
      .forEach((src) => {
        try {
          src.osc?.stop()
          src.source?.stop()
          src.gain.disconnect() // Disconnect gain node to free resources
        } catch {}
      })
    activeSourcesRef.current = {} // Clear active sources
  }, [currentTune])

  const initAudio = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        audioContextRef.current = new AudioContext()
      } catch (err) {
        console.error("Failed to create audio context:", err)
        return
      }
    }
    // Resume context if suspended (required by browser autoplay policies)
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current
        .resume()
        .catch((err) => console.error("Failed to resume audio context:", err))
    }
  }, [])

  // Trigger audio initialization on first user interaction
    useEffect(() => {
        const handleInteraction = () => {
            initAudio();
            // Remove listeners after first interaction
            document.removeEventListener("click", handleInteraction, { once: true });
            document.removeEventListener("keydown", handleInteraction, { once: true });
            document.removeEventListener("touchstart", handleInteraction, { once: true });
        };

        document.addEventListener("click", handleInteraction, { once: true });
        document.addEventListener("keydown", handleInteraction, { once: true });
        document.addEventListener("touchstart", handleInteraction, { once: true });

        // Cleanup listeners on component unmount
        return () => {
            document.removeEventListener("click", handleInteraction);
            document.removeEventListener("keydown", handleInteraction);
            document.removeEventListener("touchstart", handleInteraction);
            // Close audio context on unmount
            // audioContextRef.current?.close().catch(e => console.error("Error closing audio context", e));
        };
    }, [initAudio]);


  const playNoteInternal = useCallback(
    (note: NotePitch, duration: number, velocity = 1, noteSynthType?: SynthType) => {
      if (!audioContextRef.current || audioContextRef.current.state !== "running") {
        // Don't try to play if context is not ready
        // console.warn("Audio context not running, skipping note:", note);
        initAudio(); // Try to init/resume again
        return;
      }
      // Prevent overly short notes causing issues
      if (duration < 0.01) return

      // Simple polyphony limit: stop oldest notes if too many are playing
      const MAX_VOICES = 32;
      const activeKeys = Object.keys(activeSourcesRef.current);
      if (activeKeys.length >= MAX_VOICES) {
        const oldestKey = activeKeys[0]; // Assuming keys are added chronologically (simplification)
        activeSourcesRef.current[oldestKey]?.forEach((src) => {
          try { src.osc?.stop(); src.source?.stop(); src.gain.disconnect(); } catch {}
        });
        delete activeSourcesRef.current[oldestKey];
      }

      const ctx = audioContextRef.current
      const now = ctx.currentTime
      // Calculate stop time based on BPM and note duration (in beats)
      const secondsPerBeat = 60 / bpm;
      const stopTime = now + duration * secondsPerBeat;
      const sources: { osc: OscillatorNode; gain: GainNode; source?: AudioBufferSourceNode }[] = []

      // Master Gain and basic Limiter
      const masterGain = ctx.createGain()
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -1.0 // Limit close to 0dBFS
      limiter.knee.value = 0
      limiter.ratio.value = 20
      limiter.attack.value = 0.001
      limiter.release.value = 0.01
      masterGain.connect(limiter)
      limiter.connect(ctx.destination)

      const noteId = `${note}-${now}-${Math.random()}`; // Unique ID for this note instance
      activeSourcesRef.current[noteId] = sources;

       // Simplified cleanup: Remove the source after it should have finished playing + a buffer
      const cleanupTime = (stopTime - now + 0.5) * 1000; // Add 500ms buffer
      setTimeout(() => {
        if (activeSourcesRef.current[noteId]) {
            activeSourcesRef.current[noteId].forEach(src => {
                try { src.gain?.disconnect(); } catch {} // Disconnect gain first
            });
            delete activeSourcesRef.current[noteId];
        }
      }, cleanupTime);


      // --- Drum Sounds ---
      if (["KICK", "SNARE", "HAT", "RIDE"].includes(note)) {
        let gainValue = 0.5 * velocity; // Base volume
        let decayTime = 0.1;
        let noiseBuffer: AudioBuffer | null = null;

        if (note === "KICK") {
            gainValue = 0.8 * velocity;
            decayTime = 0.3;
            // Simple kick: decaying sine wave
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
            gain.gain.setValueAtTime(gainValue, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now);
            osc.stop(now + decayTime + 0.1);
            sources.push({ osc, gain });
        } else if (note === "SNARE") {
            gainValue = 0.6 * velocity;
            decayTime = 0.15;
            // Snare: noise burst + short tone
            noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * decayTime, ctx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

            const noiseSource = ctx.createBufferSource();
            const noiseGain = ctx.createGain();
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = "bandpass";
            noiseFilter.frequency.value = 1500;
            noiseFilter.Q.value = 1.0;
            noiseSource.buffer = noiseBuffer;
            noiseGain.gain.setValueAtTime(gainValue, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(masterGain);
            noiseSource.start(now);
            sources.push({ gain: noiseGain, osc: ctx.createOscillator(), source: noiseSource }); // Dummy osc

            const toneOsc = ctx.createOscillator();
            const toneGain = ctx.createGain();
            toneOsc.type = "triangle";
            toneOsc.frequency.value = 250;
            toneGain.gain.setValueAtTime(0.4 * velocity, now);
            toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            toneOsc.connect(toneGain);
            toneGain.connect(masterGain);
            toneOsc.start(now);
            toneOsc.stop(now + 0.06);
            sources.push({ osc: toneOsc, gain: toneGain });

        } else if (note === "HAT") {
            gainValue = 0.3 * velocity;
            decayTime = 0.05; // Short decay for closed hat
             // Hat: filtered noise
            noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * decayTime, ctx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

            const noiseSource = ctx.createBufferSource();
            const noiseGain = ctx.createGain();
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = "highpass";
            noiseFilter.frequency.value = 8000;
            noiseSource.buffer = noiseBuffer;
            noiseGain.gain.setValueAtTime(gainValue, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);
            noiseSource.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(masterGain);
            noiseSource.start(now);
            sources.push({ gain: noiseGain, osc: ctx.createOscillator(), source: noiseSource }); // Dummy osc

        } else if (note === "RIDE") {
            // Basic ride - slightly longer metallic noise
            gainValue = 0.4 * velocity;
            decayTime = 0.4;
            noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * decayTime, ctx.sampleRate);
            const data = noiseBuffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - (i / data.length), 1.5); // Add decay
            }

            const noiseSource = ctx.createBufferSource();
            const noiseGain = ctx.createGain();
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = "highpass";
            noiseFilter.frequency.value = 5000;
             const peakFilter = ctx.createBiquadFilter();
            peakFilter.type = "peaking";
            peakFilter.frequency.value = 7000;
            peakFilter.gain.value = 6;
            peakFilter.Q.value = 1.5;

            noiseSource.buffer = noiseBuffer;
            noiseGain.gain.setValueAtTime(gainValue, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

            noiseSource.connect(noiseFilter);
            noiseFilter.connect(peakFilter);
            peakFilter.connect(noiseGain);
            noiseGain.connect(masterGain);
            noiseSource.start(now);
            sources.push({ gain: noiseGain, osc: ctx.createOscillator(), source: noiseSource });
        }

        return; // Handled drum sounds
      }

      // --- Tonal Sounds ---
      const freq = getFrequency(note, transpose)
      if (!freq) return // Skip if frequency calculation fails

      const effectiveSynthType = noteSynthType || synthType
      let gainEnvAttack = 0.01;
      let gainEnvDecay = 0.1;
      let gainEnvSustain = 0.7;
      let gainEnvRelease = 0.2;
      let gainValue = 0.5 * velocity; // Base volume

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.frequency.setValueAtTime(freq, now)

      // Select oscillator type
      if (effectiveSynthType === "Piano" || effectiveSynthType === "Music Box") {
        // Simplified Piano/Music Box: Triangle wave with faster decay
        osc.type = "triangle";
        gainValue = 0.6 * velocity;
        gainEnvAttack = 0.005;
        gainEnvDecay = duration * secondsPerBeat * 0.3; // Decay related to duration
        gainEnvSustain = 0.1;
        gainEnvRelease = 0.3;
      } else if (effectiveSynthType === "Sine") {
        osc.type = "sine";
        gainValue = 0.7 * velocity;
        gainEnvRelease = 0.15;
      } else if (effectiveSynthType === "Square") {
        osc.type = "square";
        gainValue = 0.4 * velocity; // Square waves are naturally louder
        gainEnvRelease = 0.1;
      } else if (effectiveSynthType === "Saw") {
        osc.type = "sawtooth";
        gainValue = 0.4 * velocity; // Saw waves are also louder
        gainEnvRelease = 0.1;
      } else if (effectiveSynthType === "Triangle") {
        osc.type = "triangle";
        gainValue = 0.6 * velocity;
        gainEnvRelease = 0.15;
      } else {
         osc.type = "sine"; // Default to sine
         gainValue = 0.5 * velocity;
      }

      // Apply ADSR Envelope to Gain
      const peakTime = now + gainEnvAttack;
      const sustainStartTime = peakTime + gainEnvDecay;
      const sustainEndTime = stopTime; // Sustain until the note should stop
      const releaseEndTime = sustainEndTime + gainEnvRelease;

      gain.gain.setValueAtTime(0, now); // Start at 0
      gain.gain.linearRampToValueAtTime(gainValue, peakTime); // Attack
      gain.gain.setTargetAtTime(gainValue * gainEnvSustain, peakTime, gainEnvDecay / 3); // Decay to sustain level (using setTargetAtTime for exponential-like decay)

      // Schedule release start
      gain.gain.setValueAtTime(gain.gain.value, sustainEndTime); // Hold sustain level until stopTime (needed for setTargetAtTime)
      gain.gain.setTargetAtTime(0, sustainEndTime, gainEnvRelease / 3); // Release to 0


      osc.connect(gain)
      gain.connect(masterGain)

      osc.start(now)
      // Stop the oscillator shortly after the release phase ends
      osc.stop(releaseEndTime + 0.1)

      sources.push({ osc, gain });

    },
    [bpm, synthType, transpose, initAudio], // Include dependencies
  )

  const scheduleNotes = useCallback(
    (startTime: number, endTime: number) => {
      // initAudio() // Ensure audio is ready
      if (!audioContextRef.current || audioContextRef.current.state !== "running") return

      // Schedule notes within the given time range (in beats)
      currentTune.pattern.forEach((event) => {
        if (event.time >= startTime && event.time < endTime) {
          const notesToPlay = Array.isArray(event.note) ? event.note : [event.note]
          // Limit simultaneous notes per event for performance (simple approach)
          const limitedNotes = notesToPlay.slice(0, 4);
          limitedNotes.forEach(note => {
            playNoteInternal(note, event.duration, event.velocity || 1, event.synthType)
          });
        }
      })
    },
    [currentTune.pattern, playNoteInternal], // Removed initAudio as it's handled on interaction
  )

  const advanceTime = useCallback(
    (deltaTime: number) => {
      const prevTime = currentTimeRef.current
      let newTime = prevTime + deltaTime;

      // Wrap around at the end of the tune
      const totalBeats = currentTune.totalBeats || 16; // Use totalBeats or default
       if (newTime >= totalBeats) {
           newTime = newTime % totalBeats;
           // Schedule notes wrapping around the loop point
           scheduleNotes(prevTime, totalBeats);
           scheduleNotes(0, newTime);
       } else if (newTime < 0) {
           newTime = (newTime % totalBeats + totalBeats) % totalBeats; // Handle negative wrap around
           // Schedule notes wrapping around the loop point (backwards)
           scheduleNotes(0, prevTime);
           scheduleNotes(newTime, totalBeats);
       } else if (deltaTime > 0) {
            scheduleNotes(prevTime, newTime); // Schedule forward
       } else if (deltaTime < 0) {
           // Schedule backward - Note: scheduling backward might sound odd, depending on implementation
           // For simplicity, we might just update the time without playing notes when moving backward quickly
           // scheduleNotes(newTime, prevTime); // Less common use case
       }


      setCurrentTime(newTime);
      currentTimeRef.current = newTime; // Update ref

      // Update pattern page if necessary
      const newBeatIndex = Math.floor(newTime);
      const currentPage = Math.floor(newBeatIndex / visibleBeats);
      if (currentPage !== patternPage) {
        setPatternPage(currentPage);
      }
    },
    [scheduleNotes, visibleBeats, patternPage, currentTune.totalBeats],
  )


  const handleCrankRotation = useCallback(
    (angle: number) => {
      if (isHandlingCrankEvent || isPlayingRef.current) return; // Don't handle if already processing or playing automatically
      requestAnimationFrame(() => setCrankRotation(angle));

      const angleDiff = angle - lastCrankAngle;
      const threshold = 10; // Sensitivity threshold

      if (Math.abs(angleDiff) >= threshold) {
        setIsHandlingCrankEvent(true);
        const direction = angleDiff > 0 ? 1 : -1;
        const now = Date.now();
        const timeSinceLast = now - lastCrankTime;

        // Calculate speed based on angle change and time
        const speed = Math.abs(angleDiff) / Math.max(16, timeSinceLast); // Avoid division by zero, use ~60fps as base
        const timeDelta = direction * Math.min(0.5, speed * 0.1); // Scale speed, limit max step

        advanceTime(timeDelta);

        setLastCrankAngle(angle);
        setLastCrankTime(now);
        // Add momentum based on speed
        setMomentum(prev => Math.min(100, prev + Math.abs(angleDiff) * 0.5));
        setIsWindingUp(true); // Indicate active cranking

        setTimeout(() => setIsHandlingCrankEvent(false), 10); // Shorter timeout
      }
    },
    [lastCrankAngle, lastCrankTime, advanceTime, isHandlingCrankEvent],
  )

   // Momentum decay and auto-advance effect
   useEffect(() => {
    let decayInterval: NodeJS.Timeout | null = null;
    let advanceInterval: NodeJS.Timeout | null = null;
    const decayRate = 0.95; // How quickly momentum decays
    const advanceThreshold = 5; // Minimum momentum to auto-advance
    const baseAdvanceSpeed = 0.005; // Beats per interval at minimum momentum

    if (momentumRef.current > 0) {
      decayInterval = setInterval(() => {
        setMomentum(prev => {
          const newMomentum = prev * decayRate;
          return newMomentum < 1 ? 0 : newMomentum; // Stop when momentum is very low
        });
      }, 50); // Decay check frequency

       if (momentumRef.current > advanceThreshold && !isWindingUp) { // Auto-advance only if not actively cranking
            advanceInterval = setInterval(() => {
                // Advance speed proportional to momentum (logarithmic could feel more natural)
                const advanceSpeed = baseAdvanceSpeed * (momentumRef.current / 10);
                if (momentumRef.current > advanceThreshold && !windingUpRef.current) {
                     advanceTime(advanceSpeed);
                } else {
                    if(advanceInterval) clearInterval(advanceInterval);
                }
            }, 20); // Auto-advance check frequency (50 times/sec)
        }
    } else {
         setIsWindingUp(false); // Ensure winding stops when momentum hits 0
    }


    return () => {
      if (decayInterval) clearInterval(decayInterval);
      if (advanceInterval) clearInterval(advanceInterval);
    };
   }, [isWindingUp, advanceTime]); // Rerun when isWindingUp changes


  // Auto playback loop when isPlaying is true
  useEffect(() => {
    let playbackInterval: NodeJS.Timeout | null = null
    if (isPlayingRef.current) {
      const intervalMs = 1000 / 60 // Target ~60 updates per second
      const beatsPerFrame = bpm / 60 / 60 // Calculate beats to advance per frame
      playbackInterval = setInterval(() => {
        if (isPlayingRef.current) { // Double check inside interval
            advanceTime(beatsPerFrame)
        }
      }, intervalMs)
    }
    // Cleanup function
    return () => {
      if (playbackInterval) clearInterval(playbackInterval)
    }
  }, [isPlaying, bpm, advanceTime])

  // Keyboard controls
  useEffect(() => {
    mainRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      initAudio() // Ensure audio is ready on key press

      if (e.key === "ArrowRight") {
        e.preventDefault();
        handleCrankRotation(crankRotation + 15); // Simulate crank turn
        setIsWindingUp(true); // Indicate active input
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleCrankRotation(crankRotation - 15); // Simulate crank turn
         setIsWindingUp(true); // Indicate active input
      } else if (e.key === " ") {
         e.preventDefault();
         setIsPlaying(p => !p); // Toggle auto-play
         setMomentum(0); // Stop momentum if toggling play/pause
      }
      // Add other key bindings if needed
    }
     const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            setIsWindingUp(false); // Stop winding indicator when key released
        }
    };


    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp);
    return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
    }
  }, [initAudio, handleCrankRotation, crankRotation]) // Add dependencies

  const loadTuneData = useCallback((tuneData: TuneData) => {
    setCurrentTune(tuneData)
    // Reset states related to the tune
    setCurrentTime(0);
    setPatternPage(0);
    setBpm(tuneData.bpm);
    setSynthType(tuneData.synthType);
    setIsPlaying(false);
    setMomentum(0);
  }, [])

  const cycleThroughTunes = useCallback(() => {
    const currentIndex = tunes.findIndex((tune) => tune.name === currentTune.name)
    const nextIndex = (currentIndex + 1) % tunes.length
    loadTuneData(tunes[nextIndex])
  }, [currentTune.name, loadTuneData])

  const saveTune = useCallback(() => {
    const tuneToSave: SavedTune = {
      ...currentTune, // Include all existing data
      bpm: bpm, // Update with current settings
      synthType: synthType,
      // pattern is already part of currentTune
    }
    const tuneJSON = JSON.stringify(tuneToSave, null, 2)
    const blob = new Blob([tuneJSON], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${currentTune.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json` // Sanitize filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [currentTune, bpm, synthType])

  const renameTune = useCallback(() => {
    const newName = prompt("Enter a new name for this tune:", currentTune.name)
    if (newName && newName.trim() !== "") {
      setCurrentTune(prev => ({
        ...prev,
        name: newName.trim()
      }))
    }
  }, [currentTune.name]) // Dependency on currentTune.name

  const clearTune = useCallback(() => {
    if (confirm("Are you sure you want to clear all notes in this tune? This cannot be undone.")) {
      setCurrentTune(prev => ({
        ...prev,
        pattern: [], // Clear the pattern array
      }))
       setCurrentTime(0); // Reset time
       setPatternPage(0); // Reset page
    }
  }, [])

  const loadTuneFile = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json, .mid, .midi" // Accept JSON and MIDI
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        try {
           if (file.name.endsWith('.json')) {
              const loadedData = JSON.parse(event.target?.result as string) as SavedTune
              // Basic validation
              if (loadedData.name && loadedData.bpm && loadedData.pattern && loadedData.synthType && loadedData.totalBeats !== undefined) {
                loadTuneData(loadedData)
              } else {
                alert("Invalid JSON tune file format.")
              }
           } else if (file.name.endsWith('.mid') || file.name.endsWith('.midi')) {
               // Handle MIDI file loading (requires a MIDI parsing library)
               alert("MIDI file loading not yet implemented.");
               // Example placeholder for future implementation:
               // const midiData = event.target?.result; // ArrayBuffer or Base64
               // const parsedTune = parseMidi(midiData); // Needs parseMidi function
               // loadTuneData(parsedTune);
           }

        } catch (error) {
          console.error("Error loading tune:", error)
          alert("Failed to load or parse the tune file.")
        }
      }

       if (file.name.endsWith('.json')) {
         reader.readAsText(file)
       } else if (file.name.endsWith('.mid') || file.name.endsWith('.midi')) {
           reader.readAsArrayBuffer(file); // Read MIDI as ArrayBuffer
       }
    }
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }, [loadTuneData])

  // --- Interaction Handlers for Crank ---
  const handleInteractionStart = useCallback(
    (clientY: number) => {
      initAudio() // Ensure audio is ready on touch/click
      setIsDragging(true)
      setDragStartY(clientY)
      setIsWindingUp(true); // Start winding indicator
    },
    [initAudio],
  )

  const handleInteractionMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return
      const deltaY = dragStartY - clientY // Inverted Y controls: drag up = forward, drag down = backward
      if (Math.abs(deltaY) > 3) { // Sensitivity threshold
        handleCrankRotation(crankRotation + deltaY * 1.0) // Adjust multiplier for sensitivity
        setDragStartY(clientY)
      }
    },
    [isDragging, dragStartY, crankRotation, handleCrankRotation],
  )

  const handleInteractionEnd = useCallback(() => {
    if (isDragging) {
        setIsDragging(false)
        setIsWindingUp(false); // Stop winding indicator
    }
  }, [isDragging])

  const handleMouseDown = useCallback((e: React.MouseEvent) => handleInteractionStart(e.clientY), [handleInteractionStart])
  const handleMouseMove = useCallback((e: React.MouseEvent) => handleInteractionMove(e.clientY), [handleInteractionMove])
  const handleMouseUp = useCallback(handleInteractionEnd, [handleInteractionEnd])
  const handleTouchStart = useCallback((e: React.TouchEvent) => { e.preventDefault(); handleInteractionStart(e.touches[0].clientY); }, [handleInteractionStart])
  const handleTouchMove = useCallback((e: React.TouchEvent) => { e.preventDefault(); handleInteractionMove(e.touches[0].clientY); }, [handleInteractionMove])
  const handleTouchEnd = useCallback((e: React.TouchEvent) => { e.preventDefault(); handleInteractionEnd(); }, [handleInteractionEnd])

  // Get color class based on note name (for text labels)
  const getNoteTextColor = useCallback((note: string): string => {
    if (!note) return "neon-text-gray"; // Default color
    if (["KICK", "SNARE", "HAT", "RIDE"].includes(note)) return "neon-text-purple";
    if (note.includes("5") || note.includes("6")) return "neon-text-pink";
    if (note.includes("4")) return "neon-text-blue";
    if (note.includes("3")) return "neon-text-green";
    if (note.includes("2")) return "neon-text-yellow";
    return "neon-text-cyan"; // Default for others
  }, []);

  // Get background color class for active note squares
   const getNoteBgColorClass = useCallback((note: string): string => {
    if (!note) return "";
    // Use distinct colors for active notes based on image
    if (["KICK", "SNARE", "HAT", "RIDE"].includes(note) || note.startsWith("0")) { // Assuming '05' was KICK/etc.
       return "note-color-pink"; // Pink for drums/top rows
    }
    return "note-color-cyan"; // Cyan for other notes
  }, []);


  const gridDisplay = useMemo((): GridDisplayCell[][] => {
    const visibleIndices = getVisibleBeatIndices()
    // Initialize grid
    const grid: GridDisplayCell[][] = ALL_NOTES.map((note) =>
      visibleIndices.map((beatIndex) => ({
        note: note,
        beat: beatIndex + 1, // Store 1-based beat number
        state: { active: false, isStart: false },
      })),
    )

    // Populate grid based on current tune pattern
    currentTune.pattern.forEach((event) => {
      const notesInEvent = Array.isArray(event.note) ? event.note : [event.note]
      notesInEvent.forEach((note) => {
        const rowIndex = ALL_NOTES.indexOf(note)
        if (rowIndex === -1) return // Skip if note not in our current list

        const startBeatIndex = Math.floor(event.time)
        // Duration needs careful handling if it spans across page boundaries
        const endBeatIndex = Math.floor(event.time + event.duration - 0.001); // Inclusive end beat

        for (let beatIndex = startBeatIndex; beatIndex <= endBeatIndex; beatIndex++) {
          if (visibleIndices.includes(beatIndex)) {
            const colIndex = visibleIndices.indexOf(beatIndex);
            if (grid[rowIndex] && grid[rowIndex][colIndex]) { // Check bounds
                 grid[rowIndex][colIndex].state.active = true;
                 // Mark the start of the note
                 if (beatIndex === startBeatIndex) {
                    grid[rowIndex][colIndex].state.isStart = true;
                 }
            }
          }
        }
      })
    })
    return grid
  }, [ALL_NOTES, currentTune.pattern, getVisibleBeatIndices])

  const currentBeatDisplay = Math.floor(currentTime) + 1
  const subBeatPosition = currentTime - Math.floor(currentTime)

  // Handle clicking on a grid cell to toggle notes
  const handleCellClick = useCallback((note: NotePitch, beatIndex: number, isShiftClick: boolean) => {
    initAudio(); // Ensure audio is ready
    const time = beatIndex; // 0-based index matches event.time

    // Find if an event exists for this exact note at this exact time start
    const existingEventIndex = currentTune.pattern.findIndex(event =>
      Math.floor(event.time) === time &&
      (event.note === note || (Array.isArray(event.note) && event.note.includes(note)))
    );

    if (isShiftClick && existingEventIndex !== -1) {
         // Shift-click selects the note for editing
         const event = currentTune.pattern[existingEventIndex];
         setSelectedNote({ note, time });
         setSelectedNoteSynth(event.synthType || synthType); // Use event's synth or default
         return;
    }


    const updatedPattern = [...currentTune.pattern];
    if (existingEventIndex !== -1) {
      // Note exists, remove it
      const event = updatedPattern[existingEventIndex];
      if (Array.isArray(event.note)) {
        // Remove note from array
        const updatedNotes = event.note.filter(n => n !== note);
        if (updatedNotes.length === 0) {
          // Remove event if no notes left
          updatedPattern.splice(existingEventIndex, 1);
        } else if (updatedNotes.length === 1) {
          // Simplify to single note if only one left
          event.note = updatedNotes[0];
        } else {
          event.note = updatedNotes;
        }
      } else {
        // Remove the entire event if it was a single note
        updatedPattern.splice(existingEventIndex, 1);
      }
    } else {
      // Note doesn't exist, add it
      // Check if another event *starts* at the same time
       const eventAtSameTimeIndex = updatedPattern.findIndex(event => Math.floor(event.time) === time);
       if (eventAtSameTimeIndex !== -1) {
           // Add to existing event if it's an array, or convert to array
           const existingEvent = updatedPattern[eventAtSameTimeIndex];
           if (Array.isArray(existingEvent.note)) {
               existingEvent.note.push(note);
           } else {
               existingEvent.note = [existingEvent.note, note];
           }
       } else {
           // Add a new event
          updatedPattern.push({
            time: time, // Start time is the beat index
            note: note,
            duration: 0.75, // Default duration (beats)
            velocity: 1,
            synthType: synthType // Use current global synth type
          });
       }
       // Play the note immediately when adding
        playNoteInternal(note, 0.75, 1, synthType);
    }

     // Sort pattern by time after modification
     updatedPattern.sort((a, b) => a.time - b.time);

    setCurrentTune(prev => ({
      ...prev,
      pattern: updatedPattern,
    }));
     // Clear selection after edit
     setSelectedNote(null);

  }, [currentTune.pattern, synthType, initAudio, playNoteInternal]);

  // Handle applying synth type changes
   const applySynthChange = useCallback(() => {
    if (!selectedNote) return;

    const updatedPattern = [...currentTune.pattern];
    let changesMade = false;

    if (selectedNote.time === -1) {
        // Apply to all instances of the note
        updatedPattern.forEach((event, index) => {
            const notes = Array.isArray(event.note) ? event.note : [event.note];
            if (notes.includes(selectedNote.note)) {
                // Create a new object to ensure state update
                updatedPattern[index] = {
                    ...event,
                    synthType: selectedNoteSynth
                };
                changesMade = true;
            }
        });
    } else {
        // Apply to the specific note instance
        const noteIndex = updatedPattern.findIndex(event =>
             Math.floor(event.time) === selectedNote.time &&
             (event.note === selectedNote.note || (Array.isArray(event.note) && event.note.includes(selectedNote.note)))
        );

        if (noteIndex !== -1) {
             // Create a new object to ensure state update
             updatedPattern[noteIndex] = {
                 ...updatedPattern[noteIndex],
                 synthType: selectedNoteSynth
             };
             changesMade = true;
        }
    }

    if (changesMade) {
        setCurrentTune(prev => ({
            ...prev,
            pattern: updatedPattern
        }));
    }

    setSelectedNote(null); // Clear selection
   }, [selectedNote, selectedNoteSynth, currentTune.pattern]);



  return (
    <>
      <Head>
        {/* Use viewport meta tag for mobile scaling */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        {/* Force landscape suggestion (though not strictly enforceable) */}
        <meta name="screen-orientation" content="landscape" />
        <title>micro-crank - {currentTune.name}</title>
      </Head>
      <main
        ref={mainRef}
        // Apply mode class and low power class
        className={`flex select-none min-h-screen max-h-screen h-screen flex-col items-center justify-center relative overflow-hidden font-pixelify ${mode === "Light" ? "light-mode" : "dark-mode"} ${isLowPowerDevice ? "low-power-mode" : ""}`}
        tabIndex={0} // Make main div focusable for keyboard events
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // End drag if mouse leaves the area
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd} // End drag on touch cancel
      >
        {/* Main container for the UI */}
        <div
          className={`relative ${isLandscape ? "w-full max-w-[720px] h-[375px]" : "w-full max-w-[375px] aspect-[9/16]"} bg-background overflow-hidden retro-grid`}
        >
          {isLandscape ? (
            // Landscape Layout
            <div className="flex h-full w-full">
              {/* Left Panel */}
              <div className="w-[120px] p-2 flex flex-col justify-between retro-panel neon-border-blue">
                {/* Top Section */}
                <div>
                  <div className="flex items-center gap-1 mb-2">
                     {/* Mode Toggle */}
                     <button
                      onClick={() => setMode((m) => (m === "Dark" ? "Light" : "Dark"))}
                      className="text-[9px] px-1 py-0.5 rounded border"
                     >
                       <span className={mode === 'Dark' ? 'neon-text-green' : 'text-black'}>{mode}</span>
                     </button>
                     {/* Edit/Clear Buttons */}
                     <button onClick={renameTune} className="flex-1 h-5 p-1 rounded border flex items-center justify-center" title="Rename tune"><Pencil className="w-3 h-3 neon-text-cyan" /></button>
                     <button onClick={clearTune} className="flex-1 h-5 p-1 rounded border flex items-center justify-center" title="Clear tune"><Trash2 className="w-3 h-3 neon-text-red" /></button>
                  </div>
                  {/* Tune Name Display */}
                  <div
                    className="text-center cursor-pointer px-1 py-1 mb-2 digital-display neon-border-pink"
                    onClick={cycleThroughTunes}
                    title="Click to cycle tune"
                  >
                    <span className="font-pixelify neon-text-pink text-[10px] leading-tight block truncate">{currentTune.name}</span>
                  </div>
                  {/* Page Indicator */}
                  <button
                    className="w-full px-1 py-0.5 text-[10px] rounded border neon-border-green font-pixelify mb-2"
                    onClick={() => setPatternPage((p) => (p + 1) % Math.ceil(beats.length / visibleBeats))}
                  >
                    <span className="neon-text-green">
                      PAGE {patternPage + 1}/{Math.ceil(beats.length / visibleBeats)}
                    </span>
                  </button>

                   {/* --- Note Editor Panel --- */}
                  {selectedNote && (
                    <div className="flex flex-col gap-1 mb-2 neon-border-blue p-1 border text-[9px]">
                      <div className="font-pixelify neon-text-blue">
                        {selectedNote.time === -1 ? 'EDIT ALL' : 'EDIT NOTE'}
                      </div>
                      <div className="font-pixelify neon-text-pink truncate">
                        {selectedNote.note} {selectedNote.time === -1 ? '' : `@ ${selectedNote.time + 1}`}
                      </div>
                      {/* Synth Selector */}
                      <select
                        className="w-full text-[9px] border neon-border-pink py-0.5 px-1"
                        value={selectedNoteSynth}
                        onChange={(e) => setSelectedNoteSynth(e.target.value as SynthType)}
                      >
                        <option value="Piano">Piano</option>
                        <option value="Music Box">Music Box</option>
                        <option value="Sine">Sine</option>
                        <option value="Square">Square</option>
                        <option value="Saw">Saw</option>
                        <option value="Triangle">Triangle</option>
                         {/* Add KICK/SNARE etc. if they should be selectable? Probably not. */}
                      </select>
                      {/* Apply Button */}
                      <button
                        className="w-full text-[9px] rounded border neon-border-cyan font-pixelify py-0.5"
                        onClick={applySynthChange}
                      >
                        <span className="neon-text-cyan">APPLY</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Section */}
                <div className="flex flex-col gap-1">
                   {/* Random Tune Button */}
                   <button
                    className="w-full py-1 rounded border neon-border-purple flex items-center justify-center"
                    onClick={() => loadTuneData(getRandomTune())}
                   >
                     <span className="font-pixelify neon-text-purple text-xs">RANDOM</span>
                   </button>
                   {/* Save/Load Buttons */}
                   <div className="flex gap-1 mt-1">
                     <button className="flex-1 py-1 rounded border neon-border-yellow flex items-center justify-center" onClick={saveTune} title="Save"><Save className={`w-3 h-3 ${mode === 'Dark' ? 'neon-text-yellow' : 'text-black'}`} /></button>
                     <button className="flex-1 py-1 rounded border neon-border-green flex items-center justify-center" onClick={loadTuneFile} title="Load"><FolderOpen className={`w-3 h-3 ${mode === 'Dark' ? 'neon-text-green' : 'text-black'}`} /></button>
                   </div>
                </div>
              </div>

              {/* Grid Panel */}
              <div className="flex-1 p-1 overflow-hidden retro-panel neon-border-green flex flex-col">
                 {/* Grid Header Row */}
                <div className="grid grid-cols-9 gap-0 text-[9px] w-full flex-shrink-0">
                   {/* Note Icon Header */}
                   <div className="flex justify-center items-center note-label">
                     <Music className="w-3 h-3 neon-text-blue" /> {/* Replaced Text with Icon */}
                   </div>
                   {/* Beat Number Headers */}
                   {getVisibleBeatIndices().map((beatIndex) => (
                     <div
                       key={`h-${beatIndex}`}
                       className={`text-center font-pixelify ${Math.floor(currentTime) === beatIndex ? "neon-text-pink font-bold" : "neon-text-blue"}`}
                     >
                       {beatIndex + 1}
                     </div>
                   ))}
                </div>
                {/* Scrollable Grid Area */}
                <div className="flex-grow overflow-y-auto overflow-x-hidden scrollable-grid">
                  <div className="grid grid-cols-9 gap-0 text-[9px] w-full">
                    {/* Grid Rows */}
                    {gridDisplay.map((row, rowIndex) => (
                      <React.Fragment key={`r-${rowIndex}`}>
                        {/* Note Label */}
                        <div
                          className={`note-label font-pixelify truncate cursor-pointer ${getNoteTextColor(ALL_NOTES[rowIndex])}`}
                           title={`Click to edit all ${ALL_NOTES[rowIndex]}`}
                           onClick={() => {
                             setSelectedNote({note: ALL_NOTES[rowIndex], time: -1}); // Select all notes of this type
                             // Find first instance to set default synth type in editor
                             const firstInstance = currentTune.pattern.find(
                                 event => (Array.isArray(event.note) ? event.note.includes(ALL_NOTES[rowIndex]) : event.note === ALL_NOTES[rowIndex])
                             );
                             setSelectedNoteSynth(firstInstance?.synthType || synthType);
                          }}
                        >
                          {ALL_NOTES[rowIndex]}
                        </div>
                        {/* Note Cells */}
                        {row.map((cell, colIndex) => {
                          const beatIndex = getVisibleBeatIndices()[colIndex]
                          const isCurrentBeatCol = Math.floor(currentTime) === beatIndex;
                          return (
                            <div
                              key={`c-${rowIndex}-${beatIndex}`}
                              className={`w-full h-[16px] flex items-center justify-center cursor-pointer relative ${isCurrentBeatCol ? "current-beat-col" : ""}`}
                              onClick={(e) => handleCellClick(ALL_NOTES[rowIndex], beatIndex, e.shiftKey)}
                               title={`Beat ${beatIndex + 1}, Note ${ALL_NOTES[rowIndex]}${cell.state.active ? ' (Click to remove, Shift+Click to edit)' : ' (Click to add)'}`}
                            >
                              {/* Display active note square */}
                              {cell.state.active && (
                                <div
                                  className={`note-active-square ${getNoteBgColorClass(ALL_NOTES[rowIndex])}`}
                                  // Optionally add style for isStart if needed
                                  // style={{ border: cell.state.isStart ? '1px solid white' : 'none' }}
                                />
                              )}
                            </div>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel (Crank & Display) */}
              <div
                className="w-[100px] p-2 flex flex-col justify-end items-center retro-panel neon-border-purple"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
              >
                {/* Crank Visual */}
                <div
                  className={`w-16 h-16 flex items-center justify-center relative ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                  title="Drag or use Arrow Keys"
                >
                  <motion.div
                    className="w-full h-full flex items-center justify-center"
                    style={{ rotate: crankRotation }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }} // Add smooth animation
                  >
                    {/* Simple crank handle visual */}
                    <div className={`w-2 h-8 absolute top-0 ${mode === 'Dark' ? 'bg-green-500' : 'bg-green-700'} crank-handle`} style={{ transform: "translateY(-4px)", boxShadow: mode === 'Dark' ? '0 0 5px #0f0' : 'none' }} />
                  </motion.div>
                </div>
                {/* Play/Pause Button */}
                 <button
                    onClick={() => setIsPlaying(p => !p)}
                    className="mt-2 w-full py-1 text-xs rounded border neon-border-blue"
                 >
                    <span className="neon-text-blue">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                 </button>

                {/* Beat Display */}
                <div className="mt-2 text-center digital-display neon-border-green w-full">
                  <div className="flex items-center justify-center p-1">
                    <div className="font-pixelify neon-text-green text-lg font-bold">{currentBeatDisplay}</div>
                     {/* Sub-beat Indicator */}
                    <div className="w-6 h-3 ml-1 relative overflow-hidden sub-beat-indicator">
                      <div
                        className="h-full sub-beat-position"
                        style={{ width: `${subBeatPosition * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Portrait Mode Message
            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black bg-opacity-90">
              <div className="text-center p-4">
                <span className="font-pixelify neon-text-pink text-lg block">Rotate device</span>
                <span className="font-pixelify neon-text-green text-sm block">to Landscape</span>
              </div>
            </div>
          )}
        </div>
        {/* Removed Inline Global Style Block - Moved to globals.css */}
      </main>
    </>
  )
}