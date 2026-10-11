import { describe, it, expect } from 'vitest';
import { buildReply, type ChatMessage } from '@/lib/chat-reply';

const emptyHistory: ChatMessage[] = [];
const onePatientMessage: ChatMessage[] = [{ role: 'patient', content: 'I walked today' }];
const twoPatientMessages: ChatMessage[] = [
  { role: 'patient', content: 'I walked today' },
  { role: 'assistant', content: 'How did it feel?' },
  { role: 'patient', content: 'It was fine' },
];

describe('buildReply', () => {
  it('returns the first-message follow-up when it is the first patient message', () => {
    const reply = buildReply('I did my exercises', onePatientMessage);
    expect(reply).toBe('Thank you for sharing that. What felt easiest or most difficult about the activity?');
  });

  it('responds to pain-related keywords', () => {
    const reply = buildReply('I felt some pain today', twoPatientMessages);
    expect(reply).toContain('difficult');
    expect(reply).toContain('doctor');
  });

  it('responds to "stiff" keyword', () => {
    const reply = buildReply('My knee was stiff', twoPatientMessages);
    expect(reply).toContain('difficult');
  });

  it('responds to "hurt" keyword', () => {
    const reply = buildReply('It hurt a little', twoPatientMessages);
    expect(reply).toContain('difficult');
  });

  it('responds to question-related keywords', () => {
    const reply = buildReply('When should I increase my walking?', twoPatientMessages);
    expect(reply).toContain('question');
    expect(reply).toContain('doctor');
  });

  it('responds to "why" keyword', () => {
    const reply = buildReply('Why do I need to do this daily?', twoPatientMessages);
    expect(reply).toContain('question');
  });

  it('responds to "expected" keyword', () => {
    const reply = buildReply('Is this amount of walking expected?', twoPatientMessages);
    expect(reply).toContain('question');
  });

  it('responds to positive keywords like "fine"', () => {
    const reply = buildReply('Everything went fine today', twoPatientMessages);
    expect(reply).toContain('glad');
    expect(reply).toContain('different');
  });

  it('responds to "good" keyword', () => {
    const reply = buildReply('It felt good', twoPatientMessages);
    expect(reply).toContain('glad');
  });

  it('responds to "completed" keyword', () => {
    const reply = buildReply('I completed all my exercises', twoPatientMessages);
    expect(reply).toContain('glad');
  });

  it('returns the default concern prompt for unmatched messages', () => {
    const reply = buildReply('I ate lunch', twoPatientMessages);
    expect(reply).toContain('main concern');
  });

  it('is case-insensitive for keyword matching', () => {
    const reply = buildReply('I FELT PAIN', twoPatientMessages);
    expect(reply).toContain('difficult');
  });
});
