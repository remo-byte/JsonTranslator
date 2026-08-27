/**
 * TranslationService — Çoklu Çeviri Motoru Orkestratörü (Strategy Pattern Context).
 * - Yer tutucuları (%s, %user, <b> vb.) XML etiketleriyle maskeleyerek kod değişkenlerini korur.
 * - Seçili sağlayıcıya (Google / DeepL / Gelecekte OpenAI vb.) göre çeviriyi yürütür (Strategy Pattern).
 * - Çağrıları Electron IPC köprüsü üzerinden Node.js backend'ine ileterek CORS engelini aşar.
 */

import { PlaceholderParser } from '../core/PlaceholderParser'
import { ElectronBridge } from '../bridge/ElectronBridge'
import { ITranslationProvider } from './providers/ITranslationProvider'
import { GoogleProvider } from './providers/GoogleProvider'
import { DeepLProvider } from './providers/DeepLProvider'

export type MTProvider = 'google' | 'deepl'

export interface MTSettings {
  provider: MTProvider
  deeplApiKey: string
  googleApiKey: string
  targetLang: string
}

const DEFAULT_SETTINGS: MTSettings = {
  provider: 'google',
  deeplApiKey: '',
  googleApiKey: '',
  targetLang: 'tr',
}

const STORAGE_KEY = 'jt_mt_settings'

export class TranslationService {
  private parser: PlaceholderParser
  private bridge: ElectronBridge
  private settings: MTSettings
  private providers = new Map<MTProvider, ITranslationProvider>()

  constructor() {
    this.parser = new PlaceholderParser()
    this.bridge = new ElectronBridge()
    this.settings = this.loadSettings()

    // Strateji Sağlayıcılarını Kaydet (Open-Closed Principle)
    this.registerProvider(new GoogleProvider())
    this.registerProvider(new DeepLProvider())
  }

  /** Yeni bir çeviri sağlayıcısı ekler */
  registerProvider(provider: ITranslationProvider): void {
    this.providers.set(provider.id as MTProvider, provider)
  }

  /** Kayıtlı sağlayıcıyı getirir */
  getProvider(id: MTProvider): ITranslationProvider | undefined {
    return this.providers.get(id)
  }

  getSettings(): MTSettings {
    return { ...this.settings }
  }

  saveSettings(newSettings: Partial<MTSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    } catch {
      // ignore
    }
  }

  private loadSettings(): MTSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_SETTINGS }
  }

  /**
   * Kaynak metni seçili strateji sağlayıcısı ile hedef dile çevirir.
   */
  async translate(text: string, targetLang?: string): Promise<string> {
    const trimmed = text.trim()
    if (!trimmed) return ''

    const target = (targetLang || this.settings.targetLang || 'tr').toLowerCase()

    // 1. Yer tutucuları ve kod etiketlerini korumaya al (%s, %user, <b> vb.)
    const { maskedText, placeholders } = this.protectPlaceholders(trimmed)

    // 2. Aktif strateji sağlayıcısını bul ve çevir
    const provider = this.getProvider(this.settings.provider) ?? this.getProvider('google')!
    const apiKey = this.settings.provider === 'deepl'
      ? this.settings.deeplApiKey.trim()
      : this.settings.googleApiKey.trim()

    const translated = await provider.translate(maskedText, target, apiKey, this.bridge)

    // 3. Yer tutucuları orijinal değerleriyle geri yerleştir
    const restored = this.restorePlaceholders(translated, placeholders)
    return restored
  }

  /**
   * Yer tutucuları (%s, %user, <b>) XML etiketlerine dönüştürür.
   */
  private protectPlaceholders(text: string): {
    maskedText: string
    placeholders: string[]
  } {
    const tokens = this.parser.tokenize(text)
    const placeholders: string[] = []
    let maskedText = ''

    for (const token of tokens) {
      if (token.type === 'text') {
        maskedText += token.value
      } else {
        const id = placeholders.length
        placeholders.push(token.value)
        maskedText += `<ph id="${id}"/>`
      }
    }

    return { maskedText, placeholders }
  }

  /**
   * XML etiketlerini orijinal yer tutucu değerleriyle geri değiştirir.
   */
  private restorePlaceholders(text: string, placeholders: string[]): string {
    let restored = text
    for (let i = 0; i < placeholders.length; i++) {
      const orig = placeholders[i]
      const reg = new RegExp(`<\\s*ph\\s+id\\s*=\\s*["']?${i}["']?\\s*\\/?>`, 'gi')
      restored = restored.replace(reg, orig)
    }
    return restored
  }
}
