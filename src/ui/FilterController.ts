/**
 * FilterController — Tümü / Çevrilmemiş / Çevrilmiş filtresi.
 */

export type FilterMode = 'all' | 'untranslated' | 'translated' | 'errors' | 'warnings'

export class FilterController {
  private current: FilterMode = 'all'
  private onChangeCallback: ((mode: FilterMode) => void) | null = null

  constructor(containerSelector: string) {
    const container = document.querySelector(containerSelector) as HTMLElement
    container.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.filter as FilterMode
        this.setMode(mode)
        container.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
      })
    })
  }

  private setMode(mode: FilterMode): void {
    this.current = mode
    this.onChangeCallback?.(mode)
  }

  get mode(): FilterMode {
    return this.current
  }

  onChange(cb: (mode: FilterMode) => void): void {
    this.onChangeCallback = cb
  }
}
