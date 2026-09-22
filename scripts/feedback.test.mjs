import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  FEEDBACK_TOPICS,
  MAX_NAME_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_SUBMISSIONS,
  loadSubmissions,
  saveSubmission,
} from '../src/lib/feedback.js';

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

test('normalizes text, accepts every topic, and preserves anonymous feedback', () => {
  for (const topic of FEEDBACK_TOPICS) {
    const submissions = saveSubmission('  Ada  ', '  A question  ', ` ${topic} `);
    assert.equal(submissions.at(-1).name, 'Ada');
    assert.equal(submissions.at(-1).message, 'A question');
    assert.equal(submissions.at(-1).topic, topic);
  }
  const anonymous = saveSubmission('   ', 'Anonymous question').at(-1);
  assert.equal(anonymous.name, '');
  assert.equal(anonymous.topic, FEEDBACK_TOPICS[0]);
});

test('accepts the exact field length limits', () => {
  const submissions = saveSubmission('n'.repeat(MAX_NAME_LENGTH), 'm'.repeat(MAX_MESSAGE_LENGTH));
  assert.equal(submissions[0].name.length, MAX_NAME_LENGTH);
  assert.equal(submissions[0].message.length, MAX_MESSAGE_LENGTH);
});

test('rejects invalid fields without changing saved feedback', () => {
  saveSubmission('Ada', 'Keep this');
  const original = [...storage.entries()];
  for (const [name, message, topic] of [
    ['Ada', '', 'Deployment'],
    ['Ada', ' \n\t ', 'Deployment'],
    ['n'.repeat(MAX_NAME_LENGTH + 1), 'Hello', 'Deployment'],
    ['Ada', 'm'.repeat(MAX_MESSAGE_LENGTH + 1), 'Deployment'],
    ['Ada', 'Hello', 'Unknown topic'],
    ['Ada', 'Hello', ''],
    ['Ada', 'Hello', 't'.repeat(10000)],
    [null, 'Hello', 'Deployment'],
    ['Ada', null, 'Deployment'],
    ['Ada', 'Hello', null],
    [new Blob(['Ada']), 'Hello', 'Deployment'],
    ['Ada', new Blob(['Hello']), 'Deployment'],
    ['Ada', 'Hello', new Blob(['Deployment'])],
  ]) {
    assert.throws(() => saveSubmission(name, message, topic));
    assert.deepEqual([...storage.entries()], original);
  }
});

test('limits total submissions without removing existing feedback', () => {
  for (let index = 0; index < MAX_SUBMISSIONS; index++) {
    saveSubmission('Ada', `Message ${index}`);
  }
  const original = [...storage.entries()];
  assert.equal(loadSubmissions().length, MAX_SUBMISSIONS);
  assert.throws(() => saveSubmission('Ada', 'One too many'), /limit of 100/);
  assert.deepEqual([...storage.entries()], original);
});

test('preserves legacy submissions without a topic when adding new feedback', () => {
  const legacy = { name: 'Ada', message: 'Old question', submittedAt: '2026-09-22T00:00:00Z' };
  storage.set('ship-with-ai-feedback', JSON.stringify([legacy]));
  const submissions = saveSubmission('Grace', 'New question', 'Security');
  assert.deepEqual(submissions[0], legacy);
  assert.equal(submissions[1].topic, 'Security');
});

test('reports corrupt stored feedback without overwriting it', () => {
  for (const raw of ['invalid json', '{}', 'null', '[null]', '[{"message":42}]']) {
    storage.set('ship-with-ai-feedback', raw);
    assert.throws(() => loadSubmissions());
    assert.throws(() => saveSubmission('Ada', 'Hello'));
    assert.equal(storage.get('ship-with-ai-feedback'), raw);
  }
});

test('surfaces storage failures to the caller', (context) => {
  const quotaError = new DOMException('Storage is full', 'QuotaExceededError');
  context.mock.method(globalThis.localStorage, 'setItem', () => { throw quotaError; });
  assert.throws(() => saveSubmission('Ada', 'Hello'), (error) => error === quotaError);
  assert.equal(storage.size, 0);

  const accessError = new DOMException('Storage is unavailable', 'SecurityError');
  context.mock.method(globalThis.localStorage, 'getItem', () => { throw accessError; });
  assert.throws(() => loadSubmissions(), (error) => error === accessError);
  assert.throws(() => saveSubmission('Ada', 'Hello'), (error) => error === accessError);
});
