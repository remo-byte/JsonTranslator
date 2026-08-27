/**
 * PaginationController — Sol kenar çubuğu (Sidebar) için 50'lik sayfalandırma bileşeni.
 * Akıllı sayfa numaraları (örn: « ‹ 1 2 3 ... 169 › »), tıklandığında sayfa geçişi ve
 * toplam/aralık göstergesi.
 */

export interface PaginationEvents {
  onPageChange: (page: number) => void
}

export class PaginationController {
  private container: HTMLElement
  private currentPage = 1
  private totalItems = 0
  private pageSize = 50
  private events: PaginationEvents

  constructor(containerId: string, pageSize = 50, events: PaginationEvents) {
    this.container = document.getElementById(containerId)!
    this.pageSize = pageSize
    this.events = events
  }

  get page(): number {
    return this.currentPage
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.pageSize))
  }

  get range(): { start: number; end: number } {
    const start = (this.currentPage - 1) * this.pageSize
    const end = Math.min(this.totalItems, start + this.pageSize)
    return { start, end }
  }

  /** Bir elemanın index'ine göre hangi sayfada olduğunu hesaplar (1-indexed) */
  getPageForIndex(index: number): number {
    if (index < 0) return 1
    return Math.floor(index / this.pageSize) + 1
  }

  /** Toplam eleman sayısını güncelle */
  setTotal(total: number, resetPage = false): void {
    this.totalItems = total
    const maxPages = this.totalPages
    if (resetPage || this.currentPage > maxPages) {
      this.currentPage = 1
    }
    this.render()
  }

  /** Belirli bir sayfaya geç */
  goToPage(page: number, emitEvent = true): void {
    const maxPages = this.totalPages
    const target = Math.max(1, Math.min(maxPages, page))
    if (target !== this.currentPage) {
      this.currentPage = target
      this.render()
      if (emitEvent) {
        this.events.onPageChange(this.currentPage)
      }
    }
  }

  /** Sayfalandırma butonlarını ve çubuğunu oluştur */
  render(): void {
    if (!this.container) return
    this.container.innerHTML = ''

    const totalPages = this.totalPages
    if (this.totalItems <= this.pageSize && totalPages <= 1) {
      this.container.style.display = 'none'
      return
    }

    this.container.style.display = 'flex'

    const wrap = document.createElement('div')
    wrap.className = 'pagination-wrap'

    // Önceki butonu
    const prevBtn = document.createElement('button')
    prevBtn.className = 'page-btn page-arrow'
    prevBtn.textContent = '‹'
    prevBtn.title = 'Önceki Sayfa'
    prevBtn.disabled = this.currentPage <= 1
    prevBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1))
    wrap.appendChild(prevBtn)

    // Sayfa numaraları
    const pages = this.calculatePageNumbers()
    pages.forEach(p => {
      if (p === '...') {
        const dots = document.createElement('span')
        dots.className = 'page-dots'
        dots.textContent = '…'
        wrap.appendChild(dots)
      } else {
        const pageNum = Number(p)
        const pageBtn = document.createElement('button')
        pageBtn.className = 'page-btn' + (pageNum === this.currentPage ? ' active' : '')
        pageBtn.textContent = String(pageNum)
        pageBtn.addEventListener('click', () => this.goToPage(pageNum))
        wrap.appendChild(pageBtn)
      }
    })

    // Sonraki butonu
    const nextBtn = document.createElement('button')
    nextBtn.className = 'page-btn page-arrow'
    nextBtn.textContent = '›'
    nextBtn.title = 'Sonraki Sayfa'
    nextBtn.disabled = this.currentPage >= totalPages
    nextBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1))
    wrap.appendChild(nextBtn)

    // Bilgi çubuğu (Örn: 1-50 / 8441)
    const info = document.createElement('div')
    info.className = 'pagination-info'
    const startDisplay = this.totalItems === 0 ? 0 : this.range.start + 1
    info.textContent = `${startDisplay}-${this.range.end} / ${this.totalItems}`

    this.container.appendChild(wrap)
    this.container.appendChild(info)
  }

  /** Akıllı sayfa numaraları dizisi hesaplar (1, 2, 3 ... 50) */
  private calculatePageNumbers(): (number | '...')[] {
    const total = this.totalPages
    const current = this.currentPage

    if (total <= 6) {
      return Array.from({ length: total }, (_, i) => i + 1)
    }

    const pages: (number | '...')[] = []

    if (current <= 3) {
      pages.push(1, 2, 3, 4, '...', total)
    } else if (current >= total - 2) {
      pages.push(1, '...', total - 3, total - 2, total - 1, total)
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total)
    }

    return pages
  }
}
