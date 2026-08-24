/** Recover the question id from recording names created by the student form. */
export function recordingQuestionIdFromFilename(filename: string): number | null {
  const match = /^question-(\d+)-recording\.[a-z0-9]+$/i.exec(filename);
  if (!match) return null;
  const questionId = Number(match[1]);
  return Number.isInteger(questionId) && questionId > 0 ? questionId : null;
}
