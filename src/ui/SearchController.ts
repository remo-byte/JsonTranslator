/**
 * SearchController — Anlık metin araması.
 */

export class SearchController {
  private query = ''
  private onChangeCallback: ((query: string) => void) | null = null

  constructor(inputSelector: string) {
    const input = document.querySelector(inputSelector) as HTMLInputElement
    input.addEventListener('input', () => {
      this.query = input.value.toLowerCase().trim()
      this.onChangeCallback?.(this.query)
    })
  }

  get currentQuery(): string {
    return this.query
  }

  matches(text: string): boolean {
    if (!this.query) return true
    return text.toLowerCase().includes(this.query)
  }

  onChange(cb: (query: string) => void): void {
    this.onChangeCallback = cb
  }
}
