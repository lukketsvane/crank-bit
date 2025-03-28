import type { TuneData } from "./types"
import avril14th from "./avril14th"
import imConfessin from "./imConfessin"
import pokemonLeafGreen from "./pokemonLeafGreen"

// Include all tunes in the tunes array
export const tunes: TuneData[] = [
  avril14th,
  imConfessin,
  pokemonLeafGreen,
  // Add any other tunes here
]

export function getRandomTune() {
  // Return a random tune from the array
  return tunes[Math.floor(Math.random() * tunes.length)]
}

export default tunes