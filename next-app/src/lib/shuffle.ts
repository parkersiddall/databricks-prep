/**
 * Order randomisation. Pure — no React, no storage.
 *
 * Used when building an all-questions practice sitting, so the same bank does
 * not come back in the same order every time and the user drills the questions
 * rather than the sequence.
 */

/**
 * Fisher–Yates, returning a new array and leaving the input untouched.
 *
 * `random` is injected rather than reaching for `Math.random` directly, so tests
 * can pin the permutation; production callers take the default.
 */
export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }

  return result;
}
