import type { AnimationMetadata } from './animationMetadata.js'

export function buildAnimationListMarkup(
  animations: AnimationMetadata[],
  selectedAnimationName: string | null,
): string {
  if (animations.length === 0) {
    return `
      <div class="animation-empty">
        <span class="animation-empty-text">暂无动画</span>
      </div>
    `
  }

  return animations
    .map((animation) => {
      const isSelected = animation.name === selectedAnimationName
      return `
        <button
          class="animation-row${isSelected ? ' is-selected' : ''}"
          type="button"
          data-animation-name="${escapeHtml(animation.name)}"
        >
          <span class="animation-row-name">${escapeHtml(animation.name)}</span>
          <span class="animation-row-frames">${animation.frames}</span>
        </button>
      `
    })
    .join('')
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
