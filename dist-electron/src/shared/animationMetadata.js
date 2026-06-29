const DEFAULT_FPS = 30;
export function getAnimationFrameCount(duration, fps = DEFAULT_FPS) {
    return Math.max(0, Math.round(duration * fps));
}
export function buildAnimationMetadata(animations, fps = DEFAULT_FPS) {
    return animations.map((animation) => ({
        ...animation,
        frames: getAnimationFrameCount(animation.duration, fps),
    }));
}
export function findAnimationMetadata(animations, animationName) {
    if (!animationName) {
        return null;
    }
    return animations.find((animation) => animation.name === animationName) ?? null;
}
