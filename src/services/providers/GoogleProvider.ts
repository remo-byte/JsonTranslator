/**
 * GoogleProvider — Google Translate Sağlayıcısı.
 * ITranslationProvider strateji arayüzünü uygular.
 */

import { ITranslationProvider } from './ITranslationProvider'
import { ElectronBridge } from '../../bridge/ElectronBridge'

export class GoogleProvider implements ITranslationProvider {
  readonly id = 'google'
  readonly name = 'Google Translate'

  async translate(
    text: string,
    targetLang: string,
    apiKey: string,
    bridge: ElectronBridge
  ): Promise<string> {
    return bridge.translateGoogle(apiKey, text, targetLang)
  }
}
