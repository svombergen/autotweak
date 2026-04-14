# autotweak

This is an autotweak instruction to optimize a single TypeScript function by running experiments.

## Setup

To set up a new tweak session, work with the user to:

1. **Agree on a run tag**: propose a tag based on today's date (e.g. `apr13`). The branch `autotweak/<tag>` must not already exist — this is a fresh run.
2. **Create the branch**: `git checkout -b autotweak/<tag>` from current main.
3. **Read the in-scope files**: The repo is small. Read these files for full context:
   - `README.md` — repository context.
   - `evaluate.ts` — fixed CSV loading and evaluation harness. Do not modify. It imports `transform` from `tweak.ts` — that is the generic entry point it always calls.
   - `tweak.ts` — the file you modify. It exports `transform(input)` at the top, which delegates to the domain-specific function below. To tweak a new function: point `transform` at it and replace the implementation below.
4. **Initialize results.csv**: Create `results.csv` with just the header row. The baseline will be recorded after the first run.
5. **Confirm and go**: Confirm setup looks good.

Once you get confirmation, kick off the experimentation.

## Experimentation

Each experiment evaluates the function against the full dataset. You launch it as: `npx tsx evaluate.ts`.

**What you CAN do:**
- Modify `tweak.ts` — this is the only file you edit. Everything is fair game: tokenization rules, regex patterns, number word tables, candidate building logic, scoring weights, normalization steps, etc.

**What you CANNOT do:**
- Modify `evaluate.ts`. It is read-only. It contains the fixed CSV loader and evaluation harness.
- Install new packages or add dependencies. You can only use what's already in `package.json`.

**Objective**: maximize `val_score` (accuracy %). When val_score is equal, simpler code wins. Deleting parts of code and keeping the same val_score is a big win. Adding 20 lines for a 0.1% gain is probably not. Do not blindly take lines_of_code as a metric, removing comments or folding in function calls is not simplifying in the right way. Finding another angle that involves less code to get to the same results is.

**The first run**: Always establish the baseline first — run the evaluation script as-is before making any changes.

## Output format

```
---
val_score:        419/420 (99.76%)
lines_of_code:    245
total_seconds:    0.05
```

Each run is fast (under a second). Extract both metrics from the log:

```
grep "^val_score:\|^lines_of_code:" run.log
```

## Logging results

Log each experiment to `results.csv` (tab-separated — commas break in descriptions).

```
commit	val_score	loc	status	description
```

1. git commit hash (short, 7 chars)
2. val_score (e.g. `99.76%`) — use `0%` for crashes
3. lines_of_code count
4. status: `keep`, `discard`, or `crash`
5. short description of what this experiment tried

Example:

```
commit	val_score	loc	status	description
a1b2c3d	97.38%	285	keep	baseline
b2c3d4e	99.52%	301	keep	split on repetition markers
c3d4e5f	99.52%	289	keep	simplify tokenizer
d4e5f6g	0%	289	crash	reranked candidates
```

NOTE: do not commit the results.csv file, leave it untracked by git.

## The experiment loop

The experiment runs on a dedicated branch (e.g. `autotweak/apr13`).

LOOP FOR 10 ITERATIONS:

1. Look at the git state: the current branch/commit we're on
2. Tune `tweak.ts` with an experimental idea by directly hacking the code.
3. git commit — include val_score and loc in the message, e.g. `exp3: simplify tokenizer | 99.76% 241loc`
4. Run the experiment: `npx tsx evaluate.ts > run.log 2>&1` (redirect everything — do NOT use tee or let output flood your context)
5. Read out the results: `grep "^val_score:\|^lines_of_code:" run.log`
6. If the grep output is empty, the run crashed. Run `tail -n 50 run.log` to read the error and attempt a fix. If you can't get things to work after more than a few attempts, give up.
7. Record the results in the csv
8. If val_score improved, keep the commit. If val_score is equal but loc is lower, keep the commit. Otherwise, `git reset --hard` back to where you started.

**Crashes**: If a run crashes (a bug, a missing import, etc.), use your judgment: If it's something dumb and easy to fix (e.g. a typo), fix it and re-run. If the idea itself is fundamentally broken, skip it, log `crash` in the csv, and move on.
