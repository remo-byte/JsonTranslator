/**
 * ElectronBridge — IPC çağrılarını renderer'dan soyutlar.
 * Tarayıcıda çalışırken (dev/test) stub davranış gösterir.
 */

export interface OpenFileResult {
  path: string
  content: string
}

export interface SaveResult {
  success: boolean
  error?: string
}

export interface SaveAsResult {
  path: string
}

declare global {
  interface Window {
    electronAPI?: {
      openFile(): Promise<OpenFileResult | null>
      readFile(filePath: string): Promise<OpenFileResult | null>
      saveFile(filePath: string, content: string): Promise<SaveResult>
      saveFileAs(content: string, defaultName: string): Promise<SaveAsResult | null>
      setTitle(title: string): void
      translateDeepL(apiKey: string, text: string, targetLang: string): Promise<string>
      translateGoogle(apiKey: string, text: string, targetLang: string): Promise<string>
    }
  }
}

export class ElectronBridge {
  /** Her çağrıda yeniden kontrol et — preload timing'e karşı güvenli */
  private get api() {
    return typeof window !== 'undefined' ? window.electronAPI : undefined
  }

  get isElectron(): boolean {
    return !!this.api
  }

  async openFile(): Promise<OpenFileResult | null> {
    const api = this.api
    if (api) return api.openFile()
    return null
  }

  async readFile(filePath: string): Promise<OpenFileResult | null> {
    const api = this.api
    if (api) return api.readFile(filePath)
    return null
  }

  async saveFile(filePath: string, content: string): Promise<SaveResult> {
    const api = this.api
    if (api) return api.saveFile(filePath, content)
    return { success: false, error: 'Electron dışında native kaydetme desteklenmiyor.' }
  }

  async saveFileAs(content: string, defaultName: string): Promise<SaveAsResult | null> {
    const api = this.api
    if (api) return api.saveFileAs(content, defaultName)
    return null
  }

  setTitle(title: string): void {
    const api = this.api
    if (api) api.setTitle(title)
    else document.title = title
  }

  async translateDeepL(apiKey: string, text: string, targetLang: string): Promise<string> {
    const api = this.api
    if (api && api.translateDeepL) {
      return api.translateDeepL(apiKey, text, targetLang)
    }

    // Tarayıcı ortamı (Browser fallback)
    const isFree = apiKey.endsWith(':fx')
    const endpoint = isFree
      ? 'https://api-free.deepl.com/v2/translate'
      : 'https://api.deepl.com/v2/translate'

    const deeplTargetLang = targetLang.toUpperCase()
    const params = new URLSearchParams()
    params.append('text', text)
    params.append('target_lang', deeplTargetLang)
    params.append('tag_handling', 'xml')

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`DeepL API Hatası (${res.status}): ${errText || 'Bilinmeyen hata'}`)
    }

    const data: any = await res.json()
    return data.translations?.[0]?.text || text
  }

  async translateGoogle(apiKey: string, text: string, targetLang: string): Promise<string> {
    const api = this.api
    if (api && api.translateGoogle) {
      return api.translateGoogle(apiKey, text, targetLang)
    }

    // Tarayıcı ortamı (Browser fallback)
    if (apiKey) {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, target: targetLang, format: 'text' }),
      })
      if (!res.ok) {
        const errJson: any = await res.json().catch(() => ({}))
        throw new Error(`Google Translate Hatası: ${errJson.error?.message || res.status}`)
      }
      const data: any = await res.json()
      return data.data?.translations?.[0]?.translatedText || text
    } else {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        targetLang
      )}&dt=t&q=${encodeURIComponent(text)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Google Translate bağlantı hatası: ${res.status}`)
      const data: any = await res.json()
      if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0].map((item: any) => item[0]).join('')
      }
      return text
    }
  }
}


