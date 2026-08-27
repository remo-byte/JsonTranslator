/**
 * JsonMerger — Akıllı ve Çift Yönlü JSON Güncelleme & Birleştirme Motoru.
 * 1. Birebir Anahtar Eşleşmesi (Exact Key Match): Mevcut projede var olan anahtarlar (çevrilmiş veya çevrilmemiş) aynen korunur.
 * 2. Yeniden Adlandırılmış Anahtar Eşleşmesi (Renamed Key Match): Anahtarı değişmiş ama kaynak metni aynı olan çeviriler kurtarılır.
 * 3. Benzerlik Eşleşmesi (Fuzzy Match - %80+): Ufak güncellemeler taslak olarak aktarılır.
 * 4. Gerçekten Yeni Eklenenler (Brand New): Projede daha önce hiç bulunmayan yeni anahtarlar.
 * 5. Kaldırılanlar (Removed): Yeni sürümden çıkarılmış eski anahtarlar.
 */

import { TranslationEntry } from '../store/TranslationStore'

export type MergeMatchType = 'exact' | 'renamed' | 'fuzzy' | 'new'

export interface MergeEntryDetail {
  key: string
  source: string
  translation: string
  matchType: MergeMatchType
  matchedFromKey?: string
  similarity?: number
}

export interface MergeStats {
  exactCount: number
  renamedCount: number
  fuzzyCount: number
  newCount: number
  removedCount: number
  totalNew: number
}

export interface MergeResult {
  entries: TranslationEntry[]
  stats: MergeStats
  details: MergeEntryDetail[]
}

