import type { LevelDef } from './types'

/** Sector 2 — Cold Storage. Long cold aisle between two rows of storage rooms. 7 generator sites, 2 exit gates. */
export const SECTOR_2: LevelDef = {
  id: 'sector-2',
  name: 'COLD STORAGE',
  rows: [
    '#########################',
    '#L.....#.......#.......L#',
    '#..G..c#...G...#..c..G..#',
    '#......=.......D........#',
    '#c.....#..c.c..#.......c#',
    '###D#####-###D#####=##D##',
    '#.......c.......c.......E',
    'E...P...........G.......#',
    '#..c.......c.........c..#',
    '####D####=#####D###-#####',
    '#L......#.......#......L#',
    '#...G...D...G...=...c...#',
    '#..c....#.......#...G...#',
    '#.......#..c..L.#.......#',
    '#########################',
  ],
  cameras: [
    { cx: 11, cz: 1, wall: 'N' },
    { cx: 1, cz: 12, wall: 'W' },
    { cx: 23, cz: 11, wall: 'E' },
  ],
}
