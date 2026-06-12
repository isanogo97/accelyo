package fr.accelyo.hce

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Stockage CHIFFRE (EncryptedSharedPreferences, AES-256) du "tap payload"
 * de la carte, partage entre le module JS (ecriture) et le service HCE (lecture).
 * Le service HCE tourne dans son propre cycle de vie (declenche par l'OS au tap),
 * il lit donc la valeur ici plutot que via un pont JS en direct.
 */
object CardStore {
  private const val FILE = "accelyo_hce_secure"
  private const val KEY_PAYLOAD = "tapPayload"

  private fun prefs(ctx: Context) = EncryptedSharedPreferences.create(
    ctx,
    FILE,
    MasterKey.Builder(ctx).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
  )

  fun write(ctx: Context, value: String?) {
    val editor = prefs(ctx).edit()
    if (value.isNullOrEmpty()) editor.remove(KEY_PAYLOAD) else editor.putString(KEY_PAYLOAD, value)
    editor.apply()
  }

  fun read(ctx: Context): String? = prefs(ctx).getString(KEY_PAYLOAD, null)
}
