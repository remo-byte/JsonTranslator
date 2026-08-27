/**
 * ITranslationProvider — Çeviri Motorları İçin Strateji Arayüzü (Strategy Pattern).
 * Open-Closed Principle (OCP) uyarınca yeni çeviri motorlarının (Google, DeepL, OpenAI vb.)
 * mevcut kodu değiştirmeden kolayca sisteme eklenmesini sağlar.
 */

import { ElectronBridge } from '../../bridge/ElectronBridge'

export interface ITranslationProvider {
  readonly id: string
  readonly name: string

  /**
   * Belirtilen metni hedef dile çevirir.
   * @param text Çevrilecek metin (yer tutucuları maskelenmiş olabilir)
   * @param targetLang Hedef dil kodu (örn: 'tr', 'en', 'de')
   * @param apiKey İlgili sağlayıcı için kayıtlı API anahtarı (varsa)
   * @param bridge Electron / Tarayıcı IPC köprüsü
   */
  translate(
    text: string,
    targetLang: string,
    apiKey: string,
    bridge: ElectronBridge
  ): Promise<string>
}
