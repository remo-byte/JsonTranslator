/**
 * RecentFilesStore — En son açılan JSON dosyalarının listesini localStorage'da saklar ve yönetir.
 */

export interface RecentFile {
  path: string
  name: string
  lastOpened: number
}

const STORAGE_KEY = 'jt_recent_files'
const MAX_RECENT = 8

export class RecentFilesStore {
  private files: RecentFile[] = []

  constructor() {
    this.load()
  }

  getAll(): RecentFile[] {
    return this.files
  }

  add(filePath: string): void {
    if (!filePath) return
    const name = filePath.replace(/\\/g, '/').split('/').pop() || filePath

    // Varsa eskisini kaldır, başa ekle
    this.files = this.files.filter(f => f.path !== filePath)
    this.files.unshift({
      path: filePath,
      name,
      lastOpened: Date.now(),
    })

    if (this.files.length > MAX_RECENT) {
      this.files = this.files.slice(0, MAX_RECENT)
    }

    this.save()
  }

  remove(filePath: string): void {
    this.files = this.files.filter(f => f.path !== filePath)
    this.save()
  }

  clear(): void {
    this.files = []
    this.save()
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        this.files = JSON.parse(raw)
      }
    } catch {
      this.files = []
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.files))
    } catch {
      // ignore
    }
  }
}
