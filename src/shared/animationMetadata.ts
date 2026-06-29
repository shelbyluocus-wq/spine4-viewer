export interface AnimationLike {
  name: string
  duration: number
}

export interface AnimationMetadata extends AnimationLike {
  frames: number
}

const DEFAULT_FPS = 30

export function getAnimationFrameCount(duration: number, fps = DEFAULT_FPS): number {
  return Math.max(0, Math.round(duration * fps))
}

export function buildAnimationMetadata(
  animations: AnimationLike[],
  fps = DEFAULT_FPS,
): AnimationMetadata[] {
  return animations.map((animation) => ({
    ...animation,
    frames: getAnimationFrameCount(animation.duration, fps),
  }))
}

export function findAnimationMetadata(
  animations: AnimationMetadata[],
  animationName: string | null,
): AnimationMetadata | null {
  if (!animationName) {
    return null
  }

  return animations.find((animation) => animation.name === animationName) ?? null
}
