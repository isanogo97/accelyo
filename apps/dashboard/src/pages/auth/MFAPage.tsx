/**
 * Etape MFA - 6 chiffres.
 * Le challengeToken vient de /auth/login et expire en 5 minutes.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';

export function MFAPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const challengeToken = sessionStorage.getItem('accelyo:mfa');
    if (!challengeToken) {
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post('/auth/mfa/verify', {
        challengeToken,
        code,
      });
      setTokens(data.data);
      sessionStorage.removeItem('accelyo:mfa');
      navigate('/overview');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setError(e.response?.data?.error?.message ?? 'Code invalide');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={onSubmit} className="card w-full max-w-sm p-8 space-y-4">
        <h1 className="text-xl font-semibold text-center">Verification MFA</h1>
        <p className="text-sm text-slate-600">
          Entrez le code a 6 chiffres genere par votre application authenticator.
        </p>
        <input
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          className="input text-center tracking-widest text-lg"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        {error ? (
          <div className="text-sm text-red-600">{error}</div>
        ) : null}
        <button className="btn-primary w-full">Valider</button>
      </form>
    </div>
  );
}
