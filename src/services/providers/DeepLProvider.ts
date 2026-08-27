/**
 * DeepLProvider — DeepL API Sağlayıcısı.
 * ITranslationProvider strateji arayüzünü uygular.
 */

import { ITranslationProvider } from './ITranslationProvider'
import { ElectronBridge } from '../../bridge/ElectronBridge'

export class DeepLProvider implements ITranslationProvider {
  readonly id = 'deepl'
  readonly name = 'DeepL API'

  async translate(
    text: string,
    targetLang: string,
    apiKey: string,
    bridge: ElectronBridge
  ): Promise<string> {
    if (!apiKey) {
      throw new Error('DeepL API anahtarı girilmemiş. Lütfen Ayarlar panelinden DeepL API Key ekleyin.')
    }
    return bridge.translateDeepL(apiKey, text, targetLang)
  }
}
