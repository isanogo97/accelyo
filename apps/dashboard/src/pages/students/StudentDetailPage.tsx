/**
 * Detail d'un etudiant: infos + actions sur sa carte (dont Google Wallet).
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ['students', id],
    queryFn: async () => {
      const r = await api.get(`/students/${id}`);
      return r.data.data;
    },
    enabled: !!id,
  });

  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const addToGoogleWallet = async () => {
    if (!id) return;
    setWalletLoading(true);
    setWalletError(null);
    try {
      const r = await api.get(`/wallet/google/${id}`);
      const url = r.data.data.saveUrl as string;
      window.open(url, '_blank', 'noopener');
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setWalletError(
        e.response?.data?.error?.message ??
          'Impossible de generer le lien Google Wallet.',
      );
    } finally {
      setWalletLoading(false);
    }
  };

  if (isLoading || !data) return <div>Chargement...</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">
        {data.firstName} {data.lastName}
      </h1>
      <div className="card p-6 space-y-2 text-sm">
        <div>
          <strong>Numero etudiant:</strong>{' '}
          <span className="font-mono">{data.studentNumber}</span>
        </div>
        <div>
          <strong>Email:</strong> {data.email}
        </div>
        <div>
          <strong>Promotion:</strong> {data.enrollmentYear}
        </div>
        <div>
          <strong>Programme:</strong> {data.program ?? '-'}
        </div>
      </div>

      <div className="card p-6 mt-4 space-y-3">
        <h2 className="text-lg font-medium">Carte dans le Wallet</h2>
        <p className="text-sm text-slate-600">
          Generez le lien pour ajouter la carte de l'etudiant dans Google
          Wallet (la carte doit avoir ete emise).
        </p>
        <button
          type="button"
          onClick={addToGoogleWallet}
          disabled={walletLoading}
          className="btn-primary disabled:opacity-50"
        >
          {walletLoading ? 'Generation...' : 'Ajouter a Google Wallet'}
        </button>
        {walletError ? (
          <div className="text-red-600 text-sm">{walletError}</div>
        ) : null}
      </div>
    </div>
  );
}
