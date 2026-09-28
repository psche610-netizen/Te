import type { LevelDef } from './types'

/**
 * Sector 3 — The Foundry. A sealed furnace channel through the middle, reached only through
 * two dynamic walls, with casting rooms above and below. 8 generator sites, 2 exit gates.
 */
export const SECTOR_3: LevelDef = {
  id: 'sector-3',
  name: 'THE FOUNDRY',
  rows: [
    '#########################',
    '#L.....#....c....#.....L#',
    '#..G...=.........=...G..#',
    '#c.....#...G.....#.....c#',
    '###D####D#######D####D###',
    '#c.....................c#',
    '#..c...#####=#####......#',
    'E...P..#...G.....#..G...E',
    '#......#####-#####...c..#',
    '#.c.....................#',
    '###D#####-#####D####=####',
    '#L...#.......#.......#..#',
    '#..G.D...G...=...c...D.L#',
    '#....#..c..L.#...G...#..#',
    '#########################',
  ],
  cameras: [
    { cx: 12, cz: 1, wall: 'N' },
    { cx: 16, cz: 7, wall: 'E' },
    { cx: 23, cz: 9, wall: 'E' },
    { cx: 9, cz: 13, wall: 'S' },
  ],
}
