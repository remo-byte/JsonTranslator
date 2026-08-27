/**
 * ProgressBar — Çeviri ilerleme çubuğunu günceller.
 */

export class ProgressBar {
  private barEl: HTMLElement
  private textEl: HTMLElement

  constructor(barSelector: string, textSelector: string) {
    this.barEl = document.querySelector(barSelector) as HTMLElement
    this.textEl = document.querySelector(textSelector) as HTMLElement
  }

  update(translated: number, total: number): void {
    const pct = total === 0 ? 0 : Math.round((translated / total) * 100)
    this.barEl.style.width = `${pct}%`
    this.textEl.textContent = `${translated} / ${total} (${pct}%)`
  }
}
