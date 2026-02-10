import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAdmin } from '../lib/auth/RequireAdmin'
import { AdminArticlesPage } from '../pages/admin/AdminArticlesPage'
import { AdminArticleEditPage } from '../pages/admin/AdminArticleEditPage'
import { AdminArticleNewPage } from '../pages/admin/AdminArticleNewPage'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage'
import { AdminNotFoundPage } from '../pages/admin/AdminNotFoundPage'
import { ArticlePage } from '../pages/public/ArticlePage'
import { AboutPage } from '../pages/public/AboutPage'
import { DisclaimerPage } from '../pages/public/DisclaimerPage'
import { DeveloperAuthorshipRequestPage } from '../pages/public/DeveloperAuthorshipRequestPage'
import { HomePage } from '../pages/public/HomePage'
import { NotFoundPage } from '../pages/public/NotFoundPage'
import { SearchPage } from '../pages/public/SearchPage'
import { SupportPage } from '../pages/public/SupportPage'
import { UsageRightsPage } from '../pages/public/UsageRightsPage'
import { AdminLayout } from '../ui/layout/AdminLayout'
import { PublicLayout } from '../ui/layout/PublicLayout'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/text/:slug', element: <ArticlePage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/kullanim-haklari', element: <UsageRightsPage /> },
      { path: '/sorumluluk-reddi', element: <DisclaimerPage /> },
      { path: '/destekle', element: <SupportPage /> },
      { path: '/gelistirici-yazarlik-talebi', element: <DeveloperAuthorshipRequestPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      { path: 'articles', element: <AdminArticlesPage /> },
      { path: 'articles/new', element: <AdminArticleNewPage /> },
      { path: 'articles/:id/edit', element: <AdminArticleEditPage /> },
      { path: '', element: <Navigate to="/admin/articles" replace /> },
      { path: '*', element: <AdminNotFoundPage /> },
    ],
  },
])
