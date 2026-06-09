/**
 * Parametres du compte courant: changement de mot de passe + activation MFA.
 */
import { useState } from 'react';
import { api } from '../../api/client';

export function SettingsPage() {
  // ----- MFA -----
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

  // ----- Changement de mot de passe -----
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (next !== confirm) {
      setPwError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (next.length < 12) {
      setPwError('Le nouveau mot de passe doit faire au moins 12 caracteres.');
      return;
    }
    setPwLoading(true);
    try {
      await api.post('/auth/password', {
        currentPassword: current,
        newPassword: next,
      });
      setPwSuccess(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err: unknown) {
      const e2 = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setPwError(
        e2.response?.data?.error?.message ??
          'Echec du changement de mot de passe.',
      );
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Parametres</h1>

      {/* Mot de passe */}
      <form onSubmit={changePassword} className="card p-6 space-y-3 max-w-md">
        <h2 className="text-lg font-medium">Changer mon mot de passe</h2>
        <p className="text-sm text-slate-600">
          Minimum 12 caracteres, avec majuscule, minuscule, chiffre et
          caractere special.
        </p>
        <input
          className="input w-full"
          type="password"
          autoComplete="current-password"
          placeholder="Mot de passe actuel"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <input
          className="input w-full"
          type="password"
          autoComplete="new-password"
          placeholder="Nouveau mot de passe"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
        <input
          className="input w-full"
          type="password"
          autoComplete="new-password"
          placeholder="Confirmer le nouveau mot de passe"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {pwError ? <div className="text-red-600 text-sm">{pwError}</div> : null}
        {pwSuccess ? (
          <div className="text-green-600 text-sm">
            Mot de passe mis a jour avec succes.
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pwLoading || !current || !next || !confirm}
          className="btn-primary disabled:opacity-50"
        >
          {pwLoading ? 'Mise a jour...' : 'Mettre a jour'}
        </button>
      </form>

      {/* MFA */}
      <div className="card p-6 space-y-3 max-w-md">
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
