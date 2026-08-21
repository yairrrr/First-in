# First-In

An AI-powered build-and-learn environment. Describe an app or a game in a prompt,
watch it get built and run in your browser — then learn the generated code step
by step, earning points until you truly understand the project you created.

**Core principle:** Creation First. Understanding Along the Way.

## What it does

- Turns a free-text prompt into a working, self-contained HTML app, rendered live in the page
- Splits the generated code into learning chapters — deterministically, no AI involved
- Each chapter is a two-phase micro-lesson: a short concept card, then an interactive exercise
- Two exercise types: tap-to-assemble a real line from your code, or a multiple-choice question
- Difficulty adapts to progress — early chapters use plain language and minimal code
- Points, progress map and a first-try accuracy metric, all persisted locally
- Download any built project as a standalone HTML file

## Stack

React, TypeScript, Vite, React Router, plain CSS with Flexbox, Vitest.
Local language model via Ollama (gemma4:12b) — no cloud services, no API keys, zero cost.

## Running

```
npm install
npm run dev
```

Building real projects requires [Ollama](https://ollama.com) running locally with
the `gemma4:12b` model. Without it, check "demo mode" to explore a pre-built project.

## Tests

```
npm test          # unit tests, no network
npm run test:e2e  # integration test against a live Ollama (~1 min)
```
