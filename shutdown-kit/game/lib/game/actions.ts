export type RepairResult = 'success' | 'fail' | 'abort'

/** One-shot commands from the UI. The sim consumes and clears them every step. */
export const actions = {
  use: false,
  hack: false,
  hide: false,
  decoy: false,
  repairResult: null as RepairResult | null,
}

export function clearActions() {
  actions.use = false
  actions.hack = false
  actions.hide = false
  actions.decoy = false
  actions.repairResult = null
}
