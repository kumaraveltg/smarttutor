import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import AdminLayout from '../components/layout/AdminLayout'
import AdminListPage from '../pages/admin/AdminListPage'
import AdminFormPage from '../pages/admin/AdminFormPage'
import PracticeLayout from '../components/layout/PracticeLayout'
import ChatPage from '../pages/practice/ChatPage'
import RequireRole from '../auth/RequireRole'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        // element={
        //  <RequireRole roles={['admin', 'teacher']}>
        //     <AdminLayout />
        //   </RequireRole>
        // } 
      >
        <Route index element={<Navigate to="users" replace />} />
        <Route path=":entityKey" element={<AdminListPage />} />
        <Route path=":entityKey/:id" element={<AdminFormPage />} />
      </Route>

      <Route
        path="/practice"
        // element={
        //   <RequireRole roles={['student']}>
        //     <PracticeLayout />
        //   </RequireRole>
        // }
      >
        <Route index element={<ChatPage />} />
      </Route>

      
      <Route path="/" element={<Navigate to="/login" replace />} /> 
    </Routes>
  )
}
