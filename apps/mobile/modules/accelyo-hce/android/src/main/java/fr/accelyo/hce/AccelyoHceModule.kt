package fr.accelyo.hce

import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Module Expo (pont JS <-> natif) pour piloter le service HCE Accelyo.
 *   - isSupported(): l'appareil gere-t-il le HCE NFC ?
 *   - setCard(payload): arme la carte (valeur renvoyee au lecteur au tap).
 *   - clear(): desarme (deconnexion / suspension).
 *   - isEnabled(): une carte est-elle armee ?
 */
class AccelyoHceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AccelyoHce")

    Function("isSupported") {
      val ctx = appContext.reactContext ?: return@Function false
      val hasHce = ctx.packageManager
        .hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)
      val adapter = NfcAdapter.getDefaultAdapter(ctx)
      hasHce && adapter != null
    }

    Function("setCard") { payload: String ->
      val ctx = appContext.reactContext ?: throw IllegalStateException("Contexte indisponible")
      CardStore.write(ctx, payload)
    }

    Function("clear") {
      val ctx = appContext.reactContext ?: return@Function
      CardStore.write(ctx, null)
    }

    Function("isEnabled") {
      val ctx = appContext.reactContext ?: return@Function false
      CardStore.read(ctx) != null
    }
  }
}
