export function getDefaultWindowSizing(workArea) {
    const width = fitToWorkArea(workArea.width, 1680, 1280);
    const height = fitToWorkArea(workArea.height, 1000, 760);
    return {
        width,
        height,
        minWidth: Math.min(width, 1200),
        minHeight: Math.min(height, 720),
    };
}
function fitToWorkArea(available, preferred, minimum) {
    if (available <= 0) {
        return preferred;
    }
    if (available < minimum) {
        return available;
    }
    return Math.min(available, preferred);
}
