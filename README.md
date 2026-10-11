# AfterCare — Thoughtful recovery, together

An AI-based post-discharge patient follow-up system. Patients chat with an AI assistant, upload activity videos, and receive doctor feedback. Doctors review AI-generated summaries, original conversations, and videos before sending feedback.

## Tech stack

- **React 18** with **TypeScript**
- **Vite** as the build tool
- **Tailwind CSS** for styling
- **Supabase** for database, authentication, storage, and edge functions
- **Vitest** + **React Testing Library** for automated tests

## Getting started

### Install dependencies

```bash
npm install
```

### Run the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Run the production build

```bash
npm run build
```

### Run the type checker

```bash
npm run typecheck
```

## Testing

### Run the full test suite

```bash
npm test
```

This runs all test files once and exits. All tests use mocked Supabase calls — no live database or real patient data is required.

### Run tests in watch mode

```bash
npm run test:watch
```

This re-runs tests automatically whenever you save a file.

### What is tested

The test suite covers 41 tests across three files:

- **Helper functions** (`src/lib/utils.test.ts`) — tests the `initials`, `formatDate`, and `timeAgo` utility functions with normal inputs, edge cases, and boundary values.
- **AI chat reply logic** (`src/lib/chat-reply.test.ts`) — tests the `buildReply` function that powers the check-in chatbot, verifying keyword matching for pain, questions, positive responses, first-message behaviour, and the default fallback.
- **React components** (`src/test/App.test.tsx`) — tests the login screen (sign-in, sign-up, demo buttons, error display), the status pill (all three review states plus unknown), stat cards, and the notifications panel (empty state, rendering items, click-to-read behaviour).

### Features that cannot currently be unit tested

- **Video upload flow** — the upload component is not exported from `App.tsx`, and the storage upload chain is tightly coupled to the component's internal state. The Supabase storage mock is in place but the component is not independently accessible.
- **Chat panel conversation flow** — the `ChatPanel` component manages conversation creation, message loading, and AI replies internally but is not exported, making it difficult to test in isolation.
- **Doctor patient-detail and feedback flow** — `PatientDetail` and `DoctorOverview` are not exported and depend on complex data shapes loaded from multiple Supabase queries.
- **Database-level RLS policies** — these are SQL-based security rules that would require integration tests against a live Supabase instance, not unit tests.
