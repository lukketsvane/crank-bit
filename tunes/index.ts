import type { TuneData } from "./types"
import avril14th from "./avril14th"

// Create array with only Avril 14th
export const tunes: TuneData[] = [avril14th]

export function getRandomTune() {
  // Since we only have one tune, just return it
  return avril14th
}

export default tunes

