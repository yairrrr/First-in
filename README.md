# First-In

Build an app from a prompt, then learn the code you just built.

First-In is a browser-only learning environment. You describe a small app or
game, a local language model generates it as a single HTML file, and it runs
inside the page. The generated code is then split into short learning chapters,
each with a concept card, a real code example, and an interactive exercise.
Correct answers earn XP; your rank determines the difficulty of new lessons.

## Features

- Prompt → self-contained HTML app, rendered live and downloadable as a file
- Conversational revisions: describe a change, the model rewrites the project; history and undo included
- Deterministic chapter splitting (markup, styles, functions), with no model involved
- Two-phase micro-lessons: concept and example first, then a tap-to-assemble or multiple-choice exercise
- Global learner rank with XP; difficulty adapts to rank, starting with plain language and minimal code
- Hebrew and English UI with a language switch; gender-neutral Hebrew copy
- All state persisted in `localStorage`; no accounts, no server

## Stack

React 19, TypeScript, Vite, React Router, plain CSS (Flexbox), Vitest.
Inference runs locally through [Ollama](https://ollama.com) with `gemma4:12b`.
There are no cloud services and no API keys.

## Requirements

- Node.js 20+ and npm
- For real builds: Ollama running locally with the model pulled:

  ```
  ollama pull gemma4:12b
  ```

  Without Ollama, enable **demo mode** in the build form to explore a recorded project.

## Running

```
npm install
npm run dev
```

Open `http://localhost:5173`.

## Configuration

There are no environment variables. The Ollama endpoint and model are constants
in `src/llm/ollamaProvider.ts` (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`).

## Development

```
npm test          # unit tests (no network)
npm run test:e2e  # integration test against a live Ollama instance
npm run build     # type-check and production build
```

## Project layout

```
src/
  routes/       screens (home, project, study map, chapter)
  components/   UI building blocks, icons, syntax highlighting
  state/        reducer, persistence, rank model, async actions
  services/     project builder, reviser, chapter splitter, lesson generator
  llm/          provider interface, Ollama client, recorded fixtures
  i18n/         strings and title formatting for both languages
```

## Contributing

Open a pull request from a branch or fork. The `main` branch is protected;
changes are merged through review.

## License

No license has been granted yet. See the repository owner before reusing the code.
