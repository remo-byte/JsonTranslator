/**
 * Validator — validate_translation.py kurallarını TypeScript'te uygular.
 * 1. Yer tutucu sıraları (%s, %user, vb.)
 * 2. Etiket frekansları (multiset <b>...</b>)
 * 3. Sözlük Terim Tutarlılık Denetimi (Glossary QA)
 * 4. Uzunluk uyarısı
 * Mesajlar i18n üzerinden dil bağımsız üretilir.
 */

import { PlaceholderParser } from './PlaceholderParser'
import { DictionaryStore } from '../store/DictionaryStore'
import { t } from '../i18n/i18n'

export type ValidationLevel = 'ok' | 'warning' | 'error'

export interface ValidationResult {
  level: ValidationLevel
  messages: string[]
}

export class Validator {
  private parser: PlaceholderParser
  private dictionaryStore: DictionaryStore | null = null

  constructor(dictionaryStore?: DictionaryStore) {
    this.parser = new PlaceholderParser()
    if (dictionaryStore) this.dictionaryStore = dictionaryStore
  }

  setDictionaryStore(store: DictionaryStore): void {
    this.dictionaryStore = store
  }

  validate(source: string, translation: string): ValidationResult {
    if (translation.trim() === '') {
      return { level: 'ok', messages: [] }
    }

    const messages: string[] = []
    let level: ValidationLevel = 'ok'

    // 1. Yer tutucu sıralı eşleşme
    const srcP = this.parser.extractPlaceholders(source)
    const dstP = this.parser.extractPlaceholders(translation)

    if (JSON.stringify(srcP) !== JSON.stringify(dstP)) {
      messages.push(
        `${t('placeholderMismatch')} [${srcP.join(', ')}] ${t('placeholderArrow')} [${dstP.join(', ')}]`
      )
      level = 'error'
    }

    // 2. Etiket eşleşme (Multiset / Frekans sayımı ile eksik ve fazla etiketleri kontrol et)
    const srcTags = this.parser.extractTags(source)
    const dstTags = this.parser.extractTags(translation)

    const srcTagCounts = new Map<string, number>()
    for (const tag of srcTags) {
      srcTagCounts.set(tag, (srcTagCounts.get(tag) || 0) + 1)
    }

    const dstTagCounts = new Map<string, number>()
    for (const tag of dstTags) {
      dstTagCounts.set(tag, (dstTagCounts.get(tag) || 0) + 1)
    }

    const missingTags: string[] = []
    const extraTags: string[] = []

    // Eksik etiketler (kaynakta olup hedefte eksik kalanlar)
    for (const [tag, srcCount] of srcTagCounts) {
      const dstCount = dstTagCounts.get(tag) || 0
      if (dstCount < srcCount) {
        const diff = srcCount - dstCount
        for (let i = 0; i < diff; i++) {
          missingTags.push(tag)
        }
      }
    }

    // Fazla etiketler (hedefte kaynakta olduğundan daha fazla olanlar)
    for (const [tag, dstCount] of dstTagCounts) {
      const srcCount = srcTagCounts.get(tag) || 0
      if (dstCount > srcCount) {
        const diff = dstCount - srcCount
        for (let i = 0; i < diff; i++) {
          extraTags.push(tag)
        }
      }
    }

    if (missingTags.length > 0 || extraTags.length > 0) {
      if (missingTags.length > 0) messages.push(`${t('missingTag')} ${missingTags.join(', ')}`)
      if (extraTags.length > 0) messages.push(`${t('extraTag')} ${extraTags.join(', ')}`)
      level = 'error'
    }

    // 3. Sözlük Terim Tutarlılık Denetimi (Glossary QA)
    if (this.dictionaryStore) {
      const glossaryMatches = this.dictionaryStore.findMatches(source)
      const transLower = translation.toLowerCase()

      for (const term of glossaryMatches) {
        const targetLower = term.target.toLowerCase()
        if (!transLower.includes(targetLower)) {
          messages.push(`${t('missingGlossaryTerm')}: "${term.source}" → "${term.target}"`)
          if (level === 'ok') level = 'warning'
        }
      }
    }

    // 4. Uzunluk uyarısı
    if (level === 'ok' && translation.length > source.length + 8) {
      messages.push(`${t('lengthWarning')} ${translation.length - source.length} ${t('lengthWarningChars')}`)
      level = 'warning'
    }

    return { level, messages }
  }
}
