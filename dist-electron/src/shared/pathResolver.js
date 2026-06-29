export async function pickExistingPath(candidates, exists) {
    for (const candidate of candidates) {
        if (await exists(candidate)) {
            return candidate;
        }
    }
    return null;
}
