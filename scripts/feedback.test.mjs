import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { loadSubmissions, saveSubmission } from '../src/lib/feedback.js';

const storage = new Map();

globalThis.localStorage = {
  getItem(key) {
    return storage.get(key) ?? null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
};

beforeEach(() => {
  storage.clear();
});

test('feedback submissions persist their topic', () => {
  const submissions = saveSubmission('Ada', 'Looks ready to ship', 'Deployment');

  assert.equal(submissions.length, 1);
  assert.equal(submissions[0].topic, 'Deployment');
  assert.deepEqual(loadSubmissions().map(({ name, message, topic }) => ({ name, message, topic })), [
    { name: 'Ada', message: 'Looks ready to ship', topic: 'Deployment' },
  ]);
});
