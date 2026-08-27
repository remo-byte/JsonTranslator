/**
 * SplitterController — Panel boyutlandırma yöneticisi.
 * 1. Sol Sidebar genişliği (yatay sürükleme / col-resize)
 * 2. Sağ Panel üst (kaynak) ve alt (çeviri) yüksekliği (dikey sürükleme / row-resize)
 *
 * Kullanıcı tercihlerini localStorage'a kaydeder.
 */

const STORAGE_SIDEBAR_W = 'jt_sidebar_width'
const STORAGE_SOURCE_H  = 'jt_source_height'
const STORAGE_DICT_W    = 'jt_dict_width'

export class SplitterController {
  private sidebarEl: HTMLElement
  private sidebarResizer: HTMLElement
  private sourcePanel: HTMLElement
  private horizontalResizer: HTMLElement
  private detailPane: HTMLElement
  private dictSidebar: HTMLElement | null
  private dictResizer: HTMLElement | null

  constructor() {
    this.sidebarEl         = document.getElementById('sidebar')!
    this.sidebarResizer    = document.getElementById('sidebar-resizer')!
    this.sourcePanel       = document.getElementById('source-panel')!
    this.horizontalResizer = document.getElementById('detail-resizer')!
    this.detailPane        = document.getElementById('detail-pane')!
    this.dictSidebar       = document.getElementById('dict-sidebar')
    this.dictResizer       = document.getElementById('dict-resizer')

    this.initSidebarResizer()
    this.initDetailResizer()
    this.initDictResizer()
    this.restoreSavedSizes()
  }


  /** Sol sidebar genişlik boyutlandırıcı */
  private initSidebarResizer(): void {
    if (!this.sidebarResizer || !this.sidebarEl) return

    let isDragging = false
    let startX = 0
    let startWidth = 0

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true
      startX = e.clientX
      startWidth = this.sidebarEl.getBoundingClientRect().width
      this.sidebarResizer.classList.add('dragging')
      document.body.classList.add('resizing-col')
      this.sidebarResizer.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      const deltaX = e.clientX - startX
      const minW = 200
      const maxW = Math.min(window.innerWidth * 0.6, 650)
      const newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX))

      this.sidebarEl.style.width = `${newWidth}px`
      localStorage.setItem(STORAGE_SIDEBAR_W, String(newWidth))
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return
      isDragging = false
      this.sidebarResizer.classList.remove('dragging')
      document.body.classList.remove('resizing-col')
      try {
        this.sidebarResizer.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }

    this.sidebarResizer.addEventListener('pointerdown', onPointerDown)
    this.sidebarResizer.addEventListener('pointermove', onPointerMove)
    this.sidebarResizer.addEventListener('pointerup', onPointerUp)
    this.sidebarResizer.addEventListener('pointercancel', onPointerUp)
  }

  /** Sağ panel Kaynak / Çeviri yükseklik boyutlandırıcı */
  private initDetailResizer(): void {
    if (!this.horizontalResizer || !this.sourcePanel || !this.detailPane) return

    let isDragging = false
    let startY = 0
    let startHeight = 0

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true
      startY = e.clientY
      startHeight = this.sourcePanel.getBoundingClientRect().height
      this.horizontalResizer.classList.add('dragging')
      document.body.classList.add('resizing-row')
      this.horizontalResizer.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      const deltaY = e.clientY - startY
      const detailH = this.detailPane.getBoundingClientRect().height
      const minH = 80
      const maxH = Math.max(minH, detailH - 120)
      const newHeight = Math.max(minH, Math.min(maxH, startHeight + deltaY))

      this.sourcePanel.style.flex = 'none'
      this.sourcePanel.style.height = `${newHeight}px`
      localStorage.setItem(STORAGE_SOURCE_H, String(newHeight))
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return
      isDragging = false
      this.horizontalResizer.classList.remove('dragging')
      document.body.classList.remove('resizing-row')
      try {
        this.horizontalResizer.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }

    this.horizontalResizer.addEventListener('pointerdown', onPointerDown)
    this.horizontalResizer.addEventListener('pointermove', onPointerMove)
    this.horizontalResizer.addEventListener('pointerup', onPointerUp)
    this.horizontalResizer.addEventListener('pointercancel', onPointerUp)
  }

  /** Sağ Sözlük sidebar genişlik boyutlandırıcı */
  private initDictResizer(): void {
    if (!this.dictResizer || !this.dictSidebar) return

    let isDragging = false
    let startX = 0
    let startWidth = 0

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true
      startX = e.clientX
      startWidth = this.dictSidebar!.getBoundingClientRect().width
      this.dictResizer!.classList.add('dragging')
      document.body.classList.add('resizing-col')
      this.dictResizer!.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      // Sağa doğru çekerse küçülür, sola çekerse büyür (sağ sidebar)
      const deltaX = startX - e.clientX
      const minW = 220
      const maxW = Math.min(window.innerWidth * 0.5, 600)
      const newWidth = Math.max(minW, Math.min(maxW, startWidth + deltaX))

      this.dictSidebar!.style.width = `${newWidth}px`
      localStorage.setItem(STORAGE_DICT_W, String(newWidth))
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return
      isDragging = false
      this.dictResizer!.classList.remove('dragging')
      document.body.classList.remove('resizing-col')
      try {
        this.dictResizer!.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }

    this.dictResizer.addEventListener('pointerdown', onPointerDown)
    this.dictResizer.addEventListener('pointermove', onPointerMove)
    this.dictResizer.addEventListener('pointerup', onPointerUp)
    this.dictResizer.addEventListener('pointercancel', onPointerUp)
  }

  /** Kaydedilen boyutları geri yükle */
  private restoreSavedSizes(): void {
    const savedSidebarW = localStorage.getItem(STORAGE_SIDEBAR_W)
    if (savedSidebarW && this.sidebarEl) {
      const widthNum = parseFloat(savedSidebarW)
      if (widthNum >= 180 && widthNum <= 700) {
        this.sidebarEl.style.width = `${widthNum}px`
      }
    }

    const savedSourceH = localStorage.getItem(STORAGE_SOURCE_H)
    if (savedSourceH && this.sourcePanel) {
      const heightNum = parseFloat(savedSourceH)
      if (heightNum >= 60 && heightNum <= 1000) {
        this.sourcePanel.style.flex = 'none'
        this.sourcePanel.style.height = `${heightNum}px`
      }
    }

    const savedDictW = localStorage.getItem(STORAGE_DICT_W)
    if (savedDictW && this.dictSidebar) {
      const widthNum = parseFloat(savedDictW)
      if (widthNum >= 200 && widthNum <= 650) {
        this.dictSidebar.style.width = `${widthNum}px`
      }
    }
  }
}

