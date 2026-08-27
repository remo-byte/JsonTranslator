import { contextBridge, ipcRenderer } from 'electron'

/**
 * Renderer process'e güvenli IPC API'si sunar.
 * contextIsolation=true ile çalışır, nodeIntegration=false ile güvenlidir.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /** Native dosya aç diyaloğu — .json filtreli */
  openFile: (): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke('dialog:openFile'),

  /** Belirtilen dosya yolunu doğrudan oku */
  readFile: (filePath: string): Promise<{ path: string; content: string; error?: string } | null> =>
    ipcRenderer.invoke('fs:readFile', filePath),

  /** Mevcut dosyanın üzerine yaz */
  saveFile: (filePath: string, content: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('dialog:saveFile', filePath, content),

  /** Native "Farklı Kaydet" diyaloğu */
  saveFileAs: (content: string, defaultName: string): Promise<{ path: string } | null> =>
    ipcRenderer.invoke('dialog:saveFileAs', content, defaultName),

  /** Pencere başlığını güncelle */
  setTitle: (title: string): void =>
    ipcRenderer.send('set-title', title),

  /** DeepL ile çevir (Node.js backend üzerinden CORS engelsiz) */
  translateDeepL: (apiKey: string, text: string, targetLang: string): Promise<string> =>
    ipcRenderer.invoke('mt:translateDeepL', apiKey, text, targetLang),

  /** Google ile çevir (Node.js backend üzerinden) */
  translateGoogle: (apiKey: string, text: string, targetLang: string): Promise<string> =>
    ipcRenderer.invoke('mt:translateGoogle', apiKey, text, targetLang),
})

