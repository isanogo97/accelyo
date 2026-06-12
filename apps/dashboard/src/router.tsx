/**
 * Configuration des routes du dashboard.
 * ----------------------------------------------------------------
 * Le dashboard est servi sous le sous-chemin /app (le site vitrine
 * occupe la racine du domaine) -> basename: '/app'.
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
import { ContactRequestsPage } from './pages/contact/ContactRequestsPage';
import { ContentPage } from './pages/content/ContentPage';
import { TeamPage } from './pages/team/TeamPage';

export const router = createBrowserRouter(
  [
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
        { path: 'contact-requests', element: <ContactRequestsPage /> },
        { path: 'content', element: <ContentPage /> },
        { path: 'team', element: <TeamPage /> },
        { path: 'settings', element: <SettingsPage /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: '/app' },
);
