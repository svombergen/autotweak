# autotweak

Simpler tweak version of autoresearch, designed to optimize a single function.

The idea: give an AI agent a small function and let it experiment to improve on it autonomously. It modifies the code, checks if the result improved, keeps or discards, and repeats. You wake up in the morning to a log of experiments and (hopefully) a optimized function. The core idea is that you're not touching any of the  files like you normally would. Instead, you are programming the `program.md` Markdown files that provide context to the AI agents and set up your autonomous research org. 

## How it works

The repo is deliberately kept small and only really has three files that matter:

- **`prepare.py`** — fixed constants, one-time data prep, helpers, and runtime utilities (dataloader, evaluation). Not modified.
- **`tweak.py`** — the single file the agent edits. Everything is fair game: architecture, hyperparameters, config, etc. **This file is edited and iterated on by the agent**.
- **`program.md`** — baseline instructions for one agent. Point your agent here and let it go. **This file is edited and iterated on by the human**.

## Running the agent

Simply spin up your Claude/Codex or whatever you want in this repo (and disable all permissions), then you can prompt something like:

```
Go look at program.md and let's kick off a new experiment. Let's do the setup first.
```

The `program.md` file is essentially a super lightweight "skill".

## License

MIT
