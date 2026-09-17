import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import AdminLayout from '../components/layout/AdminLayout'
import PracticeLayout from '../components/layout/PracticeLayout'
import ChatPage from '../pages/practice/ChatPage'
// import RequireRole from '../auth/RequireRole'

import UsersListPage from '../pages/admin/UsersListPage'
import UsersFormPage from '../pages/admin/UsersFormPage'
import RolesListPage from '../pages/admin/RolesListPage'
import RolesFormPage from '../pages/admin/RolesFormPage'
import LovListPage from '../pages/admin/LovListPage'
import LovFormPage from '../pages/admin/LovFormPage'
import ChapterListPage from '../pages/admin/ChapterListPage'
import ChapterFormPage from '../pages/admin/ChapterFormPage'
import SubchapterListPage from '../pages/admin/SubchapterListPage'
import SubchapterFormPage from '../pages/admin/SubchapterFormPage'
import QuestionsListPage from '../pages/admin/QuestionsListPage'
import QuestionsFormPage from '../pages/admin/QuestionsFormPage'
import AnswersListPage from '../pages/admin/AnswersListPage'
import AnswersFormPage from '../pages/admin/AnswersFormPage'
import ProfilePage from '../pages/ProfilePage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={<AdminLayout />}
        // Once auth is wired back in:
        // element={<RequireRole roles={['admin', 'teacher']}><AdminLayout /></RequireRole>}
      >
        <Route path="profile" element={<ProfilePage />} />
        <Route index element={<Navigate to="users" replace />} />

        <Route path="users" element={<UsersListPage />} />
        <Route path="users/:id" element={<UsersFormPage />} />

        <Route path="roles" element={<RolesListPage />} />
        <Route path="roles/:id" element={<RolesFormPage />} />

        <Route path="lov" element={<LovListPage />} />
        <Route path="lov/:id" element={<LovFormPage />} />

        <Route path="chapter" element={<ChapterListPage />} />
        <Route path="chapter/:id" element={<ChapterFormPage />} />

        <Route path="subchapter" element={<SubchapterListPage />} />
        <Route path="subchapter/:id" element={<SubchapterFormPage />} />

        <Route path="questions" element={<QuestionsListPage />} />
        <Route path="questions/:id" element={<QuestionsFormPage />} />

        <Route path="answers" element={<AnswersListPage />} />
        <Route path="answers/:id" element={<AnswersFormPage />} />
      </Route>

      <Route
        path="/practice"
        element={<PracticeLayout />}
        // element={<RequireRole roles={['student']}><PracticeLayout /></RequireRole>}
      >
        <Route index element={<ChatPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
