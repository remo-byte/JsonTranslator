import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export function registerIpcHandlers(win: BrowserWindow): void {
  /** Pencere başlığını güncelle */
  ipcMain.on('set-title', (_event, title: string) => {
    win.setTitle(title)
  })

  /**
   * Dosya aç diyaloğu
   * Döndürür: { path, content } | null
   */
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog(win, {
      title: 'JSON Dosyası Aç',
      filters: [{ name: 'JSON Dosyaları', extensions: ['json'] }],
      properties: ['openFile'],
    })

    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return { path: filePath, content }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { path: filePath, content: null, error: message }
    }
  })

  /**
   * Belirli bir dosya yolunu doğrudan oku (Son açılanlar için)
   * Döndürür: { path, content } | { path, content: null, error: string }
   */
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { path: filePath, content: null, error: 'Dosya bulunamadı' }
      }
      const content = fs.readFileSync(filePath, 'utf-8')
      return { path: filePath, content }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { path: filePath, content: null, error: message }
    }
  })


  /**
   * Mevcut dosyanın üzerine yaz
   * Döndürür: { success: true } | { success: false, error: string }
   */
  ipcMain.handle('dialog:saveFile', async (_event, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8')
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  /**
   * "Farklı Kaydet" diyaloğu
   * Döndürür: { path: string } | null
   */
  ipcMain.handle('dialog:saveFileAs', async (_event, content: string, defaultName: string) => {
    const result = await dialog.showSaveDialog(win, {
      title: 'JSON Dosyasını Kaydet',
      defaultPath: defaultName || 'translations.json',
      filters: [{ name: 'JSON Dosyaları', extensions: ['json'] }],
    })

    if (result.canceled || !result.filePath) return null

    try {
      fs.writeFileSync(result.filePath, content, 'utf-8')
      return { path: result.filePath }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { path: null, error: message }
    }
  })

  /**
   * DeepL API çağrısı (Node.js üzerinden CORS engelini aşar)
   */
  ipcMain.handle('mt:translateDeepL', async (_event, apiKey: string, text: string, targetLang: string) => {
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
      if (res.status === 403) {
        throw new Error('DeepL API: Yetkilendirme başarısız. API anahtarınızı kontrol edin.')
      } else if (res.status === 456) {
        throw new Error('DeepL API: Çeviri kotanız doldu.')
      }
      const errText = await res.text().catch(() => '')
      throw new Error(`DeepL API Hatası (${res.status}): ${errText || 'Bilinmeyen hata'}`)
    }

    const data: any = await res.json()
    return data.translations?.[0]?.text || text
  })

  /**
   * Google Translate API çağrısı (Node.js üzerinden)
   */
  ipcMain.handle('mt:translateGoogle', async (_event, apiKey: string, text: string, targetLang: string) => {
    if (apiKey) {
      const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          target: targetLang,
          format: 'text',
        }),
      })

      if (!res.ok) {
        const errJson: any = await res.json().catch(() => ({}))
        const msg = errJson.error?.message || `HTTP ${res.status}`
        throw new Error(`Google Translate API Hatası: ${msg}`)
      }

      const data: any = await res.json()
      return data.data?.translations?.[0]?.translatedText || text
    } else {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        targetLang
      )}&dt=t&q=${encodeURIComponent(text)}`

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error(`Google Translate bağlantı hatası: HTTP ${res.status}`)
      }

      const data: any = await res.json()
      if (Array.isArray(data) && Array.isArray(data[0])) {
        return data[0].map((item: any) => item[0]).join('')
      }
      return text
    }
  })
}

