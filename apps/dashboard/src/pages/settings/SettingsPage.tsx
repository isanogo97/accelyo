/**
 * Configuration de l'universite + activation MFA pour le compte courant.
 */
import { useState } from 'react';
import { api } from '../../api/client';

export function SettingsPage() {
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const setupMfa = async () => {
    const { data } = await api.post('/auth/mfa/setup');
    setSecret(data.data.secret);
    setMfaQr(data.data.otpAuthUrl);
  };

  const confirmMfa = async () => {
    await api.post('/auth/mfa/confirm', { code });
    setConfirmed(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Parametres</h1>

      <div className="card p-6 space-y-3">
        <h2 className="text-lg font-medium">Authentification a deux facteurs</h2>
        <p className="text-sm text-slate-600">
          Active la MFA via Google Authenticator, Authy ou 1Password.
        </p>
        {!mfaQr ? (
          <button onClick={setupMfa} className="btn-primary">
            Activer la MFA
          </button>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-mono break-all bg-slate-50 p-2 rounded">
              {mfaQr}
            </div>
            <div className="text-xs text-slate-500">
              Secret: <span className="font-mono">{secret}</span>
            </div>
            <input
              className="input w-32"
              placeholder="Code 6 chiffres"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button onClick={confirmMfa} className="btn-primary ml-2">
              Confirmer
            </button>
            {confirmed ? (
              <div className="text-green-600 text-sm">MFA activee</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
