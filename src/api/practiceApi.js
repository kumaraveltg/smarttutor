import client from './client'

// Assumed shape for the practice/chat service — align with your son's actual
// routes.
//
// Method locking: on the FIRST step, methodId is null. The backend matches
// the student's step against every method's stored reference steps in the
// vector DB, picks the closest one, and returns that method's id — the
// frontend then sends that same methodId on every later call for this
// question, so subsequent steps are only checked against the locked
// method's steps (not re-matched against every method each time). Today
// there's only one method per question, so this is a no-op — but the
// contract is ready for multiple methods later without a frontend change.
//
// Expected checkStep response shape:
// { correct: boolean, complete: boolean, method_id: string,
//   feedback?: string, hint?: string }
export const practiceApi = {
  getChapters: () => client.get('/practice/chapters'),
  getQuestion: (questionId) => client.get(`/practice/questions/${questionId}`),
  getNextQuestion: (currentQuestionId) =>
    client.get(`/practice/questions/${currentQuestionId}/next`),

  checkStep: (questionId, stepNumber, stepText, methodId) =>
    client.post(`/practice/questions/${questionId}/check-step`, {
      step_number: stepNumber,
      answer: stepText,
      method_id: methodId ?? null,
    }),

  // Explicit "I forgot, help me" request — does NOT count as a wrong
  // attempt, just returns a hint for the current (locked) step/method.
  getHint: (questionId, stepNumber, methodId) =>
    client.get(`/practice/questions/${questionId}/hint`, {
      params: { step_number: stepNumber, method_id: methodId ?? '' },
    }),
}
