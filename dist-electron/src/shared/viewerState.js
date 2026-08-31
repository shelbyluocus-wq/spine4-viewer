const ANIMATION_PRIORITIES = ['stand', 'idle', 'run'];
const SKIN_PRIORITIES = ['default'];
export function pickInitialAsset(entries) {
    return entries.find((entry) => entry.status === 'supported') ?? entries[0] ?? null;
}
export function filterAssetEntries(entries, query) {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) {
        return entries;
    }
    return entries.filter((entry) => entry.name.toLocaleLowerCase().includes(normalizedQuery));
}
export function pickInitialAnimation(animationNames) {
    return pickPreferredValue(animationNames, ANIMATION_PRIORITIES);
}
export function pickInitialSkin(skinNames) {
    return pickPreferredValue(skinNames, SKIN_PRIORITIES);
}
function pickPreferredValue(values, priorities) {
    for (const priority of priorities) {
        const match = values.find((value) => value.toLowerCase().includes(priority));
        if (match) {
            return match;
        }
    }
    return values[0] ?? null;
}
