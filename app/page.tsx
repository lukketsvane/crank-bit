"use client"
import React, { useCallback, useEffect, useRef, useState, useMemo } from "react"
import { motion } from "framer-motion"
import Head from "next/head"
import { Save, FolderOpen, Pencil, Trash2 } from "lucide-react"
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
  const [selectedNote, setSelectedNote] = useState<{note: NotePitch, time: number} | null>(null)
  const [selectedNoteSynth, setSelectedNoteSynth] = useState<SynthType>("Piano")

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
    (note: NotePitch, duration: number, velocity = 1, noteSynthType?: SynthType) => {
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
      const sources: { osc: OscillatorNode; gain: GainNode; source?: AudioBufferSourceNode }[] = []

      const masterGain = ctx.createGain()
      
      const lowCompressor = ctx.createDynamicsCompressor()
      lowCompressor.threshold.value = -24
      lowCompressor.knee.value = 12     
      lowCompressor.ratio.value = 3     
      lowCompressor.attack.value = 0.01 
      lowCompressor.release.value = 0.1 
      
      const highCompressor = ctx.createDynamicsCompressor()
      highCompressor.threshold.value = -28  
      highCompressor.knee.value = 10
      highCompressor.ratio.value = 4
      highCompressor.attack.value = 0.003   
      highCompressor.release.value = 0.05
      
      const lowPass = ctx.createBiquadFilter()
      lowPass.type = "lowpass"
      lowPass.frequency.value = 14000   
      lowPass.Q.value = 0.5             
      
      const lowShelf = ctx.createBiquadFilter()
      lowShelf.type = "lowshelf"
      lowShelf.frequency.value = 200    
      lowShelf.gain.value = 2           
      
      const highMidFilter = ctx.createBiquadFilter()
      highMidFilter.type = "peaking"
      highMidFilter.frequency.value = 3200  
      highMidFilter.gain.value = -3         
      highMidFilter.Q.value = 1.5           
      
      const lowMidFilter = ctx.createBiquadFilter()
      lowMidFilter.type = "peaking"
      lowMidFilter.frequency.value = 800    
      lowMidFilter.gain.value = 1           
      lowMidFilter.Q.value = 1.2
      
      const presenceFilter = ctx.createBiquadFilter()
      presenceFilter.type = "peaking"
      presenceFilter.frequency.value = 5500 
      presenceFilter.gain.value = 1.5       
      presenceFilter.Q.value = 1
      
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -1.5    
      limiter.knee.value = 0
      limiter.ratio.value = 20          
      limiter.attack.value = 0.001      
      limiter.release.value = 0.01      
      
      const convolver = ctx.createConvolver()
      try {
        const impulseLength = 1.8  
        const sampleRate = ctx.sampleRate
        const impulse = ctx.createBuffer(2, sampleRate * impulseLength, sampleRate)
        
        const preDelay = 0.02 
        const preDelaySamples = Math.floor(sampleRate * preDelay)

        for (let channel = 0; channel < 2; channel++) {
          const impulseData = impulse.getChannelData(channel)
          
          for (let i = 0; i < impulseData.length; i++) {
            impulseData[i] = 0
          }
          
          for (let i = preDelaySamples; i < impulseData.length; i++) {
            const progress = (i - preDelaySamples) / (impulseData.length - preDelaySamples)
            
            const stereoPhase = channel === 0 ? 0 : 0.3
            const noise = Math.random() * 2 - 1
            
            if (progress < 0.1) {
              impulseData[i] = noise * Math.pow(1 - progress / 0.1, 0.6) * 0.7
            } else if (progress < 0.3) {
              impulseData[i] = noise * 0.5 * Math.pow(1 - (progress - 0.1) / 0.2, 0.8)
            } else {
              impulseData[i] = noise * 0.3 * Math.pow(1 - (progress - 0.3) / 0.7, 1.8) * 
                               (1 + 0.1 * Math.sin(progress * 20 + stereoPhase))
            }
          }
        }

        convolver.buffer = impulse
        
        const reverbGain = ctx.createGain()
        reverbGain.gain.value = 0.15  
        
        const dryGain = ctx.createGain()
        dryGain.gain.value = 0.85     
        
        const reverbHighPass = ctx.createBiquadFilter()
        reverbHighPass.type = "highpass"
        reverbHighPass.frequency.value = 300  
        
        masterGain.connect(lowShelf)
        lowShelf.connect(lowMidFilter)
        lowMidFilter.connect(highMidFilter)
        highMidFilter.connect(presenceFilter)
        presenceFilter.connect(lowPass)
        
        const bandSplitter = ctx.createGain()
        lowPass.connect(bandSplitter)
        
        bandSplitter.connect(lowCompressor)
        lowCompressor.connect(limiter)
        
        bandSplitter.connect(highCompressor)
        highCompressor.connect(limiter)
        
        limiter.connect(ctx.destination)
        
        lowPass.connect(dryGain)       
        dryGain.connect(limiter)       
        
        lowPass.connect(reverbGain)    
        reverbGain.connect(reverbHighPass)
        reverbHighPass.connect(convolver)
        convolver.connect(limiter)     
      } catch (e) {
        console.warn("Couldn't create full effects chain", e)
        masterGain.connect(lowShelf)
        lowShelf.connect(highMidFilter)
        highMidFilter.connect(lowCompressor)
        lowCompressor.connect(limiter)
        limiter.connect(ctx.destination)
      }

      if (["KICK", "SNARE", "HAT", "RIDE"].includes(note)) {
        if (note === "KICK") {
          
          const kickEQ = ctx.createBiquadFilter();
          kickEQ.type = "lowshelf";
          kickEQ.frequency.value = 100;
          kickEQ.gain.value = 3; 
          
          const kickComp = ctx.createDynamicsCompressor();
          kickComp.threshold.value = -12;
          kickComp.knee.value = 6;
          kickComp.ratio.value = 4;
          kickComp.attack.value = 0.005;
          kickComp.release.value = 0.05;
          
          const subOsc = ctx.createOscillator();
          const subGain = ctx.createGain();
          subOsc.type = "sine";
          subOsc.frequency.setValueAtTime(55, now); 
          subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.4); 
          
          subGain.gain.setValueAtTime(0, now);
          subGain.gain.linearRampToValueAtTime(0.7 * velocity, now + 0.008); 
          subGain.gain.exponentialRampToValueAtTime(0.2 * velocity, now + 0.1); 
          subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5); 
          
          subOsc.connect(subGain);
          subGain.connect(kickEQ);
          subOsc.start(now);
          subOsc.stop(now + 0.5);
          sources.push({ osc: subOsc, gain: subGain });
          
          const bodyOsc = ctx.createOscillator();
          const bodyGain = ctx.createGain();
          const bodyShaperA = ctx.createWaveShaper();
          const bodyShaperB = ctx.createWaveShaper();
          
          const makeDistortionCurve = (amount) => {
            const k = typeof amount === 'number' ? amount : 5;
            const n_samples = 2048;
            const curve = new Float32Array(n_samples);
            for (let i = 0; i < n_samples; ++i) {
              const x = i * 2 / n_samples - 1;
              curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
            }
            return curve;
          };
          
          bodyShaperA.curve = makeDistortionCurve(2); 
          bodyShaperB.curve = makeDistortionCurve(5); 
          
          bodyOsc.type = "sine";
          bodyOsc.frequency.setValueAtTime(80, now);
          bodyOsc.frequency.exponentialRampToValueAtTime(55, now + 0.15);
          
          bodyGain.gain.setValueAtTime(0, now);
          bodyGain.gain.linearRampToValueAtTime(0.8 * velocity, now + 0.005);
          bodyGain.gain.exponentialRampToValueAtTime(0.1 * velocity, now + 0.2);
          bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          
          const dryBodyGain = ctx.createGain();
          dryBodyGain.gain.value = 0.7;
          
          const wetBodyGainA = ctx.createGain();
          wetBodyGainA.gain.value = 0.2;
          
          const wetBodyGainB = ctx.createGain();
          wetBodyGainB.gain.value = 0.1;
          
          bodyOsc.connect(dryBodyGain);
          bodyOsc.connect(wetBodyGainA);
          bodyOsc.connect(wetBodyGainB);
          
          dryBodyGain.connect(bodyGain);
          
          wetBodyGainA.connect(bodyShaperA);
          bodyShaperA.connect(bodyGain);
          
          wetBodyGainB.connect(bodyShaperB);
          bodyShaperB.connect(bodyGain);
          
          bodyGain.connect(kickEQ);
          bodyOsc.start(now);
          bodyOsc.stop(now + 0.4);
          sources.push({ osc: bodyOsc, gain: bodyGain });
          
          const clickOsc = ctx.createOscillator();
          const clickGain = ctx.createGain();
          const clickFilter = ctx.createBiquadFilter();
          
          clickFilter.type = "bandpass";
          clickFilter.frequency.value = 4000;
          clickFilter.Q.value = 1.5;
          
          clickOsc.type = "triangle";
          clickOsc.frequency.setValueAtTime(180, now);
          clickOsc.frequency.exponentialRampToValueAtTime(60, now + 0.03);
          
          clickGain.gain.setValueAtTime(0, now);
          clickGain.gain.linearRampToValueAtTime(0.6 * velocity, now + 0.001);
          clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
          
          clickOsc.connect(clickGain);
          clickGain.connect(clickFilter);
          clickFilter.connect(kickEQ);
          clickOsc.start(now);
          clickOsc.stop(now + 0.07);
          sources.push({ osc: clickOsc, gain: clickGain });
          
          kickEQ.connect(kickComp);
          kickComp.connect(masterGain);
          
        } else if (note === "SNARE") {
          
          const snareBandpass = ctx.createBiquadFilter();
          snareBandpass.type = "bandpass";
          snareBandpass.frequency.value = 800;
          snareBandpass.Q.value = 1;
          
          const snareHighpass = ctx.createBiquadFilter();
          snareHighpass.type = "highpass";
          snareHighpass.frequency.value = 700;
          
          const shapedNoiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
          const noiseData = shapedNoiseBuffer.getChannelData(0);
          
          for (let i = 0; i < noiseData.length; i++) {
            const progress = i / noiseData.length;
            const noise = Math.random() * 2 - 1;
            
            if (progress < 0.05) {
              noiseData[i] = noise * (progress / 0.05) * 0.9;
            } else {
              noiseData[i] = noise * Math.pow(1 - (progress - 0.05) / 0.95, 1.5) * 0.9;
            }
          }
          
          const noiseSource = ctx.createBufferSource();
          const noiseGain = ctx.createGain();
          noiseSource.buffer = shapedNoiseBuffer;
          
          noiseGain.gain.setValueAtTime(0.3 * velocity, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          
          noiseSource.connect(snareBandpass);
          snareBandpass.connect(noiseGain);
          noiseGain.connect(masterGain);
          noiseSource.start(now);
          sources.push({ gain: noiseGain, osc: ctx.createOscillator(), source: noiseSource });
          
          
          const toneOsc1 = ctx.createOscillator();
          const toneGain1 = ctx.createGain();
          toneOsc1.type = "triangle";
          toneOsc1.frequency.value = 220;
          
          toneGain1.gain.setValueAtTime(0, now);
          toneGain1.gain.linearRampToValueAtTime(0.5 * velocity, now + 0.003);
          toneGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          
          toneOsc1.connect(toneGain1);
          toneGain1.connect(snareHighpass);
          snareHighpass.connect(masterGain);
          toneOsc1.start(now);
          toneOsc1.stop(now + 0.12);
          sources.push({ osc: toneOsc1, gain: toneGain1 });
          
          const toneOsc2 = ctx.createOscillator();
          const toneGain2 = ctx.createGain();
          toneOsc2.type = "sine";
          toneOsc2.frequency.value = 140;
          
          toneGain2.gain.setValueAtTime(0, now);
          toneGain2.gain.linearRampToValueAtTime(0.4 * velocity, now + 0.005);
          toneGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
          
          toneOsc2.connect(toneGain2);
          toneGain2.connect(masterGain);
          toneOsc2.start(now);
          toneOsc2.stop(now + 0.08);
          sources.push({ osc: toneOsc2, gain: toneGain2 });
          
        } else if (note === "HAT") {
          
          const hatHighpass = ctx.createBiquadFilter();
          hatHighpass.type = "highpass";
          hatHighpass.frequency.value = 7000;
          hatHighpass.Q.value = 0.8;
          
          const hatPeakFilter = ctx.createBiquadFilter();
          hatPeakFilter.type = "peaking";
          hatPeakFilter.frequency.value = 10000;
          hatPeakFilter.gain.value = 5;
          hatPeakFilter.Q.value = 2;
          
          const hatBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate);
          const hatData = hatBuffer.getChannelData(0);
          
          for (let i = 0; i < hatData.length; i++) {
            const progress = i / hatData.length;
            const metallic = 
              Math.sin(progress * 80) * 0.3 + 
              Math.sin(progress * 200) * 0.2 + 
              Math.sin(progress * 500) * 0.1 + 
              Math.random() * 0.4;
              
            if (progress < 0.02) {
              hatData[i] = metallic * (progress / 0.02);
            } else {
              const decayFactor = progress < 0.1 ? 
                Math.pow(1 - (progress - 0.02) / 0.08, 1.2) : 
                Math.pow(1 - (progress - 0.1) / 0.9, 3) * 0.4;
              
              hatData[i] = metallic * decayFactor;
            }
          }
          
          const hatSource = ctx.createBufferSource();
          const hatGain = ctx.createGain();
          hatSource.buffer = hatBuffer;
          
          hatGain.gain.setValueAtTime(0.2 * velocity, now);
          hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          
          hatSource.connect(hatHighpass);
          hatHighpass.connect(hatPeakFilter);
          hatPeakFilter.connect(hatGain);
          hatGain.connect(masterGain);
          hatSource.start(now);
          sources.push({ gain: hatGain, osc: ctx.createOscillator(), source: hatSource });
          
        } else if (note === "RIDE") {
          
          const rideHighpass = ctx.createBiquadFilter();
          rideHighpass.type = "highpass";
          rideHighpass.frequency.value = 3000;
          
          const ridePeak1 = ctx.createBiquadFilter();
          ridePeak1.type = "peaking";
          ridePeak1.frequency.value = 4500;
          ridePeak1.gain.value = 6;
          ridePeak1.Q.value = 2.5;
          
          const ridePeak2 = ctx.createBiquadFilter();
          ridePeak2.type = "peaking";
          ridePeak2.frequency.value = 8000;
          ridePeak2.gain.value = 4;
          ridePeak2.Q.value = 1.5;
          
          const rideBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
          const rideData = rideBuffer.getChannelData(0);
          
          for (let i = 0; i < rideData.length; i++) {
            const progress = i / rideData.length;
            
            const bell = 
              Math.sin(progress * 120) * 0.2 + 
              Math.sin(progress * 250) * 0.15 + 
              Math.sin(progress * 510) * 0.1 +
              Math.sin(progress * 1200) * 0.05 +
              Math.random() * 0.5;
            
            if (progress < 0.01) {
              rideData[i] = bell * (progress / 0.01);
            } else if (progress < 0.05) {
              rideData[i] = bell * Math.pow(1 - (progress - 0.01) / 0.04, 0.8);
            } else {
              rideData[i] = bell * 0.5 * Math.pow(1 - (progress - 0.05) / 0.95, 2);
            }
          }
          
          const rideSource = ctx.createBufferSource();
          const rideGain = ctx.createGain();
          rideSource.buffer = rideBuffer;
          
          rideGain.gain.setValueAtTime(0.3 * velocity, now);
          rideGain.gain.exponentialRampToValueAtTime(0.15 * velocity, now + 0.1);
          rideGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          
          rideSource.connect(rideHighpass);
          rideHighpass.connect(ridePeak1);
          ridePeak1.connect(ridePeak2);
          ridePeak2.connect(rideGain);
          rideGain.connect(masterGain);
          rideSource.start(now);
          sources.push({ gain: rideGain, osc: ctx.createOscillator(), source: rideSource });
          
          const bellOsc = ctx.createOscillator();
          const bellGain = ctx.createGain();
          bellOsc.type = "sine";
          bellOsc.frequency.value = 1800;
          
          bellGain.gain.setValueAtTime(0, now);
          bellGain.gain.linearRampToValueAtTime(0.15 * velocity, now + 0.002);
          bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          
          bellOsc.connect(bellGain);
          bellGain.connect(masterGain);
          bellOsc.start(now);
          bellOsc.stop(now + 0.3);
          sources.push({ osc: bellOsc, gain: bellGain });
        }

        const sourceId = `${note}-${now}`
        activeSourcesRef.current[sourceId] = sources
        return
      }

      const freq = getFrequency(note, transpose)
      if (!freq) return

      const effectiveSynthType = noteSynthType || synthType
      
      
      if (effectiveSynthType === "Piano") {
        
        const pianoLowMid = ctx.createBiquadFilter();
        pianoLowMid.type = "peaking";
        pianoLowMid.frequency.value = 250;
        pianoLowMid.gain.value = 2;
        pianoLowMid.Q.value = 1;
        
        const pianoPresence = ctx.createBiquadFilter();
        pianoPresence.type = "peaking";
        pianoPresence.frequency.value = 5000;
        pianoPresence.gain.value = 3;
        pianoPresence.Q.value = 0.8;
        
        const pianoComp = ctx.createDynamicsCompressor();
        pianoComp.threshold.value = -20;
        pianoComp.knee.value = 10;
        pianoComp.ratio.value = 3;
        pianoComp.attack.value = 0.003;
        pianoComp.release.value = 0.1;
        
        pianoLowMid.connect(pianoPresence);
        pianoPresence.connect(pianoComp);
        pianoComp.connect(masterGain);
        
        const fundamentalOsc = ctx.createOscillator();
        const fundamentalGain = ctx.createGain();
        fundamentalOsc.type = "triangle";
        fundamentalOsc.frequency.value = freq;

        fundamentalGain.gain.setValueAtTime(0, now);
        fundamentalGain.gain.linearRampToValueAtTime(0.7 * velocity, now + 0.002); 
        fundamentalGain.gain.exponentialRampToValueAtTime(0.4 * velocity, now + 0.06); 
        fundamentalGain.gain.setTargetAtTime(0.25 * velocity, now + 0.06, 0.2); 
        fundamentalGain.gain.setTargetAtTime(0, stopTime - 0.05, 0.1); 
        
        fundamentalOsc.frequency.setValueAtTime(freq * 1.003, now); 
        fundamentalOsc.frequency.exponentialRampToValueAtTime(freq, now + 0.01); 

        fundamentalOsc.connect(fundamentalGain);
        fundamentalGain.connect(pianoLowMid);
        fundamentalOsc.start(now);
        fundamentalOsc.stop(stopTime + 0.3); 
        sources.push({ osc: fundamentalOsc, gain: fundamentalGain });

        const harmonics = [
          { ratio: 2, gain: 0.26, decay: 0.4 },    
          { ratio: 3, gain: 0.16, decay: 0.35 },   
          { ratio: 4, gain: 0.12, decay: 0.3 },    
          { ratio: 5, gain: 0.09, decay: 0.25 },   
          { ratio: 6, gain: 0.07, decay: 0.25 },   
          { ratio: 7, gain: 0.05, decay: 0.2 }     
        ];

        harmonics.forEach(harmonic => {
          const harmonicOsc = ctx.createOscillator();
          const harmonicGain = ctx.createGain();
          harmonicOsc.type = "sine";
          harmonicOsc.frequency.value = freq * harmonic.ratio;
          
          harmonicGain.gain.setValueAtTime(0, now);
          harmonicGain.gain.linearRampToValueAtTime(harmonic.gain * velocity, now + 0.002);
          harmonicGain.gain.exponentialRampToValueAtTime(harmonic.gain * 0.5 * velocity, now + 0.05);
          harmonicGain.gain.setTargetAtTime(harmonic.gain * 0.2 * velocity, now + 0.05, harmonic.decay);
          harmonicGain.gain.setTargetAtTime(0, stopTime - 0.05, 0.08);
          
          harmonicOsc.connect(harmonicGain);
          harmonicGain.connect(pianoLowMid);
          harmonicOsc.start(now);
          harmonicOsc.stop(stopTime + 0.3);
          sources.push({ osc: harmonicOsc, gain: harmonicGain });
        });
        
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < noiseData.length; i++) {
          const progress = i / noiseData.length;
          noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 4);
        }
        
        const noiseSource = ctx.createBufferSource();
        const noiseGain = ctx.createGain();
        const noiseFilter = ctx.createBiquadFilter();
        
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.value = freq * 2; 
        noiseFilter.Q.value = 0.5;
        
        noiseSource.buffer = noiseBuffer;
        noiseGain.gain.value = 0.08 * velocity;
        
        noiseSource.connect(noiseGain);
        noiseGain.connect(noiseFilter);
        noiseFilter.connect(pianoLowMid);
        noiseSource.start(now);
        sources.push({ gain: noiseGain, osc: ctx.createOscillator(), source: noiseSource });
        
        if (freq > 110) { 
          const resonanceOsc = ctx.createOscillator();
          const resonanceGain = ctx.createGain();
          resonanceOsc.type = "sine";
          resonanceOsc.frequency.value = freq * 0.99; 
          
          resonanceGain.gain.setValueAtTime(0, now);
          resonanceGain.gain.linearRampToValueAtTime(0.04 * velocity, now + 0.1);
          resonanceGain.gain.setTargetAtTime(0, stopTime, 0.5); 
          
          resonanceOsc.connect(resonanceGain);
          resonanceGain.connect(pianoLowMid);
          resonanceOsc.start(now);
          resonanceOsc.stop(stopTime + 0.6);
          sources.push({ osc: resonanceOsc, gain: resonanceGain });
        }
        
      } else if (effectiveSynthType === "Music Box") {
        
        const musicBoxHighMid = ctx.createBiquadFilter();
        musicBoxHighMid.type = "peaking";
        musicBoxHighMid.frequency.value = 3000;
        musicBoxHighMid.gain.value = 4;
        musicBoxHighMid.Q.value = 2;
        
        const musicBoxHighPass = ctx.createBiquadFilter();
        musicBoxHighPass.type = "highpass";
        musicBoxHighPass.frequency.value = 300;
        
        const musicBoxLowPass = ctx.createBiquadFilter();
        musicBoxLowPass.type = "lowpass";
        musicBoxLowPass.frequency.value = 8000;
        
        musicBoxHighPass.connect(musicBoxHighMid);
        musicBoxHighMid.connect(musicBoxLowPass);
        musicBoxLowPass.connect(masterGain);
        
        const mainOsc = ctx.createOscillator();
        const mainGain = ctx.createGain();
        
        mainOsc.type = "sine";
        mainOsc.frequency.value = freq;

        mainGain.gain.setValueAtTime(0, now);
        mainGain.gain.linearRampToValueAtTime(0.8 * velocity, now + 0.001); 
        mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 2); 
        
        mainOsc.frequency.setValueAtTime(freq * 1.002, now);
        mainOsc.frequency.exponentialRampToValueAtTime(freq, now + 0.01);

        mainOsc.connect(mainGain);
        mainGain.connect(musicBoxHighPass);
        mainOsc.start(now);
        mainOsc.stop(now + duration * 3);
        sources.push({ osc: mainOsc, gain: mainGain });

        const overtones = [
          { ratio: 3, gain: 0.4, decay: 1.0 },     
          { ratio: 3.97, gain: 0.3, decay: 0.9 },  
          { ratio: 6.23, gain: 0.15, decay: 0.8 }, 
          { ratio: 8.46, gain: 0.1, decay: 0.7 },  
          { ratio: 12.1, gain: 0.05, decay: 0.6 }  
        ];

        overtones.forEach(overtone => {
          const overtoneOsc = ctx.createOscillator();
          const overtoneGain = ctx.createGain();
          
          overtoneOsc.type = "sine";
          overtoneOsc.frequency.value = freq * overtone.ratio;
          
          overtoneGain.gain.setValueAtTime(0, now);
          overtoneGain.gain.linearRampToValueAtTime(overtone.gain * velocity, now + 0.001);
          overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + duration * overtone.decay);

          overtoneOsc.connect(overtoneGain);
          overtoneGain.connect(musicBoxHighPass);
          overtoneOsc.start(now);
          overtoneOsc.stop(now + duration * (overtone.decay + 1));
          sources.push({ osc: overtoneOsc, gain: overtoneGain });
        });
        
        const tineNoiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
        const tineData = tineNoiseBuffer.getChannelData(0);
        
        for (let i = 0; i < tineData.length; i++) {
          const progress = i / tineData.length;
          tineData[i] = (Math.random() * 2 - 1) * Math.pow(1 - progress, 10);
        }
        
        const tineSource = ctx.createBufferSource();
        const tineGain = ctx.createGain();
        const tineFilter = ctx.createBiquadFilter();
        
        tineFilter.type = "bandpass";
        tineFilter.frequency.value = 5000; 
        tineFilter.Q.value = 0.7;
        
        tineSource.buffer = tineNoiseBuffer;
        tineGain.gain.value = 0.07 * velocity;
        
        tineSource.connect(tineGain);
        tineGain.connect(tineFilter);
        tineFilter.connect(musicBoxHighPass);
        tineSource.start(now);
        sources.push({ gain: tineGain, osc: ctx.createOscillator(), source: tineSource });
        
      } else if (effectiveSynthType === "Sine" || effectiveSynthType === "Triangle") {
        
        const synthWarmth = ctx.createBiquadFilter();
        synthWarmth.type = "lowshelf";
        synthWarmth.frequency.value = 300;
        synthWarmth.gain.value = 2;
        
        const synthPresence = ctx.createBiquadFilter();
        synthPresence.type = "peaking";
        synthPresence.frequency.value = 2000;
        synthPresence.gain.value = 1;
        synthPresence.Q.value = 1;
        
        const warmthShaper = ctx.createWaveShaper();
        const makeTubeCurve = () => {
          const n_samples = 2048;
          const curve = new Float32Array(n_samples);
          for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = Math.sign(x) * (1 - Math.exp(-Math.abs(x) * 3));
          }
          return curve;
        };
        warmthShaper.curve = makeTubeCurve();
        
        synthWarmth.connect(synthPresence);
        
        const dryGain = ctx.createGain();
        dryGain.gain.value = 0.8;
        synthPresence.connect(dryGain);
        dryGain.connect(masterGain);
        
        const saturationGain = ctx.createGain();
        saturationGain.gain.value = 0.2; 
        synthPresence.connect(saturationGain);
        saturationGain.connect(warmthShaper);
        warmthShaper.connect(masterGain);
        
        const mainOsc = ctx.createOscillator();
        const mainGain = ctx.createGain();
        
        mainOsc.type = effectiveSynthType.toLowerCase() as OscillatorType;
        mainOsc.frequency.value = freq;
        
        mainGain.gain.setValueAtTime(0, now);
        mainGain.gain.linearRampToValueAtTime(0.65 * velocity, now + 0.02); 
        mainGain.gain.exponentialRampToValueAtTime(0.45 * velocity, now + 0.1); 
        mainGain.gain.setTargetAtTime(0.4 * velocity, now + 0.1, 0.4); 
        mainGain.gain.setTargetAtTime(0, stopTime - 0.05, 0.15); 
        
        if (duration > 0.5) {
          const vibratoDepth = 0.2; 
          const vibratoRate = 5; 
          for (let t = 0.2; t < duration; t += 0.05) {
            const vibratoTime = now + t;
            const pitchMod = freq * (1 + Math.sin(t * vibratoRate) * vibratoDepth * 0.001);
            mainOsc.frequency.setValueAtTime(pitchMod, vibratoTime);
          }
        }
        
        mainOsc.connect(mainGain);
        mainGain.connect(synthWarmth);
        mainOsc.start(now);
        mainOsc.stop(stopTime + 0.2);
        sources.push({ osc: mainOsc, gain: mainGain });
        
        const detunes = [
          { ratio: 0.996, gain: 0.25 },  
          { ratio: 1.004, gain: 0.25 }   
        ];
        
        detunes.forEach(detune => {
          const detuneOsc = ctx.createOscillator();
          const detuneGain = ctx.createGain();
          
          detuneOsc.type = mainOsc.type;
          detuneOsc.frequency.value = freq * detune.ratio;
          
          detuneGain.gain.setValueAtTime(0, now);
          detuneGain.gain.linearRampToValueAtTime(detune.gain * velocity, now + 0.02 + Math.random() * 0.01);
          detuneGain.gain.exponentialRampToValueAtTime(detune.gain * 0.7 * velocity, now + 0.12);
          detuneGain.gain.setTargetAtTime(detune.gain * 0.6 * velocity, now + 0.12, 0.4);
          detuneGain.gain.setTargetAtTime(0, stopTime - 0.05, 0.15);
          
          detuneOsc.connect(detuneGain);
          detuneGain.connect(synthWarmth);
          detuneOsc.start(now);
          detuneOsc.stop(stopTime + 0.2);
          sources.push({ osc: detuneOsc, gain: detuneGain });
        });
        
        if (freq < 220) {
          const subOsc = ctx.createOscillator();
          const subGain = ctx.createGain();
          
          subOsc.type = "sine"; 
          subOsc.frequency.value = freq / 2; 
          
          subGain.gain.setValueAtTime(0, now);
          subGain.gain.linearRampToValueAtTime(0.4 * velocity, now + 0.03);
          subGain.gain.exponentialRampToValueAtTime(0.3 * velocity, now + 0.15);
          subGain.gain.setTargetAtTime(0.25 * velocity, now + 0.15, 0.3);
          subGain.gain.setTargetAtTime(0, stopTime - 0.1, 0.2);
          
          subOsc.connect(subGain);
          subGain.connect(masterGain); 
          subOsc.start(now);
          subOsc.stop(stopTime + 0.3);
          sources.push({ osc: subOsc, gain: subGain });
        }
        
      } else if (effectiveSynthType === "Square" || effectiveSynthType === "Saw") {
        
        const synthFilter = ctx.createBiquadFilter();
        synthFilter.type = "lowpass";
        synthFilter.frequency.value = Math.min(12000, freq * 20); 
        synthFilter.Q.value = 1;
        
        const filterEnvAmount = 2000 + (freq * 0.5);
        synthFilter.frequency.setValueAtTime(Math.min(800, freq * 3), now);
        synthFilter.frequency.linearRampToValueAtTime(
          Math.min(18000, freq * 20), 
          now + 0.04
        ); 
        synthFilter.frequency.exponentialRampToValueAtTime(
          Math.min(8000, freq * 10), 
          now + 0.2
        ); 
        
        const synthComp = ctx.createDynamicsCompressor();
        synthComp.threshold.value = -18;
        synthComp.knee.value = 10;
        synthComp.ratio.value = 4;
        synthComp.attack.value = 0.001;
        synthComp.release.value = 0.05;
        
        synthFilter.connect(synthComp);
        synthComp.connect(masterGain);
        
        const mainOsc = ctx.createOscillator();
        const mainGain = ctx.createGain();
        
        mainOsc.type = effectiveSynthType.toLowerCase() as OscillatorType;
        mainOsc.frequency.value = freq;
        
        mainGain.gain.setValueAtTime(0, now);
        mainGain.gain.linearRampToValueAtTime(0.55 * velocity, now + 0.005); 
        mainGain.gain.exponentialRampToValueAtTime(0.35 * velocity, now + 0.1); 
        mainGain.gain.setTargetAtTime(0.3 * velocity, now + 0.1, 0.2); 
        mainGain.gain.setTargetAtTime(0, stopTime - 0.05, 0.08); 
        
        mainOsc.connect(mainGain);
        mainGain.connect(synthFilter);
        mainOsc.start(now);
        mainOsc.stop(stopTime + 0.1);
        sources.push({ osc: mainOsc, gain: mainGain });
        
        const detunes = [
          { ratio: 0.992, gain: 0.3, phase: 0.2 },    
          { ratio: 1.008, gain: 0.3, phase: -0.2 }    
        ];
        
        detunes.forEach(detune => {
          const detuneOsc = ctx.createOscillator();
          const detuneGain = ctx.createGain();
          
          detuneOsc.type = mainOsc.type;
          detuneOsc.frequency.value = freq * detune.ratio;
          
          const attackVar = 0.005 + Math.random() * 0.003;
          detuneGain.gain.setValueAtTime(0, now);
          detuneGain.gain.linearRampToValueAtTime(detune.gain * velocity, now + attackVar);
          detuneGain.gain.exponentialRampToValueAtTime(detune.gain * 0.6 * velocity, now + 0.1);
          detuneGain.gain.setTargetAtTime(detune.gain * 0.5 * velocity, now + 0.1, 0.2);
          detuneGain.gain.setTargetAtTime(0, stopTime - 0.05, 0.08);
          
          detuneOsc.connect(detuneGain);
          detuneGain.connect(synthFilter);
          detuneOsc.start(now);
          detuneOsc.stop(stopTime + 0.1);
          sources.push({ osc: detuneOsc, gain: detuneGain });
        });
        
        const subOsc = ctx.createOscillator();
        const subGain = ctx.createGain();
        
        subOsc.type = "triangle"; 
        subOsc.frequency.value = freq / (freq < 220 ? 2 : 1); 
        
        const subVolume = freq < 220 ? 0.4 : 0.2; 
        
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(subVolume * velocity, now + 0.01);
        subGain.gain.exponentialRampToValueAtTime(subVolume * 0.8 * velocity, now + 0.1);
        subGain.gain.setTargetAtTime(subVolume * 0.7 * velocity, now + 0.1, 0.2);
        subGain.gain.setTargetAtTime(0, stopTime - 0.08, 0.1);
        
        subOsc.connect(subGain);
        subGain.connect(masterGain); 
        subOsc.start(now);
        subOsc.stop(stopTime + 0.2);
        sources.push({ osc: subOsc, gain: subGain });
      }

      const sourceId = `${note}-${now}`
      activeSourcesRef.current[sourceId] = sources
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
            playNoteInternal(note, event.duration, event.velocity || 1, event.synthType)
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
          playNoteInternal(note, event.duration, event.velocity || 1, event.synthType)
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
          const prevTime = currentTimeRef.current
          const newTime = prevTime + 0.125
          const adjustedTime = newTime >= currentTune.totalBeats ? newTime % currentTune.totalBeats : newTime

          setCurrentTime(adjustedTime)
          currentTimeRef.current = adjustedTime

          const notesToPlay = currentTune.pattern.filter((event) => event.time >= prevTime && event.time < newTime)

          for (const event of notesToPlay) {
            const noteArray = Array.isArray(event.note) ? event.note : [event.note]
            if (noteArray.length > 0) {
              playNoteInternal(noteArray[0], event.duration, event.velocity || 1)
            }
          }

          setMomentum(20)
          setAutoPlaySpeed(0.25) 
          setIsWindingUp(true)
          setLastCrankTime(now)

          const currentPage = Math.floor(Math.floor(adjustedTime) / visibleBeats)
          if (currentPage !== patternPage) setPatternPage(currentPage)
        } else {
          const prevTime = currentTimeRef.current
          const newTime = Math.max(0, prevTime - 0.125)

          setCurrentTime(newTime)
          currentTimeRef.current = newTime

          const notesToPlay = currentTune.pattern.filter((event) => event.time <= prevTime && event.time > newTime)

          for (const event of notesToPlay.reverse()) {
            const noteArray = Array.isArray(event.note) ? event.note : [event.note]
            if (noteArray.length > 0) {
              playNoteInternal(noteArray[0], event.duration, event.velocity || 1)
            }
          }

          setMomentum(Math.max(momentumRef.current - 10, 0))

          const currentPage = Math.floor(Math.floor(newTime) / visibleBeats)
          if (currentPage !== patternPage) setPatternPage(currentPage)
        }
        setLastCrankAngle(angle)
        setTimeout(() => setIsHandlingCrankEvent(false), 16)
      }
    },
    [lastCrankAngle, currentTune.totalBeats, visibleBeats, patternPage, playNoteInternal],
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
        setAutoPlaySpeed(0.25) 
        setIsWindingUp(true)

        const prevTime = currentTimeRef.current
        const newTime = prevTime + 0.125 
        const adjustedTime = newTime >= currentTune.totalBeats ? newTime % currentTune.totalBeats : newTime

        setCurrentTime(adjustedTime)
        currentTimeRef.current = adjustedTime

        const notesToPlay = currentTune.pattern.filter((event) => event.time >= prevTime && event.time < newTime)

        for (const event of notesToPlay) {
          const noteArray = Array.isArray(event.note) ? event.note : [event.note]
          if (noteArray.length > 0) {
            playNoteInternal(noteArray[0], event.duration, event.velocity || 1)
          }
        }

        const currentPage = Math.floor(Math.floor(adjustedTime) / visibleBeats)
        if (currentPage !== patternPage) setPatternPage(currentPage)
      } else if (e.key === "ArrowLeft") {
        const now = Date.now()
        setLastCrankTime(now)

        setCrankRotation((prev) => prev - 15)
        setMomentum(20)
        setAutoPlaySpeed(0.25)
        setIsWindingUp(true)

        const prevTime = currentTimeRef.current
        const newTime = Math.max(0, prevTime - 0.125) 

        setCurrentTime(newTime)
        currentTimeRef.current = newTime

        const notesToPlay = currentTune.pattern.filter((event) => event.time <= prevTime && event.time > newTime)

        for (const event of notesToPlay.reverse()) {
          const noteArray = Array.isArray(event.note) ? event.note : [event.note]
          if (noteArray.length > 0) {
            playNoteInternal(noteArray[0], event.duration, event.velocity || 1)
          }
        }

        const currentPage = Math.floor(Math.floor(newTime) / visibleBeats)
        if (currentPage !== patternPage) setPatternPage(currentPage)
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

  const renameTune = useCallback(() => {
    const newName = prompt("Enter a new name for this tune:", currentTune.name)
    if (newName && newName.trim() !== "") {
      setCurrentTune(prev => ({
        ...prev,
        name: newName.trim()
      }))
    }
  }, [currentTune])

  const clearTune = useCallback(() => {
    if (confirm("Are you sure you want to clear this tune? This cannot be undone.")) {
      setCurrentTune(prev => ({
        ...prev,
        pattern: [],
      }))
    }
  }, [])

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
        className={`flex select-none min-h-screen max-h-screen h-screen flex-col items-center justify-center font-mono relative overflow-hidden ${mode === "Light" ? "light-mode" : "dark-mode"} ${isLowPowerDevice ? "low-power-mode" : ""}`}
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
                  <div className="flex items-center gap-1 mb-2">
                    <button
                      onClick={() => setMode((m) => (m === "Dark" ? "Light" : "Dark"))}
                      className="font-mono neon-text-green text-xs cursor-pointer"
                    >
                      {mode}
                    </button>
                    <button
                      onClick={renameTune}
                      className="flex-1 h-5 p-1 bg-black rounded flex items-center justify-center"
                      title="Rename tune"
                    >
                      <Pencil className="w-3 h-3 neon-text-cyan" />
                    </button>
                    <button
                      onClick={clearTune}
                      className="flex-1 h-5 p-1 bg-black rounded flex items-center justify-center"
                      title="Clear tune"
                    >
                      <Trash2 className="w-3 h-3 neon-text-red" />
                    </button>
                  </div>
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
                  
                  {selectedNote && (
                    <div className="flex flex-col gap-1 mb-2 neon-border-blue p-1">
                      <div className="text-[8px] font-mono neon-text-blue">
                        {selectedNote.time === -1 ? 'EDIT ALL NOTES' : 'EDIT NOTE'}
                      </div>
                      <div className="text-[10px] font-mono neon-text-pink">
                        {selectedNote.note} {selectedNote.time === -1 ? '(all instances)' : `at beat ${selectedNote.time + 1}`}
                      </div>
                      <select 
                        className="w-full text-[8px] bg-black neon-border-pink py-1 px-1"
                        value={selectedNoteSynth}
                        onChange={(e) => setSelectedNoteSynth(e.target.value as SynthType)}
                      >
                        <option value="Piano">Piano</option>
                        <option value="Music Box">Music Box</option>
                        <option value="Sine">Sine</option>
                        <option value="Square">Square</option>
                        <option value="Saw">Saw</option>
                        <option value="Triangle">Triangle</option>
                      </select>
                      <button
                        className="w-full text-[8px] bg-black rounded neon-border-cyan font-mono py-1"
                        onClick={() => {
                          const updatedPattern = [...currentTune.pattern];
                          
                          if (selectedNote.time === -1) {
                            updatedPattern.forEach((event, index) => {
                              if (event.note === selectedNote.note || 
                                 (Array.isArray(event.note) && event.note.includes(selectedNote.note))) {
                                updatedPattern[index] = {
                                  ...event,
                                  synthType: selectedNoteSynth
                                };
                              }
                            });
                          } else {
                            const noteIndex = updatedPattern.findIndex(
                              (event) => Math.floor(event.time) === selectedNote.time && 
                              (event.note === selectedNote.note || 
                               (Array.isArray(event.note) && event.note.includes(selectedNote.note)))
                            );
                            
                            if (noteIndex !== -1) {
                              const noteEvent = {...updatedPattern[noteIndex]};
                              noteEvent.synthType = selectedNoteSynth;
                              updatedPattern[noteIndex] = noteEvent;
                            }
                          }
                          
                          setCurrentTune({
                            ...currentTune,
                            pattern: updatedPattern
                          });
                          
                          setSelectedNote(null);
                        }}
                      >
                        <span className="neon-text-cyan">APPLY</span>
                      </button>
                    </div>
                  )}
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
                      <div className="flex items-center justify-center w-full">
                        <Save className="w-3 h-3" />
                      </div>
                    </button>
                    <button
                      className="flex-1 py-1 bg-black rounded flex items-center justify-center neon-border-green"
                      onClick={loadTuneFile}
                      title="Load"
                    >
                      <div className="flex items-center justify-center w-full">
                        <FolderOpen className="w-3 h-3" />
                      </div>
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
                        className={`text-center ${Math.floor(currentTime) === beatIndex ? "neon-text-pink font-bold" : "neon-text-blue font-mono"}`}
                      >
                        {beatIndex + 1}
                      </div>
                    ))}
                    {gridDisplay.map((row, rowIndex) => (
                      <React.Fragment key={`r-${rowIndex}`}>
                        <div 
                          className={`text-right pr-1 font-mono truncate ${getNoteColor(ALL_NOTES[rowIndex])} cursor-pointer`}
                          onClick={() => {
                            setSelectedNote({note: ALL_NOTES[rowIndex], time: -1}); 
                            
                            const existingNote = currentTune.pattern.find(
                              event => (event.note === ALL_NOTES[rowIndex] || 
                                      (Array.isArray(event.note) && event.note.includes(ALL_NOTES[rowIndex])))
                            );
                            
                            setSelectedNoteSynth(existingNote?.synthType || synthType);
                          }}
                        >
                          {ALL_NOTES[rowIndex]}
                        </div>
                        {row.map((cell, colIndex) => {
                          const beatIndex = getVisibleBeatIndices()[colIndex]
                          return (
                            <div
                              key={`c-${rowIndex}-${beatIndex}`}
                              className="w-full h-[14px] flex items-center justify-center cursor-pointer relative"
                              style={{
                                backgroundColor: Math.floor(currentTime) === beatIndex 
                                  ? (mode === "Light" ? "rgba(0, 102, 204, 0.1)" : "rgba(255, 0, 255, 0.07)") 
                                  : "transparent"
                              }}
                              onClick={(e) => {
                                const note = ALL_NOTES[rowIndex]
                                const time = beatIndex
                                const updatedPattern = [...currentTune.pattern]
                                const existingEventIndex = updatedPattern.findIndex(
                                  (event) =>
                                    Math.floor(event.time) === time &&
                                    (event.note === note || (Array.isArray(event.note) && event.note.includes(note))),
                                )
                                
                                if (e.shiftKey && existingEventIndex !== -1) {
                                  const event = updatedPattern[existingEventIndex]
                                  setSelectedNote({ note, time })
                                  setSelectedNoteSynth(event.synthType || synthType)
                                  return
                                }
                                
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
                                    Math.floor(currentTime) === beatIndex
                                      ? (cell.state.isStart ? "bg-white dark:bg-white light:bg-black" : "bg-gray-400 dark:bg-gray-400 light:bg-gray-700")
                                      : "border-2 bg-transparent"
                                  } ${
                                    Math.floor(currentTime) === beatIndex
                                      ? getNoteColor(ALL_NOTES[rowIndex]).replace("text", "border")
                                      : (cell.state.isStart ? "border-white dark:border-white light:border-black" : "border-gray-400 dark:border-gray-400 light:border-gray-700")
                                  }`}
                                  style={{
                                    opacity: 1,
                                    visibility: "visible",
                                    display: "block !important",
                                    zIndex: 10,
                                    position: "absolute",
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%, -50%)",
                                    width: "10px",
                                    height: "10px"
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
                  className={`w-16 h-16 flex items-center justify-center cursor-grab relative ${isDragging ? "cursor-grabbing" : ""}`}
                >
                  <motion.div
                    className="w-full h-full flex items-center justify-center"
                    style={{ rotate: crankRotation }}
                  >
                    <div
                      className="w-3 h-12 bg-green-500 crank-handle"
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
body{background-color:#000;color:#eee;overflow:hidden;position:fixed;width:100%;height:100%}
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
select{appearance:none;-webkit-appearance:none;-moz-appearance:none;background-image:url('data:image/svg+xml;utf8,<svg fill="%230f0" height="24" viewBox="0 0 24 24" width="24" xmlns="http:
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
.dark-mode .text-black {color: #0ff !important; opacity: 0.8 !important;}
.dark-mode .w-1\.5.h-1\.5.bg-white, .dark-mode .w-1\.5.h-1\.5.bg-gray-500, .dark-mode .w-2.h-2.bg-white, .dark-mode .w-2.h-2.bg-gray-400, .dark-mode .w-3.h-3.bg-white, .dark-mode .w-3.h-3.bg-gray-400, .light-mode .w-1\.5.h-1\.5.bg-black, .light-mode .w-1\.5.h-1\.5.bg-gray-700, .light-mode .w-2.h-2.bg-black, .light-mode .w-2.h-2.bg-gray-700, .light-mode .w-3.h-3.bg-black, .light-mode .w-3.h-3.bg-gray-700, .bg-white, .bg-gray-400, .bg-black, .bg-gray-700, [class*="bg-white"], [class*="bg-gray-400"], [class*="bg-black"], [class*="bg-gray-700"] {opacity: 1 !important; visibility: visible !important; display: block !important; z-index: 10 !important; position: relative !important;}
.grid-cols-9 > div > div {min-width: 8px !important; min-height: 8px !important; opacity: 1 !important; visibility: visible !important; display: block !important; z-index: 10 !important; position: relative !important;}
.dark-mode .bg-white, .dark-mode .bg-gray-400, .light-mode .bg-black, .light-mode .bg-gray-700 {opacity: 1 !important; visibility: visible !important; display: block !important; z-index: 10 !important; position: relative !important;}
.retro-grid {background-image: linear-gradient(rgba(100, 100, 100, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 100, 100, 0.5) 1px, transparent 1px) !important;}
.bg-gray-900.dark\:bg-gray-900 {background-color: #222 !important;}
.grid-cols-9 > div {background-color: transparent !important;}
.grid-cols-9 > div > div {display: block !important; visibility: visible !important; opacity: 1 !important; z-index: 100 !important;}
.dark-mode .grid-cols-9 > div > div {background-color: cyan !important; border: 1px solid white !important;}
.light-mode .grid-cols-9 > div > div {background-color: blue !important; border: 1px solid black !important;}
.light-mode .crank-handle {background: none !important; border: 2px solid black !important; box-shadow: none !important;}
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

