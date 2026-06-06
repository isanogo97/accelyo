/**
 * Configuration des routes du dashboard.
 * ----------------------------------------------------------------
 * Strategie:
 *   - /login et /mfa sont publiques.
 *   - Tout le reste est dans <ProtectedLayout> qui verifie le token.
 *   - Si token absent ou expire, redirection /login.
 */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/auth/LoginPage';
import { MFAPage } from './pages/auth/MFAPage';
import { ProtectedLayout } from './components/ProtectedLayout';
import { OverviewPage } from './pages/overview/OverviewPage';
import { StudentsListPage } from './pages/students/StudentsListPage';
import { StudentDetailPage } from './pages/students/StudentDetailPage';
import { CardsPage } from './pages/cards/CardsPage';
import { ReadersPage } from './pages/readers/ReadersPage';
import { AuditPage } from './pages/audit/AuditPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { UniversitiesListPage } from './pages/universities/UniversitiesListPage';
import { UniversityDetailPage } from './pages/universities/UniversityDetailPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/mfa', element: <MFAPage /> },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: <OverviewPage /> },
      { path: 'students', element: <StudentsListPage /> },
      { path: 'students/:id', element: <StudentDetailPage /> },
      { path: 'cards', element: <CardsPage /> },
      { path: 'readers', element: <ReadersPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'universities', element: <UniversitiesListPage /> },
      { path: 'universities/:id', element: <UniversityDetailPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
