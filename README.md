# autotweak

Give an AI agent a single function and let it experiment autonomously — modify, evaluate, keep or discard, repeat.

## How it works

Three files:

- **`prepare.ts`** — fixed evaluation harness. Not modified.
- **`tweak.ts`** — the single file the agent edits.
- **`program.md`** — instructions for the agent. Edited by the human.

## Running the agent

Spin up Claude Code in this repo and prompt:

```
Go look at program.md and let's kick off a new experiment. Let's do the setup first.
```

## License

MIT
