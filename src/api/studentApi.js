// ADJUST: import the same API helper your adminApi.js / practiceApi.js use.
import api from './client'

// Works whether your helper returns the axios response ({ data }) or the data itself.
const unwrap = (r) => (r && typeof r === 'object' && 'data' in r && 'status' in r ? r.data : r)

export const studentApi = {
  options: () => api.get('/student/options').then(unwrap),
  register: (payload) => api.post('/student/register', payload).then(unwrap),
  me: () => api.get('/student/me').then(unwrap),
  updateProfile: (payload) => api.put('/student/profile', payload).then(unwrap),
  plans: () => api.get('/student/plans').then(unwrap),
  createOrder: (planId, subjectIds) =>
    api.post('/student/payments/order', { plan_id: planId, subject_ids: subjectIds }).then(unwrap),
  verifyPayment: (payload) => api.post('/student/payments/verify', payload).then(unwrap),
  practiceChapters: (subjectId) =>
  api.get('/student/practice/chapters', { params: subjectId ? { subject_id: subjectId } : {} }).then(unwrap),
practiceQuestions: (chapterId) => api.get(`/student/practice/chapters/${chapterId}/questions`).then(unwrap),
subscriptions: () => api.get('/student/subscriptions').then(unwrap),
preview: (planId, subjectIds) =>
  api.get('/student/payments/preview', {
    params: { plan_id: planId, subject_ids: subjectIds },
    paramsSerializer: { indexes: null },
  }).then(unwrap),
}
