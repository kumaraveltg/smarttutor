import client from './client'

const unwrap = (r) => (r && typeof r === 'object' && 'data' in r && 'status' in r ? r.data : r)

export const practiceApi = {
  getQuestion: (questionId) => client.get(`/practice/questions/${questionId}`).then(unwrap),

  checkStep: (questionId, stepNumber, stepText, methodId) =>
    client
      .post(`/practice/questions/${questionId}/check-step`, {
        step_number: stepNumber,
        answer: stepText,
        method_id: methodId ?? null,
      })
      .then(unwrap),

  getHint: (questionId, stepNumber, methodId) =>
    client
      .get(`/practice/questions/${questionId}/hint`, {
        params: { step_number: stepNumber, method_id: methodId ?? '' },
      })
      .then(unwrap),
}