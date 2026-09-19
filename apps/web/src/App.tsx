import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import Sidebar from './components/layout/Sidebar';
import ToastContainer from './components/shared/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import Signin from './pages/auth/Signin';
import Signup from './pages/auth/Signup';
import ContactDetailPage from './pages/contacts/ContactDetail';
import Contacts from './pages/contacts/Contacts';
import CreateTag from './pages/contacts/CreateTag';
import NewContact from './pages/contacts/NewContact';
import Tags from './pages/contacts/Tags';
import CreateEmailTemplate from './pages/email-templates/CreateEmailTemplate';
import EmailTemplates from './pages/email-templates/EmailTemplates';
import Settings from './pages/settings/Settings';
import Tenants from './pages/tenant/Tenants';
import CreateWorkflow from './pages/workflow/CreateWorkflow';
import EditWorkflow from './pages/workflow/EditWorkflow';
import ExecutionSummary from './pages/workflow/ExecutionSummary';
import WorkflowBuilder from './pages/workflow/WorkflowBuilder';
import WorkflowContacts from './pages/workflow/WorkflowContacts';
import Workflows from './pages/workflow/Workflows';

const appRoutes = [
  { path: '*', element: <Navigate to="/workflows" /> },
  { path: '/workflows', element: <Workflows /> },
  { path: '/workflows/create', element: <CreateWorkflow /> },
  { path: '/workflows/:workflowId', element: <WorkflowBuilder /> },
  { path: '/workflows/:workflowId/edit', element: <EditWorkflow /> },
  { path: '/workflows/:workflowId/summary', element: <ExecutionSummary /> },
  { path: '/workflows/:workflowId/contacts', element: <WorkflowContacts /> },
  { path: '/contacts', element: <Contacts /> },
  { path: '/contacts/tags', element: <Tags /> },
  { path: '/contacts/tags/create', element: <CreateTag /> },
  { path: '/contacts/new', element: <NewContact /> },
  { path: '/contacts/:contactId', element: <ContactDetailPage /> },
  { path: '/email-templates', element: <EmailTemplates /> },
  { path: '/email-templates/create', element: <CreateEmailTemplate /> },
  { path: '/settings', element: <Settings /> },
];

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/signin" />;

  return children;
}

function TenantRoute({ children }: { children: React.ReactNode }) {
  const { currentTenant, isLoadingTenants } = useTenant();

  if (isLoadingTenants) return <div className="p-8">Loading workspace...</div>;
  if (!currentTenant) return <Navigate to="/" />;

  return children;
}

function MainLayout() {
  return (
    <div className="min-h-screen pl-[220px] bg-background">
      <Sidebar />
      <main className="p-6">
        <div className="max-w-5xl w-full mx-auto">
          <Routes>
            {appRoutes.map((route) => (
              <Route key={route.path} path={route.path} element={route.element} />
            ))}
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/signin" element={<Signin />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TenantProvider>
                  <Tenants />
                </TenantProvider>
              </ProtectedRoute>
            }
          />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <TenantProvider>
                  <TenantRoute>
                    <MainLayout />
                  </TenantRoute>
                </TenantProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
      <ToastContainer />
    </BrowserRouter>
  );
}
