import type { TuneData } from "./types"
import avril14th from "./avril14th"
import imConfessin from "./imConfessin"
import pokemonLeafGreen from "./pokemonLeafGreen"

export const tunes: TuneData[] = [
  avril14th,
  imConfessin,
  pokemonLeafGreen,
]

export function getRandomTune() {
  return tunes[Math.floor(Math.random() * tunes.length)]
}

export default tunes