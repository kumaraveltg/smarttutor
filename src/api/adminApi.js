import client from './client'

// Assumes REST endpoints shaped as /admin/{resource} and /admin/{resource}/{id}.
// Confirm this convention with the backend (or adjust the paths here) once
// your son's admin service routes are settled — this is the one file to edit.
export const adminApi = {
  list: (resource, params) => client.get(`/admin/${resource}`, { params }),
  get: (resource, id) => client.get(`/admin/${resource}/${id}`),
  create: (resource, payload) => client.post(`/admin/${resource}`, payload),
  update: (resource, id, payload) => client.put(`/admin/${resource}/${id}`, payload),
  remove: (resource, id) => client.delete(`/admin/${resource}/${id}`),
}
