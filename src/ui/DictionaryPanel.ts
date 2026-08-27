/**
 * DictionaryPanel — Sağ Taraf Sözlük Kenar Çubuğu (Right Sidebar).
 * Açılıp kapanabilir, terim ekleme, arama, listeleme, silme,
 * JSON ve CSV/TSV içe/dışa aktarma işlemlerini yönetir.
 */

import { DictionaryStore, DictionaryTerm } from '../store/DictionaryStore'
import { t } from '../i18n/i18n'

export class DictionaryPanel {
  private sidebarEl: HTMLElement
  private resizerEl: HTMLElement | null
  private store: DictionaryStore
  private searchInput!: HTMLInputElement
  private srcInput!: HTMLInputElement
  private tgtInput!: HTMLInputElement
  private noteInput!: HTMLInputElement
  private termsListEl!: HTMLElement
  private termsCountEl!: HTMLElement

  onTermsChange: (() => void) | null = null

  constructor(store: DictionaryStore) {
    this.store = store
    this.sidebarEl = document.getElementById('dict-sidebar')!
    this.resizerEl = document.getElementById('dict-resizer')

    this.initElements()
    this.bindEvents()
  }

  get isOpen(): boolean {
    return this.sidebarEl?.classList.contains('open') ?? false
  }

  toggle(): void {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  open(prefillSource?: string): void {
    if (!this.sidebarEl) return
    this.refreshTexts()
    this.renderTerms()
    this.sidebarEl.classList.add('open')
    if (this.resizerEl) this.resizerEl.style.display = 'block'

    if (prefillSource) {
      this.srcInput.value = prefillSource
      this.tgtInput.value = ''
      this.noteInput.value = ''
      this.tgtInput.focus()
    } else {
      this.srcInput?.focus()
    }
  }

  close(): void {
    if (!this.sidebarEl) return
    this.sidebarEl.classList.remove('open')
    if (this.resizerEl) this.resizerEl.style.display = 'none'
  }

  private initElements(): void {
    this.searchInput  = document.getElementById('dict-search-input') as HTMLInputElement
    this.srcInput      = document.getElementById('dict-src-input') as HTMLInputElement
    this.tgtInput      = document.getElementById('dict-tgt-input') as HTMLInputElement
    this.noteInput     = document.getElementById('dict-note-input') as HTMLInputElement
    this.termsListEl   = document.getElementById('dict-terms-list')!
    this.termsCountEl  = document.getElementById('dict-terms-count')!
  }

  private bindEvents(): void {
    // Kapatma butonu
    document.getElementById('btn-dict-sidebar-close')?.addEventListener('click', () => this.close())

    // Terim ekleme formu
    document.getElementById('dict-add-form')?.addEventListener('submit', (e) => {
      e.preventDefault()
      this.handleAddTerm()
    })

    // Arama filtresi
    this.searchInput?.addEventListener('input', () => {
      this.renderTerms()
    })

    // Dışa aktar (Export JSON)
    document.getElementById('btn-dict-export')?.addEventListener('click', () => {
      this.exportJsonTerms()
    })

    // Dışa aktar (Export CSV / Excel)
    document.getElementById('btn-dict-export-csv')?.addEventListener('click', () => {
      this.exportCsvTerms()
    })

    // İçe aktar (Import JSON / CSV / TSV)
    const fileInput = document.getElementById('dict-import-file') as HTMLInputElement
    document.getElementById('btn-dict-import')?.addEventListener('click', () => {
      fileInput?.click()
    })

    fileInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const fileName = file.name.toLowerCase()
      const reader = new FileReader()

      reader.onload = () => {
        const content = String(reader.result)
        let count = 0

        if (fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt')) {
          count = this.store.importCsv(content)
        } else if (fileName.endsWith('.json')) {
          count = this.store.importJson(content)
        } else {
          count = this.store.importJson(content)
          if (count === 0) count = this.store.importCsv(content)
        }

        fileInput.value = ''
        this.renderTerms()
        this.onTermsChange?.()
      }
      reader.readAsText(file)
    })
  }

  private handleAddTerm(): void {
    const src = this.srcInput.value.trim()
    const tgt = this.tgtInput.value.trim()
    const note = this.noteInput.value.trim()

    if (!src || !tgt) return

    this.store.add(src, tgt, note || undefined)
    this.srcInput.value = ''
    this.tgtInput.value = ''
    this.noteInput.value = ''

    this.renderTerms()
    this.onTermsChange?.()
    this.srcInput.focus()
  }

  private exportJsonTerms(): void {
    const jsonStr = this.store.exportJson()
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `glossary_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  private exportCsvTerms(): void {
    const csvStr = this.store.exportCsv()
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `glossary_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  private renderTerms(): void {
    if (!this.termsListEl) return
    this.termsListEl.innerHTML = ''

    const query = (this.searchInput?.value || '').toLowerCase().trim()
    let terms = this.store.getAll()

    if (query) {
      terms = terms.filter(
        t =>
          t.source.toLowerCase().includes(query) ||
          t.target.toLowerCase().includes(query) ||
          (t.note && t.note.toLowerCase().includes(query))
      )
    }

    if (this.termsCountEl) {
      this.termsCountEl.textContent = `${this.store.getAll().length} ${t('termsCount')}`
    }

    if (terms.length === 0) {
      const empty = document.createElement('div')
      empty.className = 'dict-empty'
      empty.textContent = t('noTermsFound')
      this.termsListEl.appendChild(empty)
      return
    }

    const frag = document.createDocumentFragment()
    terms.forEach(term => {
      const row = document.createElement('div')
      row.className = 'dict-term-row'

      const textWrap = document.createElement('div')
      textWrap.className = 'dict-term-text-wrap'

      const topRow = document.createElement('div')
      topRow.className = 'dict-term-top'

      const srcCol = document.createElement('span')
      srcCol.className = 'dict-term-src'
      srcCol.textContent = term.source

      const arrow = document.createElement('span')
      arrow.className = 'dict-term-arrow'
      arrow.textContent = '→'

      const tgtCol = document.createElement('span')
      tgtCol.className = 'dict-term-tgt'
      tgtCol.textContent = term.target

      topRow.appendChild(srcCol)
      topRow.appendChild(arrow)
      topRow.appendChild(tgtCol)
      textWrap.appendChild(topRow)

      if (term.note) {
        const noteCol = document.createElement('div')
        noteCol.className = 'dict-term-note'
        noteCol.textContent = term.note
        textWrap.appendChild(noteCol)
      }

      const delBtn = document.createElement('button')
      delBtn.className = 'dict-term-del'
      delBtn.innerHTML = '&times;'
      delBtn.title = t('deleteTerm')
      delBtn.addEventListener('click', () => {
        this.store.delete(term.id)
        this.renderTerms()
        this.onTermsChange?.()
      })

      row.appendChild(textWrap)
      row.appendChild(delBtn)

      frag.appendChild(row)
    })

    this.termsListEl.appendChild(frag)
  }

  refreshTexts(): void {
    const titleEl = document.getElementById('dict-sidebar-title')
    if (titleEl) titleEl.textContent = t('dictionaryTitle')

    if (this.srcInput) this.srcInput.placeholder = t('sourceTerm')
    if (this.tgtInput) this.tgtInput.placeholder = t('targetTerm')
    if (this.noteInput) this.noteInput.placeholder = t('noteOptional')
    if (this.searchInput) this.searchInput.placeholder = t('searchTerm')

    const addBtn = document.getElementById('btn-dict-add')
    if (addBtn) addBtn.textContent = t('addTerm')

    const exportBtn = document.getElementById('btn-dict-export')
    if (exportBtn) exportBtn.title = t('exportTerms')

    const exportCsvBtn = document.getElementById('btn-dict-export-csv')
    if (exportCsvBtn) exportCsvBtn.title = t('exportCsv')

    const importBtn = document.getElementById('btn-dict-import')
    if (importBtn) importBtn.title = t('importCsv')

    const closeBtn = document.getElementById('btn-dict-sidebar-close')
    if (closeBtn) closeBtn.title = t('closeDictionary')
  }
}
