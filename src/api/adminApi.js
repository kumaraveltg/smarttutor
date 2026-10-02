import client from './client'

export const adminApi = {
  // Trailing slash added to match FastAPI's router prefix ("/admin/{resource}/")
  // and avoid a 307 redirect on GET/POST.
  list: (resource, params) => client.get(`/admin/${resource}/`, { params }),
  get: (resource, id) => client.get(`/admin/${resource}/${id}`),

  create: (resource, payload, username) =>
    client.post(`/admin/${resource}/`, {
      ...payload,
      created_by: username || 'unknown',
      modified_by: username || 'unknown',
    }),

  update: (resource, id, payload, username) =>
    client.put(`/admin/${resource}/${id}`, {
      ...payload,
      modified_by: username || 'unknown',
    }),

  remove: (resource, id) => client.delete(`/admin/${resource}/${id}`),

  // ---- Translations ----
  listTranslations: (resource, id) =>
    client.get(`/admin/${resource}/${id}/translations`),

  upsertTranslation: (resource, id, langCode, title, username) =>
    client.put(`/admin/${resource}/${id}/translations/${langCode}`, {
      title,
      modified_by: username || 'unknown',
    }),
    
  upsertQuestionTranslation: (id, langCode, questionText, username) =>
  client.put(`/admin/questions/${id}/translations/${langCode}`, {
    question_text: questionText,
    modified_by: username || 'unknown',
  }),  

  deleteTranslation: (resource, id, langCode) =>
    client.delete(`/admin/${resource}/${id}/translations/${langCode}`),
}