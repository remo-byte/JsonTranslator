/**
 * BaseModal — Tüm Açılır Pencereler (Dialog/Modal) İçin Soyut Temel Sınıf.
 * OOP Kalıtım (Inheritance) ve DRY (Don't Repeat Yourself) prensiplerini uygular.
 * - Overlay yönetimi ve görünürlük kontrolü (open / close / isOpen)
 * - ESC tuşu ile otomatik kapanma
 * - Backdrop (arka plan) tıklaması ile kapanma
 * - Yaşam döngüsü kancaları (onOpen, onClose)
 * - Çoklu dil metin yenileme zorunluluğu (refreshTexts)
 */

export abstract class BaseModal {
  protected overlay: HTMLElement

  constructor(overlayId: string) {
    const el = document.getElementById(overlayId)
    if (!el) {
      throw new Error(`BaseModal: "${overlayId}" ID'li overlay elementi DOM'da bulunamadı.`)
    }
    this.overlay = el
    this.bindBaseEvents()
  }

  get isOpen(): boolean {
    return this.overlay.classList.contains('open')
  }

  open(): void {
    this.refreshTexts()
    this.onOpen()
    this.overlay.classList.add('open')
  }

  close(): void {
    if (!this.canClose()) return
    this.overlay.classList.remove('open')
    this.onClose()
  }

  /**
   * Modal açılmadan önce çalışacak alt sınıf kancası (override edilebilir).
   */
  protected onOpen(): void {}

  /**
   * Modal kapandıktan sonra çalışacak alt sınıf kancası (override edilebilir).
   */
  protected onClose(): void {}

  /**
   * Kapatma öncesi onay kontrolü (örn. çalışan işlem varsa engelleme).
   */
  protected canClose(): boolean {
    return true
  }

  /**
   * Dil paketleri değiştiğinde metinleri günceller (tüm alt sınıflar uygulamalıdır).
   */
  abstract refreshTexts(): void

  private bindBaseEvents(): void {
    // Backdrop'a (arka plana) tıklandığında kapat
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay && this.canClose()) {
        this.close()
      }
    })

    // ESC tuşuna basıldığında kapat
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen && this.canClose()) {
        this.close()
      }
    })
  }
}
