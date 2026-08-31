import { AdminPageEditorPage } from './AdminPageEditorPage';

export function AdminHomePage() {
  // Reutiliza o Page Builder existente apontando para a home (pageKey="home")
  return <AdminPageEditorPage pageKey="home" />;
}