export class JsonMerger {
  /**
   * İki JSON içeriğini akıllıca birleştirir.
   * @param currentEntries Mevcut projede açık olan girdiler
   * @param incomingJsonContent İçe aktarılan / birleştirilen yeni sürüm JSON metni
   */
  static merge(
    currentEntries: TranslationEntry[],
    incomingJsonContent: string
  ): MergeResult {
    const incomingJson = JSON.parse(incomingJsonContent)
    if (typeof incomingJson !== 'object' || incomingJson === null || Array.isArray(incomingJson)) {
      throw new Error('Geçersiz JSON formatı. Birleştirilecek dosya bir nesne (key-value) olmalıdır.')
    }

    const incomingKeys = Object.keys(incomingJson)
    const incomingMap = new Map<string, string>()
    for (const k of incomingKeys) {
      incomingMap.set(k, String(incomingJson[k] ?? ''))
    }

    const currentMap = new Map<string, string>()
    for (const e of currentEntries) {
      currentMap.set(e.key, e.value)
    }

    // Hedef anahtar kümesi (incoming dosyanın yapısı esas alınır)
    const targetKeys = incomingKeys.length > 0 ? incomingKeys : currentEntries.map(e => e.key)

    // Çevirisi dolu olan eski kayıtlar havuzu (Renamed / Fuzzy kurtarma için)
    const oldTranslatedEntries = currentEntries.filter(
      e => e.value && e.value.trim() && e.value.trim() !== e.key.trim()
    )

    const usedOldKeys = new Set<string>()
    const mergedEntries: TranslationEntry[] = []
    const details: MergeEntryDetail[] = []

    let exactCount = 0
    let renamedCount = 0
    let fuzzyCount = 0
    let newCount = 0

    // ─────────────────────────────────────────────────────────────
    // 1. AŞAMA: Birebir Anahtar Eşleşmesi (Exact Key Match)
    // Projede zaten var olan anahtarlar (çevrilmiş veya çevrilmemiş)
    // ─────────────────────────────────────────────────────────────
    const candidateNewKeys: string[] = []

    for (const key of targetKeys) {
      if (currentMap.has(key)) {
        // Anahtar zaten projede mevcut!
        const currentVal = currentMap.get(key)?.trim() || ''
        const incomingVal = incomingMap.get(key)?.trim() || ''

        // Çeviriyi belirle (Önce mevcut çeviri, yoksa incoming dosyasındaki çeviri)
        let chosenVal = ''
        if (currentVal && currentVal !== key) {
          chosenVal = currentVal
        } else if (incomingVal && incomingVal !== key) {
          chosenVal = incomingVal
        }

        mergedEntries.push({
          key,
          value: chosenVal,
          dirty: false,
        })
        usedOldKeys.add(key)
        exactCount++
        details.push({
          key,
          source: key,
          translation: chosenVal,
          matchType: 'exact',
        })
      } else {
        // Projede daha önce bulunmayan anahtar
        candidateNewKeys.push(key)
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Kullanılmayan ve çevirisi dolu eski kayıtlar havuzu
    // (Anahtar ismi değiştiyse veya ufak düzenleme yapıldıysa kurtarmak için)
    // ─────────────────────────────────────────────────────────────
    const availableOldPool = oldTranslatedEntries.filter(e => !usedOldKeys.has(e.key))

    // ─────────────────────────────────────────────────────────────
    // 2. AŞAMA: Yeniden Adlandırılmış Anahtar Eşleşmesi (Renamed Key Match)
    // ─────────────────────────────────────────────────────────────
    const remainingNewKeys: string[] = []

    for (const key of candidateNewKeys) {
      const incomingVal = incomingMap.get(key) || key
      const keyLower = key.trim().toLowerCase()
      const valLower = incomingVal.trim().toLowerCase()

      // Eski havuzda aynı metne sahip olan var mı?
      const candidateIdx = availableOldPool.findIndex(
        old => !usedOldKeys.has(old.key) && (
          old.key.trim().toLowerCase() === keyLower ||
          old.key.trim().toLowerCase() === valLower
        )
      )

      if (candidateIdx >= 0) {
        const candidate = availableOldPool[candidateIdx]
        mergedEntries.push({
          key,
          value: candidate.value,
          dirty: true,
        })
        usedOldKeys.add(candidate.key)
        availableOldPool.splice(candidateIdx, 1)
        renamedCount++
        details.push({
          key,
          source: key,
          translation: candidate.value,
          matchType: 'renamed',
          matchedFromKey: candidate.key,
        })
      } else {
        remainingNewKeys.push(key)
      }
    }

    // ─────────────────────────────────────────────────────────────
    // 3. AŞAMA: Benzerlik Eşleşmesi (Fuzzy Match - %80+)
    // ─────────────────────────────────────────────────────────────
    for (const key of remainingNewKeys) {
      const incomingVal = incomingMap.get(key) || key
      let bestMatch: { entry: TranslationEntry; idx: number; score: number } | null = null

      for (let i = 0; i < availableOldPool.length; i++) {
        const old = availableOldPool[i]
        if (usedOldKeys.has(old.key)) continue

        const score = this.calculateSimilarity(incomingVal, old.key)
        if (score >= 0.80) {
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { entry: old, idx: i, score }
          }
        }
      }

      if (bestMatch) {
        mergedEntries.push({
          key,
          value: bestMatch.entry.value,
          dirty: true,
        })
        usedOldKeys.add(bestMatch.entry.key)
        availableOldPool.splice(bestMatch.idx, 1)
        fuzzyCount++
        details.push({
          key,
          source: key,
          translation: bestMatch.entry.value,
          matchType: 'fuzzy',
          matchedFromKey: bestMatch.entry.key,
          similarity: Math.round(bestMatch.score * 100),
        })
      } else {
        // ─────────────────────────────────────────────────────────
        // 4. AŞAMA: Gerçekten Tamamen Yeni Eklenen Anahtar (Brand New Key)
        // ─────────────────────────────────────────────────────────
        mergedEntries.push({
          key,
          value: '',
          dirty: false,
        })
        newCount++
        details.push({
          key,
          source: key,
          translation: '',
          matchType: 'new',
        })
      }
    }

    // Kaldırılan eski anahtar sayısı (Mevcut dosyada olup yeni dosyada olmayanlar)
    const removedCount = currentEntries.filter(e => !incomingMap.has(e.key)).length

    return {
      entries: mergedEntries,
      stats: {
        exactCount,
        renamedCount,
        fuzzyCount,
        newCount,
        removedCount,
        totalNew: targetKeys.length,
      },
      details,
    }
  }

  /**
   * İki metin arasındaki benzerlik oranını hesaplar (Sørensen-Dice Bigram katsayısı).
   */
  static calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.trim().toLowerCase()
    const s2 = str2.trim().toLowerCase()

    if (s1 === s2) return 1.0
    if (s1.length < 2 || s2.length < 2) return 0.0

    const getBigrams = (str: string) => {
      const bigrams = new Map<string, number>()
      for (let i = 0; i < str.length - 1; i++) {
        const bigram = str.slice(i, i + 2)
        bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1)
      }
      return bigrams
    }

    const b1 = getBigrams(s1)
    const b2 = getBigrams(s2)

    let intersection = 0
    for (const [bigram, count1] of b1) {
      const count2 = b2.get(bigram) || 0
      intersection += Math.min(count1, count2)
    }

    const totalBigrams = (s1.length - 1) + (s2.length - 1)
    return totalBigrams > 0 ? (2.0 * intersection) / totalBigrams : 0.0
  }
}
