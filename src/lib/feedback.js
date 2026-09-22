// Feedback widget storage + submit handling.

const STORAGE_KEY = 'ship-with-ai-feedback';
export const FEEDBACK_TOPICS = Object.freeze([
  'General feedback',
  'Episode 3 lesson',
  'Code review',
  'Security',
  'Deployment',
]);
export const MAX_NAME_LENGTH = 80;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_SUBMISSIONS = 100;

export function loadSubmissions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const submissions = JSON.parse(raw);
  if (!Array.isArray(submissions) || submissions.some((entry) =>
    !entry || typeof entry !== 'object' ||
    typeof entry.name !== 'string' || typeof entry.message !== 'string' ||
    typeof entry.submittedAt !== 'string'
  )) {
    throw new Error('Saved feedback is invalid.');
  }
  return submissions;
}

export function saveSubmission(name, message, topic = FEEDBACK_TOPICS[0]) {
  if (typeof name !== 'string' || typeof message !== 'string' || typeof topic !== 'string') {
    throw new Error('Feedback fields must be text.');
  }
  name = name.trim();
  message = message.trim();
  topic = topic.trim();
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
  }
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Enter a message between 1 and ${MAX_MESSAGE_LENGTH} characters.`);
  }
  if (!FEEDBACK_TOPICS.includes(topic)) {
    throw new Error('Choose a valid feedback topic.');
  }
  const submissions = loadSubmissions();
  if (submissions.length >= MAX_SUBMISSIONS) {
    throw new Error(`This browser has reached the limit of ${MAX_SUBMISSIONS} feedback submissions.`);
  }
  submissions.push({ name, topic, message, submittedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
  return submissions;
}
