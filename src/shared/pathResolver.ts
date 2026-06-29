export async function pickExistingPath(
  candidates: string[],
  exists: (candidate: string) => Promise<boolean>,
): Promise<string | null> {
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate
    }
  }

  return null
}
