/**
 * Detail d'un etudiant: infos + photo + actions sur sa carte (dont Google Wallet).
 */
import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  email: string;
  enrollmentYear: number | string;
  program: string | null;
  photoUrl?: string | null;
  photoHash?: string | null;
};

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['students', id],
    queryFn: async () => {
      const r = await api.get(`/students/${id}`);
      return r.data.data as Student;
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

      {/* Photo de l'etudiant */}
      <StudentPhotoCard
        studentId={id!}
        firstName={data.firstName}
        lastName={data.lastName}
        photoUrl={data.photoUrl ?? null}
        onUploaded={() =>
          qc.invalidateQueries({ queryKey: ['students', id] })
        }
      />

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

// Contraintes alignees sur l'API (multer + validation serveur).
const PHOTO_MAX_BYTES = 3 * 1024 * 1024; // 3 Mo
const PHOTO_ACCEPT = 'image/png,image/jpeg,image/webp';
const PHOTO_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/**
 * Valide une image cote client avant envoi.
 * Renvoie un message d'erreur lisible, ou null si le fichier est valide.
 */
function validatePhotoFile(file: File): string | null {
  if (!PHOTO_ALLOWED_TYPES.includes(file.type)) {
    return 'Format non supporte. Utilisez un fichier PNG, JPEG ou WebP.';
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return 'Fichier trop volumineux (3 Mo maximum).';
  }
  return null;
}

function initials(firstName: string, lastName: string): string {
  const a = firstName.trim().charAt(0).toUpperCase();
  const b = lastName.trim().charAt(0).toUpperCase();
  return (a + b) || '?';
}

/**
 * Section "Photo" de la fiche etudiant.
 * - apercu (vignette portrait) de photoUrl, ou initiales si null
 * - input file cache + bouton "Televerser une photo"
 * - validation client (type + taille) avant envoi
 * - FormData (champ "file"), Content-Type multipart laisse a axios
 * - etat chargement/erreur; au succes, apercu optimiste + invalidation
 */
function StudentPhotoCard(props: {
  studentId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Apercu pilote par photoUrl (rafraichi via invalidation), avec
  // fallback optimiste sur l'URL renvoyee a l'upload.
  const [preview, setPreview] = useState<string | null>(props.photoUrl);

  const handleFile = async (file: File) => {
    setError(null);
    const validationError = validatePhotoFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      // On ne force PAS Content-Type: axios pose la boundary multipart.
      const r = await api.post(
        `/students/${props.studentId}/photo`,
        form,
      );
      const url = r.data?.data?.photoUrl as string | undefined;
      if (url) setPreview(url);
      props.onUploaded();
    } catch (e) {
      const msg = (e as {
        response?: { data?: { error?: { message?: string } } };
      }).response?.data?.error?.message;
      setError(msg ?? "Echec de l'envoi. Reessayez.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card p-6 mt-4 space-y-3">
      <h2 className="text-lg font-medium">Photo</h2>
      <div className="flex items-center gap-4">
        <div className="h-28 w-24 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
          {preview ? (
            <img
              src={preview}
              alt={`Photo de ${props.firstName} ${props.lastName}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-2xl font-semibold text-slate-400">
              {initials(props.firstName, props.lastName)}
            </span>
          )}
        </div>
        <div className="space-y-1">
          <input
            ref={inputRef}
            type="file"
            accept={PHOTO_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              // Reset pour permettre de re-selectionner le meme fichier.
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="btn-primary disabled:opacity-50"
          >
            {uploading ? 'Envoi en cours...' : 'Televerser une photo'}
          </button>
          {error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <p className="text-xs text-slate-400">PNG, JPEG ou WebP - 3 Mo max.</p>
          )}
        </div>
      </div>
    </div>
  );
}
