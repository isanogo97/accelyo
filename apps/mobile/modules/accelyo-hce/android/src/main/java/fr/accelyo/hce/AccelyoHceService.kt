package fr.accelyo.hce

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

/**
 * Service HCE Accelyo. Repond aux APDU envoyes par les lecteurs Elatec
 * (mode lecteur ISO 14443-4). Protocole: cf. docs/NFC_HCE_PROTOCOL.md.
 *
 *   - SELECT AID (00 A4 04 00 ..)  -> 90 00
 *   - READ      (80 CA 00 00 ..)   -> <tapPayload UTF-8> 90 00
 *   - inconnu                       -> 6D 00
 *   - pas de carte active           -> 6A 88
 *
 * NE PAS changer ce format sans re-provisionner les lecteurs Elatec.
 */
class AccelyoHceService : HostApduService() {

  companion object {
    private val SELECT_HEADER = byteArrayOf(0x00, 0xA4.toByte(), 0x04, 0x00)
    private val READ_HEADER = byteArrayOf(0x80.toByte(), 0xCA.toByte(), 0x00, 0x00)
    private val SW_OK = byteArrayOf(0x90.toByte(), 0x00)
    private val SW_NOT_FOUND = byteArrayOf(0x6A, 0x88.toByte())
    private val SW_INS_NOT_SUPPORTED = byteArrayOf(0x6D.toByte(), 0x00)

    private fun startsWith(apdu: ByteArray, header: ByteArray): Boolean {
      if (apdu.size < header.size) return false
      for (i in header.indices) if (apdu[i] != header[i]) return false
      return true
    }
  }

  override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
    val apdu = commandApdu ?: return SW_INS_NOT_SUPPORTED

    // 1) SELECT de notre AID -> l'OS a deja route vers ce service: on accepte.
    if (startsWith(apdu, SELECT_HEADER)) {
      return SW_OK
    }

    // 2) Lecture de la carte -> on renvoie le tap payload (card_uid / token compact).
    if (startsWith(apdu, READ_HEADER)) {
      val payload = CardStore.read(applicationContext) ?: return SW_NOT_FOUND
      return payload.toByteArray(Charsets.UTF_8) + SW_OK
    }

    return SW_INS_NOT_SUPPORTED
  }

  override fun onDeactivated(reason: Int) {
    // Rien a nettoyer: le payload reste pret pour le prochain tap tant que
    // l'app ne l'a pas efface (stopHCE / deconnexion).
  }
}
