// tweak.ts — the file the agent edits.
// Exports transform as the entry point for email parsing experiments.

export function transform(input: string): string | null {
  return parseEmail(input);
}

export function parseEmail(input: string): string | null {
  void input;
  return null;
}
