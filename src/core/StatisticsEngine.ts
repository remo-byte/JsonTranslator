/**
 * StatisticsEngine — JSON Projesi Kelime, Karakter ve İlerleme Analiz Motoru.
 */

import { TranslationEntry } from '../store/TranslationStore'
import { Validator } from './Validator'

export interface ProjectStats {
  totalEntries: number
  translatedEntries: number
  untranslatedEntries: number
  errorEntries: number
  warningEntries: number
  progressPercent: number

  sourceWords: number
  translatedSourceWords: number
  remainingSourceWords: number
  targetWords: number

  sourceChars: number
  sourceCharsNoSpaces: number
  targetChars: number

  estimatedRemainingMinutes: number // ~25 kelime/dakika profesyonel hız
  topFrequentWords: Array<{ word: string; count: number }>
}

export class StatisticsEngine {
  private static STOP_WORDS = new Set([
    'the', 'and', 'to', 'of', 'a', 'in', 'is', 'that', 'for', 'it',
    'you', 'was', 'with', 'on', 'as', 'have', 'but', 'be', 'they',
    'bir', 've', 'bu', 'da', 'de', 'için', 'ile', 'ne', 'en', 'gibi',
    'daha', 'çok', 'var', 'yok', 'olan', 'olarak', 'kadar', 'bunu'
  ])

  static compute(entries: TranslationEntry[], validator?: Validator): ProjectStats {
    const totalEntries = entries.length
    let translatedEntries = 0
    let untranslatedEntries = 0
    let errorEntries = 0
    let warningEntries = 0

    let sourceWords = 0
    let translatedSourceWords = 0
    let remainingSourceWords = 0
    let targetWords = 0

    let sourceChars = 0
    let sourceCharsNoSpaces = 0
    let targetChars = 0

    const wordFrequency = new Map<string, number>()

    for (const entry of entries) {
      const src = entry.key || ''
      const tgt = entry.value || ''
      const isTranslated = tgt.trim().length > 0

      // Kaynak kelime ve karakter sayımları
      const srcWordsArr = this.extractWords(src)
      const srcWordCount = srcWordsArr.length
      sourceWords += srcWordCount
      sourceChars += src.length
      sourceCharsNoSpaces += src.replace(/\s+/g, '').length

      // Kelime frekansı analizi (küçük harfe çevirip temizle)
      for (const w of srcWordsArr) {
        const clean = w.toLowerCase()
        if (clean.length > 2 && !this.STOP_WORDS.has(clean) && !/^\d+$/.test(clean)) {
          wordFrequency.set(clean, (wordFrequency.get(clean) || 0) + 1)
        }
      }

      if (isTranslated) {
        translatedEntries++
        translatedSourceWords += srcWordCount

        const tgtWordsArr = this.extractWords(tgt)
        targetWords += tgtWordsArr.length
        targetChars += tgt.length

        if (validator) {
          const res = validator.validate(entry.key, entry.value)
          if (res.level === 'error') errorEntries++
          else if (res.level === 'warning') warningEntries++
        }
      } else {
        untranslatedEntries++
        remainingSourceWords += srcWordCount
      }
    }

    const progressPercent = totalEntries > 0
      ? Math.round((translatedEntries / totalEntries) * 1000) / 10
      : 0

    // Ortalama 25 kelime/dakika çeviri hızı
    const estimatedRemainingMinutes = Math.ceil(remainingSourceWords / 25)

    // En çok geçen 10 kelime
    const topFrequentWords = Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }))

    return {
      totalEntries,
      translatedEntries,
      untranslatedEntries,
      errorEntries,
      warningEntries,
      progressPercent,

      sourceWords,
      translatedSourceWords,
      remainingSourceWords,
      targetWords,

      sourceChars,
      sourceCharsNoSpaces,
      targetChars,

      estimatedRemainingMinutes,
      topFrequentWords,
    }
  }

  private static extractWords(text: string): string[] {
    if (!text) return []
    // Etiketleri ve yer tutucuları kaldırıp kelimeleri ayır
    const cleaned = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/%[a-zA-Z0-9_@$#]+/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()

    if (!cleaned) return []
    return cleaned.split(/\s+/).filter(Boolean)
  }
}
