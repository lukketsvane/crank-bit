"use client"
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { motion } from "framer-motion"
import Head from "next/head"
import { Save, FolderOpen } from "lucide-react"
import type { NotePitch, SynthType, Mode, GridDisplayCell, SavedTune, TuneData } from "../tunes/types"
import tunes, { getRandomTune } from "../tunes"
import avril14th from "../tunes/avril14th"

const useOrientation = () => {
  const [isLandscape, setIsLandscape] = useState(true)
  useEffect(() => {
    const checkOrientation = () => setIsLandscape(window.innerWidth > window.innerHeight)
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

const noteToFrequencyMap = {
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
  if (["KICK", "SNARE", "HAT", "RIDE"].includes(note)) return 0
  const matches = note.match(/([A-G][b#]?)(\d+)/)
  if (!matches) return 0
  const [, noteName, octaveStr] = matches
  const octave = Number.parseInt(octaveStr, 10)
  const baseFreq = noteToFrequencyMap[noteName]
  if (!baseFreq) return 0
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

  const momentumRef = useRef(momentum)
  const autoPlaySpeedRef = useRef(autoPlaySpeed)
  const windingUpRef = useRef(isWindingUp)
  const currentTimeRef = useRef(currentTime)
  const isPlayingRef = useRef(isPlaying)

  useEffect(() => {
    momentumRef.current = momentum
  }, [momentum])
  useEffect(() => {
    autoPlaySpeedRef.current = autoPlaySpeed
  }, [autoPlaySpeed])
  useEffect(() => {
    windingUpRef.current = isWindingUp
  }, [isWindingUp])
  useEffect(() => {
    currentTimeRef.current = currentTime
  }, [currentTime])
  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const ALL_NOTES: NotePitch[] = useMemo(() => {
    const noteSet = new Set<NotePitch>()
    tunes.forEach((tune) =>
      tune.pattern.forEach((event) => {
        if (Array.isArray(event.note)) event.note.forEach((n) => noteSet.add(n))
        else noteSet.add(event.note)
      }),
    )
    ;["KICK", "SNARE", "HAT", "RIDE"].forEach((p) => noteSet.add(p))
    return Array.from(noteSet).sort((a, b) => {
      const octaveA =
        Number.parseInt(a.replace(/[^0-9]/g, ""), 10) || (["KICK", "SNARE", "HAT", "RIDE"].includes(a) ? -1 : 0)
      const octaveB =
        Number.parseInt(b.replace(/[^0-9]/g, ""), 10) || (["KICK", "SNARE", "HAT", "RIDE"].includes(b) ? -1 : 0)
      if (octaveA !== octaveB) return octaveB - octaveA
      const pitchOrder = [
        "C",
        "C#",
        "Db",
        "D",
        "D#",
        "Eb",
        "E",
        "F",
        "F#",
        "Gb",
        "G",
        "G#",
        "Ab",
        "A",
        "A#",
        "Bb",
        "B",
        "KICK",
        "SNARE",
        "HAT",
        "RIDE",
      ]
      return pitchOrder.indexOf(a.replace(/[0-9]/g, "")) - pitchOrder.indexOf(b.replace(/[0-9]/g, ""))
    })
  }, [])

  const beats = useMemo(
    () => Array.from({ length: Math.max(32, currentTune.totalBeats) }, (_, i) => i + 1),
    [currentTune.totalBeats],
  )
  const visibleBeats = 8

  const getVisibleBeatIndices = useCallback(() => {
    const startBeat = patternPage * visibleBeats
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
    Object.values(activeSourcesRef.current)
      .flat()
      .forEach((src) => {
        try {
          src.osc?.stop()
          src.source?.stop()
        } catch {}
      })
    activeSourcesRef.current = {}
  }, [currentTune])

  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext
        audioContextRef.current = new AudioContext()
      } catch (err) {
        console.error("Failed to create audio context:", err)
        return
      }
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current
        .resume()
        .then(() => playTestTone())
        .catch((err) => console.error("Failed to resume audio context:", err))
    } else if (audioContextRef.current.state === "running") {
      playTestTone()
    }
  }, [])

  const playTestTone = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state !== "running") return
    const ctx = audioContextRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = 440
    gain.gain.value = 0.2
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  }, [])

  useEffect(() => {
    const handleInteraction = () => {
      initAudio()
      document.removeEventListener("click", handleInteraction)
      document.removeEventListener("keydown", handleInteraction)
      document.removeEventListener("touchstart", handleInteraction)
    }
    document.addEventListener("click", handleInteraction)
    document.addEventListener("keydown", handleInteraction)
    document.addEventListener("touchstart", handleInteraction)
    return () => {
      document.removeEventListener("click", handleInteraction)
      document.removeEventListener("keydown", handleInteraction)
      document.removeEventListener("touchstart", handleInteraction)
      audioContextRef.current?.close()
    }
  }, [initAudio])

  const playNoteInternal = useCallback(
    (note: NotePitch, duration: number, velocity = 1) => {
      if (!audioContextRef.current) {
        initAudio()
        return
      }
      if (audioContextRef.current.state !== "running") {
        audioContextRef.current.resume().catch((err) => console.error("Resume failed:", err))
        return
      }
      if (duration < 0.05) return

      const activeSourcesCount = Object.keys(activeSourcesRef.current).length
      if (activeSourcesCount > 24) {
        const oldestKeys = Object.keys(activeSourcesRef.current).slice(0, 8)
        oldestKeys.forEach((key) => {
          activeSourcesRef.current[key].forEach((src) => {
            try {
              src.osc?.stop()
              src.gain.disconnect()
            } catch {}
          })
          delete activeSourcesRef.current[key]
        })
      }

      const ctx = audioContextRef.current
      const now = ctx.currentTime
      const stopTime = now + (duration * 60) / bpm

      if (["KICK", "SNARE", "HAT", "RIDE"].includes(note)) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        if (note === "KICK") {
          osc.type = "sine"
          osc.frequency.setValueAtTime(120, now)
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.1)
          gain.gain.setValueAtTime(0.8 * velocity, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
        } else if (note === "SNARE") {
          osc.type = "triangle"
          osc.frequency.value = 200
          gain.gain.setValueAtTime(0.5 * velocity, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
        } else {
          osc.type = "square"
          osc.frequency.value = note === "HAT" ? 800 : 600
          gain.gain.setValueAtTime(0.3 * velocity, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
        }

        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.5)
        return
      }

      const freq = getFrequency(note, transpose)
      if (!freq) return

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      if (synthType === "Piano") osc.type = "triangle"
      else if (synthType === "Music Box") osc.type = "sine"
      else osc.type = synthType.toLowerCase() as OscillatorType

      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.4 * velocity, now + 0.01)
      gain.gain.setTargetAtTime(0, now + 0.1, 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(stopTime)

      const sourceId = `${note}-${now}`
      activeSourcesRef.current[sourceId] = [{ osc, gain }]

      if (synthType === "Piano") {
        const harmonicOsc = ctx.createOscillator()
        const harmonicGain = ctx.createGain()
        harmonicOsc.type = "sine"
        harmonicOsc.frequency.value = freq * 2
        harmonicGain.gain.setValueAtTime(0, now)
        harmonicGain.gain.linearRampToValueAtTime(0.15 * velocity, now + 0.01)
        harmonicGain.gain.setTargetAtTime(0, now + 0.1, 0.3)
        harmonicOsc.connect(harmonicGain)
        harmonicGain.connect(ctx.destination)
        harmonicOsc.start(now)
        harmonicOsc.stop(stopTime)
        activeSourcesRef.current[sourceId].push({ osc: harmonicOsc, gain: harmonicGain })
      }
    },
    [bpm, synthType, transpose, initAudio],
  )

  const scheduleNotes = useCallback(
    (startTime: number, endTime: number) => {
      initAudio()
      if (!audioContextRef.current || audioContextRef.current.state !== "running") return
      const maxNotesToSchedule = 12
      let notesScheduled = 0
      for (const event of currentTune.pattern) {
        if (event.time >= startTime && event.time < endTime) {
          const notesToPlay = Array.isArray(event.note) ? event.note : [event.note]
          const limitedNotes = notesToPlay.slice(0, 4)
          for (const note of limitedNotes) {
            playNoteInternal(note, event.duration, event.velocity || 1)
            notesScheduled++
            if (notesScheduled >= maxNotesToSchedule) return
          }
        }
      }
    },
    [currentTune.pattern, initAudio, playNoteInternal],
  )

  const advanceTime = useCallback(
    (deltaTime: number) => {
      const prevTime = currentTimeRef.current
      const newTime = Math.max(0, prevTime + deltaTime)
      const adjustedTime = newTime >= currentTune.totalBeats ? newTime % currentTune.totalBeats : newTime
      setCurrentTime(adjustedTime)
      currentTimeRef.current = adjustedTime
      if (deltaTime > 0) {
        if (newTime >= currentTune.totalBeats && prevTime < currentTune.totalBeats) {
          scheduleNotes(prevTime, currentTune.totalBeats)
          scheduleNotes(0, adjustedTime)
        } else {
          scheduleNotes(prevTime, newTime)
        }
      }
      const newBeatIndex = Math.floor(adjustedTime)
      const currentPage = Math.floor(newBeatIndex / visibleBeats)
      if (currentPage !== patternPage) setPatternPage(currentPage)
    },
    [scheduleNotes, visibleBeats, patternPage, currentTune.totalBeats],
  )

  const playNotesAtBeat = useCallback(
    (exactBeat: number) => {
      const notesToPlay = currentTune.pattern.filter(
        (event) => Math.floor(event.time) === exactBeat && Math.abs(event.time - exactBeat) < 0.01,
      )

      for (const event of notesToPlay) {
        const noteArray = Array.isArray(event.note) ? event.note : [event.note]
        for (const note of noteArray) {
          playNoteInternal(note, event.duration, event.velocity || 1)
        }
      }
    },
    [currentTune.pattern, playNoteInternal],
  )

  const handleCrankRotation = useCallback(
    (angle: number) => {
      if (isHandlingCrankEvent) return
      requestAnimationFrame(() => setCrankRotation(angle))

      const angleDiff = angle - lastCrankAngle
      const threshold = 15

      if (Math.abs(angleDiff) >= threshold) {
        setIsHandlingCrankEvent(true)
        const direction = angleDiff > 0 ? 1 : -1
        const now = Date.now()

        if (direction > 0) {
          // Advance by exactly 1/8th of a beat for precise control
          const prevTime = currentTimeRef.current
          const newTime = prevTime + 0.125
          const adjustedTime = newTime >= currentTune.totalBeats ? newTime % currentTune.totalBeats : newTime

          setCurrentTime(adjustedTime)
          currentTimeRef.current = adjustedTime

          // Find and play only the notes at this exact position
          const notesToPlay = currentTune.pattern.filter((event) => event.time >= prevTime && event.time < newTime)

          for (const event of notesToPlay) {
            const noteArray = Array.isArray(event.note) ? event.note : [event.note]
            // Only play one note at a time for precise control
            if (noteArray.length > 0) {
              playNoteInternal(noteArray[0], event.duration, event.velocity || 1)
            }
          }

          setMomentum(20)
          setAutoPlaySpeed(0.25) // Slower auto-play for more control
          setIsWindingUp(true)
          setLastCrankTime(now)

          const currentPage = Math.floor(Math.floor(adjustedTime) / visibleBeats)
          if (currentPage !== patternPage) setPatternPage(currentPage)
        } else {
          // Move backward by a smaller increment
          advanceTime(-0.05)
          setMomentum(Math.max(momentumRef.current - 10, 0))
        }
        setLastCrankAngle(angle)
        setTimeout(() => setIsHandlingCrankEvent(false), 16)
      }
    },
    [lastCrankAngle, advanceTime, currentTune.totalBeats, visibleBeats, patternPage, playNoteInternal],
  )

  useEffect(() => {
    let momentumDecayInterval: NodeJS.Timeout | null = null
    let autoPlayInterval: NodeJS.Timeout | null = null
    if (momentumRef.current > 0) {
      momentumDecayInterval = setInterval(() => {
        const newMomentum = Math.max(momentumRef.current - 0.6, 0)
        setMomentum(newMomentum)
        if (newMomentum === 0) {
          setIsWindingUp(false)
          if (autoPlayInterval) clearInterval(autoPlayInterval)
        }
      }, 60)
    }

    if (momentumRef.current > 0 && windingUpRef.current && autoPlaySpeedRef.current > 0) {
      const updateFrequency = 20
      const timeDeltaPerUpdate = autoPlaySpeedRef.current / updateFrequency
      autoPlayInterval = setInterval(() => {
        if (momentumRef.current > 0 && windingUpRef.current) {
          advanceTime(timeDeltaPerUpdate)
        } else if (autoPlayInterval) {
          clearInterval(autoPlayInterval)
        }
      }, 1000 / updateFrequency)
    }

    return () => {
      if (momentumDecayInterval) clearInterval(momentumDecayInterval)
      if (autoPlayInterval) clearInterval(autoPlayInterval)
    }
  }, [isWindingUp, advanceTime])

  useEffect(() => {
    let playbackInterval: NodeJS.Timeout | null = null
    if (isPlayingRef.current) {
      const intervalMs = 1000 / 30
      const beatsPerFrame = bpm / 60 / 30
      playbackInterval = setInterval(() => {
        if (isPlayingRef.current) advanceTime(beatsPerFrame)
      }, intervalMs)
    }
    return () => {
      if (playbackInterval) clearInterval(playbackInterval)
    }
  }, [isPlaying, bpm, advanceTime])

  useEffect(() => {
    mainRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      initAudio()
      if (!audioContextRef.current || audioContextRef.current.state !== "running") {
        playTestTone()
        return
      }

      if (e.key === "ArrowRight") {
        const now = Date.now()
        setLastCrankTime(now)

        setCrankRotation((prev) => prev + 15)
        setMomentum(20)
        setAutoPlaySpeed(0.25) // Slower auto-play for more control
        setIsWindingUp(true)

        const prevTime = currentTimeRef.current
        const newTime = prevTime + 0.125 // Advance by 1/8th beat for precise control
        const adjustedTime = newTime >= currentTune.totalBeats ? newTime % currentTune.totalBeats : newTime

        setCurrentTime(adjustedTime)
        currentTimeRef.current = adjustedTime

        // Find and play only the notes at this exact position
        const notesToPlay = currentTune.pattern.filter((event) => event.time >= prevTime && event.time < newTime)

        for (const event of notesToPlay) {
          const noteArray = Array.isArray(event.note) ? event.note : [event.note]
          // Only play one note at a time for precise control
          if (noteArray.length > 0) {
            playNoteInternal(noteArray[0], event.duration, event.velocity || 1)
          }
        }

        const currentPage = Math.floor(Math.floor(adjustedTime) / visibleBeats)
        if (currentPage !== patternPage) setPatternPage(currentPage)
      } else if (e.key === "ArrowLeft") {
        const newMomentum = Math.max(momentumRef.current - 15, 0)
        setMomentum(newMomentum)
        if (newMomentum === 0) setIsWindingUp(false)
        advanceTime(-0.05) // Move backward by a small increment
      } else if (e.key === " ") {
        setIsWindingUp(!windingUpRef.current)
      } else if (e.key === "t") {
        playTestTone()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [initAudio, playTestTone, currentTune.totalBeats, visibleBeats, patternPage, playNoteInternal])

  const loadTuneData = useCallback((tuneData: TuneData) => {
    setCurrentTune(tuneData)
  }, [])

  const cycleThroughTunes = useCallback(() => {
    const currentIndex = tunes.findIndex((tune) => tune.name === currentTune.name)
    const nextIndex = (currentIndex + 1) % tunes.length
    loadTuneData(tunes[nextIndex])
  }, [currentTune.name, loadTuneData])

  const saveTune = useCallback(() => {
    const tuneToSave: SavedTune = {
      name: currentTune.name,
      bpm: bpm,
      synthType: synthType,
      pattern: currentTune.pattern,
      totalBeats: currentTune.totalBeats,
      midiData: currentTune.midiData,
    }
    const tuneJSON = JSON.stringify(tuneToSave, null, 2)
    const blob = new Blob([tuneJSON], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${currentTune.name.replace(/\s+/g, "_").toLowerCase()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [currentTune, bpm, synthType])

  const loadTuneFile = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const loadedData = JSON.parse(event.target?.result as string) as SavedTune
          if (
            loadedData.name &&
            loadedData.bpm &&
            loadedData.pattern &&
            loadedData.synthType &&
            loadedData.totalBeats
          ) {
            loadTuneData(loadedData)
          } else {
            alert("Invalid tune file format")
          }
        } catch (error) {
          console.error("Error loading tune:", error)
          alert("Invalid tune file format")
        }
      }
      reader.readAsText(file)
    }
    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  }, [loadTuneData])

  const handleInteractionStart = useCallback(
    (clientY: number) => {
      initAudio()
      setIsDragging(true)
      setDragStartY(clientY)
    },
    [initAudio],
  )

  const handleInteractionMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return
      const deltaY = dragStartY - clientY
      if (Math.abs(deltaY) > 5) {
        handleCrankRotation(crankRotation + deltaY * 1.2)
        setDragStartY(clientY)
      }
    },
    [isDragging, dragStartY, crankRotation, handleCrankRotation],
  )

  const handleInteractionEnd = useCallback(() => {
    setIsDragging(false)
    setIsWindingUp(false)
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => handleInteractionStart(e.clientY),
    [handleInteractionStart],
  )
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => handleInteractionMove(e.clientY),
    [handleInteractionMove],
  )
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => handleInteractionStart(e.touches[0].clientY),
    [handleInteractionStart],
  )
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault()
      handleInteractionMove(e.touches[0].clientY)
    },
    [handleInteractionMove],
  )
  const handleMouseUp = useCallback(handleInteractionEnd, [handleInteractionEnd])
  const handleTouchEnd = useCallback(handleInteractionEnd, [handleInteractionEnd])

  const getNoteColor = useCallback((note: string) => {
    if (!note) return ""
    const baseColor =
      note.includes("6") || note.includes("7")
        ? "neon-text-red"
        : note.includes("5")
          ? "neon-text-pink"
          : note.includes("4")
            ? "neon-text-blue"
            : note.includes("3")
              ? "neon-text-green"
              : note.includes("2")
                ? "neon-text-teal"
                : note === "KICK"
                  ? "neon-text-purple"
                  : note === "SNARE"
                    ? "neon-text-yellow"
                    : note === "HAT" || note === "RIDE"
                      ? "neon-text-cyan"
                      : "text-black dark:text-gray-500 light:text-black"
    return baseColor
  }, [])

  const gridDisplay = useMemo((): GridDisplayCell[][] => {
    const visibleIndices = getVisibleBeatIndices()
    const grid: GridDisplayCell[][] = ALL_NOTES.map((note) =>
      visibleIndices.map((beatIndex) => ({
        note: note,
        beat: beatIndex + 1,
        state: { active: false, isStart: false },
      })),
    )

    currentTune.pattern.forEach((event) => {
      const notesInEvent = Array.isArray(event.note) ? event.note : [event.note]
      notesInEvent.forEach((note) => {
        const rowIndex = ALL_NOTES.indexOf(note)
        if (rowIndex === -1) return
        const startBeatIndex = Math.floor(event.time)
        const endBeatIndex = Math.floor(event.time + event.duration - 0.001)
        for (let beatIndex = startBeatIndex; beatIndex <= endBeatIndex; beatIndex++) {
          if (visibleIndices.includes(beatIndex)) {
            const colIndex = visibleIndices.indexOf(beatIndex)
            grid[rowIndex][colIndex].state.active = true
            if (beatIndex === startBeatIndex) {
              grid[rowIndex][colIndex].state.isStart = true
            }
          }
        }
      })
    })
    return grid
  }, [ALL_NOTES, currentTune.pattern, getVisibleBeatIndices])

  const currentBeatDisplay = Math.floor(currentTime) + 1
  const subBeatPosition = currentTime - Math.floor(currentTime)

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="screen-orientation" content="landscape" />
        <title>Music Box - {currentTune.name}</title>
      </Head>
      <main
        ref={mainRef}
        className={`flex select-none min-h-screen flex-col items-center justify-center font-mono relative overflow-hidden ${mode === "Light" ? "light-mode" : "dark-mode"} ${isLowPowerDevice ? "low-power-mode" : ""}`}
        tabIndex={0}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`relative ${isLandscape ? "w-full max-w-[720px] h-[375px]" : "w-full max-w-[375px] aspect-[9/16]"} bg-black overflow-hidden retro-grid`}
        >
          {isLandscape ? (
            <div className="flex h-full">
              <div className="w-[120px] p-2 flex flex-col justify-between retro-panel neon-border-blue">
                <div>
                  <button
                    onClick={() => setMode((m) => (m === "Dark" ? "Light" : "Dark"))}
                    className="font-mono neon-text-green text-xs cursor-pointer mb-2"
                  >
                    {mode}
                  </button>
                  <div
                    className="text-center cursor-pointer px-1 py-1 mb-2 digital-display neon-border-pink"
                    onClick={cycleThroughTunes}
                    title="Click to change tune"
                  >
                    <span className="font-mono neon-text-pink text-[10px] leading-tight block">{currentTune.name}</span>
                  </div>
                  <button
                    className="w-full px-1 py-1 text-[10px] bg-black rounded neon-border-green font-mono mb-2"
                    onClick={() => setPatternPage((p) => (p + 1) % Math.ceil(beats.length / visibleBeats))}
                  >
                    <span className="neon-text-green">
                      PAGE {patternPage + 1}/{Math.ceil(beats.length / visibleBeats)}
                    </span>
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    className="w-full py-1 bg-black rounded flex items-center justify-center neon-border-purple"
                    onClick={() => loadTuneData(getRandomTune())}
                  >
                    <span className="font-mono neon-text-purple text-xs">RANDOM</span>
                  </button>
                  <div className="flex gap-1 mt-1">
                    <button
                      className="flex-1 py-1 bg-black rounded flex items-center justify-center neon-border-yellow"
                      onClick={saveTune}
                      title="Save"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button
                      className="flex-1 py-1 bg-black rounded flex items-center justify-center neon-border-green"
                      onClick={loadTuneFile}
                      title="Load"
                    >
                      <FolderOpen className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex-1 p-1 overflow-hidden retro-panel neon-border-green">
                <div className="h-[320px] overflow-y-auto scrollable-grid" style={{ maxHeight: "320px" }}>
                  <div className="grid grid-cols-9 gap-0 text-[9px] w-full">
                    <div className="flex justify-center items-center">
                      <span className="font-mono neon-text-blue">NOTES</span>
                    </div>
                    {getVisibleBeatIndices().map((beatIndex) => (
                      <div
                        key={`h-${beatIndex}`}
                        className={`text-center ${Math.floor(currentTime) === beatIndex ? "neon-text-pink font-bold" : "text-black dark:text-gray-600"} font-mono`}
                      >
                        {beatIndex + 1}
                      </div>
                    ))}
                    {gridDisplay.map((row, rowIndex) => (
                      <React.Fragment key={`r-${rowIndex}`}>
                        <div className={`text-right pr-1 font-mono truncate ${getNoteColor(ALL_NOTES[rowIndex])}`}>
                          {ALL_NOTES[rowIndex]}
                        </div>
                        {row.map((cell, colIndex) => {
                          const beatIndex = getVisibleBeatIndices()[colIndex]
                          return (
                            <div
                              key={`c-${rowIndex}-${beatIndex}`}
                              className={`w-full h-[14px] flex items-center justify-center ${Math.floor(currentTime) === beatIndex ? "bg-black dark:bg-black light:bg-blue-100" : ""} cursor-pointer`}
                              onClick={() => {
                                const note = ALL_NOTES[rowIndex]
                                const time = beatIndex
                                const updatedPattern = [...currentTune.pattern]
                                const existingEventIndex = updatedPattern.findIndex(
                                  (event) =>
                                    Math.floor(event.time) === time &&
                                    (event.note === note || (Array.isArray(event.note) && event.note.includes(note))),
                                )
                                if (existingEventIndex !== -1) {
                                  const event = updatedPattern[existingEventIndex]
                                  if (Array.isArray(event.note)) {
                                    const updatedNotes = event.note.filter((n) => n !== note)
                                    if (updatedNotes.length === 0) {
                                      updatedPattern.splice(existingEventIndex, 1)
                                    } else if (updatedNotes.length === 1) {
                                      event.note = updatedNotes[0]
                                    } else {
                                      event.note = updatedNotes
                                    }
                                  } else {
                                    updatedPattern.splice(existingEventIndex, 1)
                                  }
                                } else {
                                  updatedPattern.push({
                                    time: time,
                                    note: note,
                                    duration: 0.75,
                                    velocity: 1,
                                  })
                                }
                                setCurrentTune({
                                  ...currentTune,
                                  pattern: updatedPattern,
                                })
                              }}
                            >
                              {cell.state.active && (
                                <div
                                  className={`w-3 h-3 rounded-none ${
                                    cell.state.isStart
                                      ? "bg-white dark:bg-white light:bg-black"
                                      : "bg-gray-400 dark:bg-gray-400 light:bg-gray-700"
                                  } ${
                                    Math.floor(currentTime) === beatIndex
                                      ? getNoteColor(ALL_NOTES[rowIndex]).replace("text", "border") + " border"
                                      : ""
                                  }`}
                                  style={{
                                    opacity: 1,
                                    visibility: "visible",
                                    display: "block !important",
                                    zIndex: 10,
                                    position: "relative",
                                  }}
                                ></div>
                              )}
                            </div>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div
                className="w-[100px] p-2 flex flex-col justify-end items-center retro-panel neon-border-purple"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
              >
                <div
                  className={`w-16 h-16 flex items-center justify-center cursor-grab relative neon-border-purple ${isDragging ? "cursor-grabbing" : ""}`}
                >
                  <motion.div
                    className="w-full h-full flex items-center justify-center"
                    style={{ rotate: crankRotation }}
                  >
                    <div
                      className="w-6 h-12 bg-green-500"
                      style={{
                        background: "linear-gradient(to right, #00ff00, #00aa00)",
                        boxShadow: "0 0 8px rgba(0, 255, 0, 0.6)",
                        transform: "translateY(-4px)",
                      }}
                    />
                  </motion.div>
                </div>
                <div className="mt-4 text-center digital-display neon-border-green w-full">
                  <div className="flex items-center justify-center p-1">
                    <div className="font-mono neon-text-green text-lg font-bold">{currentBeatDisplay}</div>
                    <div className="w-6 h-3 bg-black border border-green-500 ml-1 relative overflow-hidden">
                      <div
                        className="h-full bg-green-500 opacity-50"
                        style={{ width: `${subBeatPosition * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="mt-2 w-full mb-2">
                  <div className="text-[8px] font-mono neon-text-purple text-center mb-0.5">MOMENTUM</div>
                  <div className="w-full h-1.5 bg-black border border-purple-500 relative overflow-hidden">
                    <div
                      className="h-full bg-purple-500 opacity-50 transition-width duration-50 ease-linear"
                      style={{ width: `${momentum}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black bg-opacity-90">
              <div className="text-center p-4">
                <span className="font-mono neon-text-pink text-lg block">Rotate device</span>
                <span className="font-mono neon-text-green text-sm block">to Landscape</span>
              </div>
            </div>
          )}
        </div>
        <style jsx global>{`
body{background-color:#000;color:#eee}
.light-mode{background-color:#fff;color:#000}
.dark-mode{background-color:#000;color:#eee}
.retro-grid{image-rendering:pixelated}
.retro-panel{border:1px solid}
.neon-border-blue{border-color:#0ff;box-shadow:0 0 2px #0ff,inset 0 0 2px #0ff}
.neon-border-pink{border-color:#f0f;box-shadow:0 0 2px #f0f,inset 0 0 2px #f0f}
.neon-border-green{border-color:#0f0;box-shadow:0 0 2px #0f0,inset 0 0 2px #0f0}
.neon-border-purple{border-color:#90f;box-shadow:0 0 2px #90f,inset 0 0 2px #90f}
.neon-border-yellow{border-color:#ff0;box-shadow:0 0 2px #ff0,inset 0 0 2px #ff0}
.neon-border-red{border-color:#f00;box-shadow:0 0 2px #f00,inset 0 0 2px #f00}
.neon-border-cyan{border-color:#0ff;box-shadow:0 0 2px #0ff,inset 0 0 2px #0ff}
.neon-border-teal{border-color:#0f9;box-shadow:0 0 2px #0f9,inset 0 0 2px #0f9}
.neon-text-blue{color:#0ff;text-shadow:0 0 3px #0ff}
.neon-text-pink{color:#f0f;text-shadow:0 0 3px #f0f}
.neon-text-green{color:#0f0;text-shadow:0 0 3px #0f0}
.neon-text-purple{color:#90f;text-shadow:0 0 3px #90f}
.neon-text-yellow{color:#ff0;text-shadow:0 0 3px #ff0}
.neon-text-red{color:#f00;text-shadow:0 0 3px #f00}
.neon-text-cyan{color:#0ff;text-shadow:0 0 3px #0ff}
.neon-text-teal{color:#0f9;text-shadow:0 0 3px #0f9}
.digital-display{background-color:rgba(0,0,0,0.7);padding:2px 4px}
input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:5px;background:#333;outline:none;opacity:0.7;transition:opacity .2s;border:1px solid #555}
input[type=range]:hover{opacity:1}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:10px;height:10px;background:#0f0;border:1px solid #000;cursor:pointer}
input[type=range]::-moz-range-thumb{width:10px;height:10px;background:#0f0;border:1px solid #000;cursor:pointer;border-radius:0}
select{appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url('data:image/svg+xml;utf8,<svg fill="%230f0" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/><path d="M0 0h24v24H0z" fill="none"/></svg>');background-repeat:no-repeat;background-position:right 2px center;background-size:12px;padding-right:15px;border-radius:0}
.low-power-mode{animation:none!important;transition:none!important}
.low-power-mode *{animation:none!important;transition:none!important}
.cursor-grab{cursor:grab}
.cursor-grabbing{cursor:grabbing}
.light-mode .neon-text-blue{color:#0066ff;text-shadow:none;font-weight:bold}
.light-mode .neon-text-pink{color:#cc0066;text-shadow:none;font-weight:bold}
.light-mode .neon-text-green{color:#006600;text-shadow:none;font-weight:bold}
.light-mode .neon-text-purple{color:#6600cc;text-shadow:none;font-weight:bold}
.light-mode .neon-text-yellow{color:#cc6600;text-shadow:none;font-weight:bold}
.light-mode .neon-text-red{color:#cc0000;text-shadow:none;font-weight:bold}
.light-mode .neon-text-cyan{color:#0088cc;text-shadow:none;font-weight:bold}
.light-mode .neon-text-teal{color:#008866;text-shadow:none;font-weight:bold}
.light-mode .neon-border-blue{border-color:#0066ff;box-shadow:none}
.light-mode .neon-border-pink{border-color:#cc0066;box-shadow:none}
.light-mode .neon-border-green{border-color:#006600;box-shadow:none}
.light-mode .neon-border-purple{border-color:#6600cc;box-shadow:none}
.light-mode .neon-border-yellow{border-color:#cc6600;box-shadow:none}
.light-mode .neon-border-red{border-color:#cc0000;box-shadow:none}
.light-mode .neon-border-cyan{border-color:#0088cc;box-shadow:none}
.light-mode .neon-border-teal{border-color:#008866;box-shadow:none}
.light-mode .bg-black,.light-mode [class*="bg-black"],.light-mode [style*="background-color: black"],.light-mode [style*="background-color: #000"],.light-mode [style*="background-color: rgb(0, 0, 0)"],.light-mode [style*="background-color: rgba(0, 0, 0"]{background-color:#ffffff!important}
.light-mode .digital-display{background-color:#f0f0f0!important;border:1px solid #006600}
.light-mode button{background-color:#f0f0f0!important}
.light-mode select{background-color:#f0f0f0!important;color:#000000}
.light-mode input[type=range]{background:#dddddd;border:1px solid #006600}
.light-mode input[type=range]::-webkit-slider-thumb{background:#006600;border:1px solid #000000}
.light-mode .retro-panel{background-color:#f0f0f0!important;border:1px solid}
.light-mode .text-gray-600{color:#000000!important}
.dark-mode, .dark-mode *, html.dark, html.dark *, body.dark-mode, .dark-mode .retro-panel, .dark-mode .digital-display, .dark-mode .retro-grid, .dark-mode .bg-gray-900, .dark-mode [class*="bg-gray"], .dark-mode button, .dark-mode select, .dark-mode input, .dark-mode .settings-overlay, .dark-mode div, .dark-mode main, .dark-mode section {background-color: #000 !important;}
.dark-mode .w-1\.5.h-1\.5.bg-white, .dark-mode .w-1\.5.h-1\.5.bg-gray-500, .dark-mode .w-2.h-2.bg-white, .dark-mode .w-2.h-2.bg-gray-400, .dark-mode .w-3.h-3.bg-white, .dark-mode .w-3.h-3.bg-gray-400, .light-mode .w-1\.5.h-1\.5.bg-black, .light-mode .w-1\.5.h-1\.5.bg-gray-700, .light-mode .w-2.h-2.bg-black, .light-mode .w-2.h-2.bg-gray-700, .light-mode .w-3.h-3.bg-black, .light-mode .w-3.h-3.bg-gray-700, .bg-white, .bg-gray-400, .bg-black, .bg-gray-700, [class*="bg-white"], [class*="bg-gray-400"], [class*="bg-black"], [class*="bg-gray-700"] {opacity: 1 !important; visibility: visible !important; display: block !important; z-index: 10 !important; position: relative !important;}
.grid-cols-9 > div > div {min-width: 8px !important; min-height: 8px !important; opacity: 1 !important; visibility: visible !important; display: block !important; z-index: 10 !important; position: relative !important;}
.dark-mode .bg-white, .dark-mode .bg-gray-400, .light-mode .bg-black, .light-mode .bg-gray-700 {opacity: 1 !important; visibility: visible !important; display: block !important; z-index: 10 !important; position: relative !important;}
.retro-grid {background-image: linear-gradient(rgba(100, 100, 100, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 100, 100, 0.5) 1px, transparent 1px) !important;}
.bg-gray-900.dark\:bg-gray-900 {background-color: #222 !important;}
.grid-cols-9 > div {background-color: transparent !important;}
.grid-cols-9 > div > div {display: block !important; visibility: visible !important; opacity: 1 !important; z-index: 100 !important;}
.dark-mode .grid-cols-9 > div > div {background-color: cyan !important; border: 1px solid white !important;}
.light-mode .grid-cols-9 > div > div {background-color: blue !important; border: 1px solid black !important;}
* {overflow: visible !important;}
.grid-cols-9 > div {overflow: visible !important; position: relative !important;}
.scrollable-grid {scrollbar-width: thin; scrollbar-color: var(--neon-purple) #000;}
.scrollable-grid::-webkit-scrollbar {width: 8px;}
.scrollable-grid::-webkit-scrollbar-track {background: #000; border: 1px solid #333;}
.scrollable-grid::-webkit-scrollbar-thumb {background: var(--neon-purple); border-radius: 0;}
.light-mode .scrollable-grid::-webkit-scrollbar-track {background: #f0f0f0; border: 1px solid #ddd;}
.light-mode .scrollable-grid::-webkit-scrollbar-thumb {background: #6600cc;}
.scrollable-grid {max-height: 320px !important; overflow-y: auto !important; overflow-x: hidden !important;}
.grid-cols-9 {width: 100% !important; min-width: 0 !important; max-width: 100% !important;}
.scrollable-grid {overflow: auto !important;}
.grid-cols-9 > div {min-width: 0 !important; max-width: 100% !important; width: auto !important;}
`}</style>
      </main>
    </>
  )
}

