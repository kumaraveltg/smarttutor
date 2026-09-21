import client from './client'

export const adminApi = {
  list: (resource, params) => client.get(`/admin/${resource}`, { params }),
  get: (resource, id) => client.get(`/admin/${resource}/${id}`),

  create: (resource, payload, username) =>
    client.post(`/admin/${resource}`, {
      ...payload,
      created_by: username || 'unknown',
    }),

  update: (resource, id, payload, username) =>
    client.put(`/admin/${resource}/${id}`, {
      ...payload,
      modified_by: username || 'unknown',
    }),

  remove: (resource, id) => client.delete(`/admin/${resource}/${id}`),
}