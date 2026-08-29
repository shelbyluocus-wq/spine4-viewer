import '@esotericsoftware/spine-player/dist/spine-player.css'
import { SpinePlayer } from '@esotericsoftware/spine-player'

import anchorMarkerUrl from './assets/anchor.png'
import './style.css'

import type { AnimationMetadata } from './shared/animationMetadata'
import { buildAnimationMetadata } from './shared/animationMetadata'
import { buildAnimationListMarkup } from './shared/animationListMarkup'
import { projectWorldPointToStage } from './shared/anchorMarker'
import {
  createPannableViewport,
  getPlayerCanvasSize,
  installFixedViewport,
  MAX_PREVIEW_SCALE,
  MIN_PREVIEW_SCALE,
  panByPixels,
  resetSkeletonPhysics,
  setAnimationPreservingViewport,
  zoomAtScreenPoint,
} from './shared/playerViewport'
import type { ViewState } from './shared/playerViewport'
import { getPlayerBackgroundColor } from './shared/previewLayout'
import type { SpineAssetEntry, ViewerState } from './shared/types'
import { pickInitialAnimation, pickInitialAsset, pickInitialSkin } from './shared/viewerState'

interface AppState extends ViewerState {
  entries: SpineAssetEntry[]
  animationOptions: AnimationMetadata[]
  skinNames: string[]
  rootPath: string
  scanMessage: string
  previewMessage: string
  player: SpinePlayer | null
  loadToken: number
  isLoadingPreview: boolean
  panX: number
  panY: number
  backgroundMode: 'default' | 'custom'
  backgroundCustom: string
}

interface AppRefs {
  assetList: HTMLDivElement
  stageHost: HTMLDivElement
  stageFrame: HTMLDivElement
  stageTitle: HTMLHeadingElement
  stageAnchor: HTMLDivElement
  stageNotice: HTMLDivElement
  animationList: HTMLDivElement
  skinSelect: HTMLSelectElement
  playButton: HTMLButtonElement
  loopButton: HTMLButtonElement
  refreshButton: HTMLButtonElement
  speedRange: HTMLInputElement
  speedValue: HTMLSpanElement
  scaleRange: HTMLInputElement
  scaleValue: HTMLSpanElement
  viewResetButton: HTMLButtonElement
  bgRow: HTMLDivElement
  bgValue: HTMLSpanElement
  bgColorInput: HTMLInputElement
}

interface InstalledViewport {
  x: number
  y: number
  width: number
  height: number
}

const state: AppState = {
  entries: [],
  animationOptions: [],
  skinNames: [],
  rootPath: '',
  scanMessage: '',
  previewMessage: '',
  player: null,
  loadToken: 0,
  isLoadingPreview: false,
  selectedAsset: null,
  selectedAnimation: null,
  selectedSkin: null,
  isPlaying: true,
  isLooping: true,
  timeScale: 1,
  previewScale: 1,
  panX: 0,
  panY: 0,
  backgroundMode: 'default',
  backgroundCustom: '#ffffff',
}

let stageAnchorFrame = 0
let viewportRefreshFrame = 0
let panPointer: { pointerId: number; lastX: number; lastY: number } | null = null

const STAGE_BACKGROUND_STORAGE_KEY = 'spine-viewer:stage-bg'
const WHEEL_ZOOM_FACTOR = 0.0018

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('App root not found')
}

app.innerHTML = getAppMarkup()

const refs: AppRefs = {
  assetList: must<HTMLDivElement>('#asset-list'),
  stageHost: must<HTMLDivElement>('#stage-host'),
  stageFrame: must<HTMLDivElement>('#stage-frame'),
  stageTitle: must<HTMLHeadingElement>('#stage-title'),
  stageAnchor: must<HTMLDivElement>('#stage-anchor'),
  stageNotice: must<HTMLDivElement>('#stage-notice'),
  animationList: must<HTMLDivElement>('#animation-list'),
  skinSelect: must<HTMLSelectElement>('#skin-select'),
  playButton: must<HTMLButtonElement>('#play-button'),
  loopButton: must<HTMLButtonElement>('#loop-button'),
  refreshButton: must<HTMLButtonElement>('#refresh-button'),
  speedRange: must<HTMLInputElement>('#speed-range'),
  speedValue: must<HTMLSpanElement>('#speed-value'),
  scaleRange: must<HTMLInputElement>('#scale-range'),
  scaleValue: must<HTMLSpanElement>('#scale-value'),
  viewResetButton: must<HTMLButtonElement>('#view-reset-button'),
  bgRow: must<HTMLDivElement>('#bg-row'),
  bgValue: must<HTMLSpanElement>('#bg-value'),
  bgColorInput: must<HTMLInputElement>('#bg-color-input'),
}

loadStageBackgroundPreference()
applyStageBackground()

bindEvents()
updateStaticControls()
void scanAssets()

function bindEvents(): void {
  window.addEventListener('resize', () => {
    queueViewportRefresh()
  })

  refs.refreshButton.addEventListener('click', () => {
    void scanAssets(state.selectedAsset?.name ?? null)
  })

  refs.playButton.addEventListener('click', () => {
    if (!state.player || !state.selectedAnimation) {
      return
    }

    state.isPlaying = !state.isPlaying
    syncPlaybackState()
    renderControls()
  })

  refs.loopButton.addEventListener('click', () => {
    state.isLooping = !state.isLooping
    if (state.player && state.selectedAnimation) {
      setAnimationPreservingViewport(state.player, state.selectedAnimation, state.isLooping)
      syncPlaybackState()
    }
    renderControls()
  })

  refs.skinSelect.addEventListener('change', () => {
    state.selectedSkin = refs.skinSelect.value || null
    applySkin()
  })

  refs.speedRange.addEventListener('input', () => {
    state.timeScale = Number(refs.speedRange.value)
    if (state.player) {
      state.player.speed = state.timeScale
    }
    renderControls()
  })

  refs.scaleRange.addEventListener('input', () => {
    state.previewScale = Number(refs.scaleRange.value)
    queueViewportRefresh()
    renderControls()
  })

  refs.viewResetButton.addEventListener('click', () => {
    resetView()
  })

  refs.bgRow.addEventListener('click', (event) => {
    const swatch = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.bg-swatch')
    if (!swatch) {
      return
    }

    if (swatch.dataset.bgMode === 'default') {
      state.backgroundMode = 'default'
    } else if (swatch.dataset.bgColor) {
      state.backgroundMode = 'custom'
      state.backgroundCustom = swatch.dataset.bgColor
    } else {
      return
    }

    applyStageBackground()
  })

  refs.bgColorInput.addEventListener('input', () => {
    const value = refs.bgColorInput.value
    if (!isHexColor(value)) {
      return
    }

    state.backgroundMode = 'custom'
    state.backgroundCustom = value
    applyStageBackground()
  })

  refs.stageFrame.addEventListener('wheel', (event) => {
    if (!isStageInteractive()) {
      return
    }

    event.preventDefault()
    const deltaY = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
    applyZoomAt(event, state.previewScale * Math.exp(-deltaY * WHEEL_ZOOM_FACTOR))
  }, { passive: false })

  refs.stageFrame.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !isStageInteractive()) {
      return
    }

    panPointer = { pointerId: event.pointerId, lastX: event.clientX, lastY: event.clientY }
    refs.stageFrame.setPointerCapture(event.pointerId)
    refs.stageFrame.classList.add('is-panning')
  })

  refs.stageFrame.addEventListener('pointermove', (event) => {
    if (!panPointer || panPointer.pointerId !== event.pointerId) {
      return
    }

    const dx = event.clientX - panPointer.lastX
    const dy = event.clientY - panPointer.lastY
    panPointer.lastX = event.clientX
    panPointer.lastY = event.clientY
    applyPanDelta(dx, dy)
  })

  const endPan = (event: PointerEvent): void => {
    if (!panPointer || panPointer.pointerId !== event.pointerId) {
      return
    }

    panPointer = null
    refs.stageFrame.classList.remove('is-panning')
  }

  refs.stageFrame.addEventListener('pointerup', endPan)
  refs.stageFrame.addEventListener('pointercancel', endPan)

  refs.stageFrame.addEventListener('dblclick', () => {
    if (isStageInteractive()) {
      resetView()
    }
  })
}

async function scanAssets(preferredAssetName?: string | null): Promise<void> {
  const { entries, message, rootPath } = await window.viewer.scanAssets()
  const preferredAsset =
    (preferredAssetName ? entries.find((entry) => entry.name === preferredAssetName) : null)
    ?? pickInitialAsset(entries)

  state.entries = entries
  state.rootPath = rootPath
  state.scanMessage = message
  state.selectedAsset = preferredAsset

  renderAssetList()

  if (preferredAsset) {
    await loadAsset(preferredAsset)
  } else {
    resetPlaybackState()
    disposePlayer()
    renderAll()
  }
}

async function loadAsset(entry: SpineAssetEntry): Promise<void> {
  state.selectedAsset = entry
  state.previewMessage = entry.statusMessage
  state.animationOptions = []
  state.skinNames = []
  state.selectedAnimation = null
  state.selectedSkin = null
  state.panX = 0
  state.panY = 0
  state.previewScale = 1
  state.isLoadingPreview = entry.status === 'supported'
  renderAll()

  if (entry.status !== 'supported') {
    disposePlayer()
    state.isLoadingPreview = false
    renderAll()
    return
  }

  disposePlayer()
  refs.stageHost.innerHTML = ''

  const requestId = ++state.loadToken

  try {
    const payload = await window.viewer.loadAsset(entry)
    if (requestId !== state.loadToken) {
      return
    }

    const player = new SpinePlayer(refs.stageHost, {
      alpha: true,
      atlas: payload.atlasKey,
      backgroundColor: getPlayerBackgroundColor(),
      interactive: true,
      premultipliedAlpha: true,
      rawDataURIs: payload.rawDataURIs,
      showControls: false,
      skeleton: payload.skeletonKey,
      showLoading: true,
      success(instance) {
        if (requestId !== state.loadToken) {
          instance.dispose()
          return
        }

        state.player = instance
        state.animationOptions = buildAnimationMetadata(
          instance.skeleton?.data.animations.map((animation) => ({
            name: animation.name,
            duration: animation.duration,
          })) ?? [],
        )
        state.skinNames = instance.skeleton?.data.skins.map((skin) => skin.name) ?? []
        state.selectedSkin = pickInitialSkin(state.skinNames)
        state.selectedAnimation = pickInitialAnimation(
          state.animationOptions.map((animation) => animation.name),
        )
        state.previewMessage = ''
        state.isLoadingPreview = false

        applySkin()
        refreshFixedViewportForCurrentCanvas()
        applyAnimation()
        if (state.player) {
          state.player.speed = state.timeScale
        }
        renderAll()
        queueViewportRefresh()
      },
      error(_instance, message) {
        if (requestId !== state.loadToken) {
          return
        }

        state.player = null
        state.previewMessage = message
        state.isLoadingPreview = false
        renderAll()
      },
    })

    state.player = player
  } catch (error) {
    if (requestId !== state.loadToken) {
      return
    }

    state.player = null
    state.previewMessage = error instanceof Error ? error.message : '资源加载失败'
    state.isLoadingPreview = false
    renderAll()
  }
}

function renderAll(): void {
  renderStage()
  renderControls()
  renderAssetList()
  queueStageAnchorRender()
}

function renderAssetList(): void {
  if (state.entries.length === 0) {
    refs.assetList.innerHTML = `
      <div class="asset-empty">
        <p class="asset-empty-title">未找到资源</p>
        <p class="asset-empty-text">请把 Spine 文件放进默认的 <code>spine</code> 目录后再刷新。</p>
      </div>
    `
    return
  }

  refs.assetList.innerHTML = state.entries
    .map((entry) => {
      const isSelected = state.selectedAsset?.name === entry.name
      return `
        <button
          class="asset-card${isSelected ? ' is-selected' : ''}"
          type="button"
          data-asset-name="${escapeHtml(entry.name)}"
          title="${escapeHtml(entry.statusMessage)}"
        >
          <span class="asset-title-row">
            <span class="asset-name">${escapeHtml(entry.name)}</span>
            <span class="status-badge status-${entry.status}">${getStatusLabel(entry.status)}</span>
          </span>
          <span class="asset-version">${escapeHtml(entry.detectedVersion ?? '未知版本')}</span>
        </button>
      `
    })
    .join('')

  refs.assetList.querySelectorAll<HTMLButtonElement>('[data-asset-name]').forEach((button) => {
    button.addEventListener('click', () => {
      const assetName = button.dataset.assetName
      const entry = state.entries.find((candidate) => candidate.name === assetName)
      if (!entry) {
        return
      }

      void loadAsset(entry)
    })
  })
}

function renderStage(): void {
  const selected = state.selectedAsset
  const notice = getStageNotice(selected)

  refs.stageTitle.textContent = selected ? selected.name : '未选择资源'
  refs.stageFrame.dataset.state = getStageState(selected)
  refs.stageFrame.dataset.loading = state.isLoadingPreview ? 'true' : 'false'

  refs.stageNotice.textContent = notice
  refs.stageNotice.hidden = notice.length === 0
  refs.stageAnchor.hidden = !shouldShowStageAnchor()
}

function renderControls(): void {
  const canInteract = Boolean(state.player && state.selectedAsset?.status === 'supported')

  renderAnimationList(canInteract)

  refs.skinSelect.innerHTML = buildOptions(state.skinNames, state.selectedSkin, '无皮肤')
  refs.skinSelect.disabled = !canInteract || state.skinNames.length === 0
  refs.playButton.disabled = !canInteract || !state.selectedAnimation
  refs.loopButton.disabled = !canInteract || !state.selectedAnimation
  refs.speedRange.disabled = !canInteract
  refs.scaleRange.disabled = state.isLoadingPreview
  refs.viewResetButton.disabled = !isStageInteractive()

  refs.playButton.textContent = state.isPlaying ? '暂停' : '播放'
  refs.loopButton.textContent = state.isLooping ? '循环中' : '单次'
  refs.loopButton.dataset.active = state.isLooping ? 'true' : 'false'
  refs.speedRange.value = state.timeScale.toFixed(2)
  refs.speedValue.textContent = `${state.timeScale.toFixed(2)}x`
  refs.scaleRange.value = state.previewScale.toFixed(2)
  refs.scaleValue.textContent = `${state.previewScale.toFixed(2)}x`

  renderBackgroundControls()
}

function renderAnimationList(canInteract: boolean): void {
  const scrollTop = refs.animationList.scrollTop

  refs.animationList.innerHTML = buildAnimationListMarkup(state.animationOptions, state.selectedAnimation)
  refs.animationList.dataset.disabled = canInteract ? 'false' : 'true'
  refs.animationList.scrollTop = scrollTop

  refs.animationList.querySelectorAll<HTMLButtonElement>('[data-animation-name]').forEach((button) => {
    button.disabled = !canInteract
    button.addEventListener('click', () => {
      const animationName = button.dataset.animationName ?? null
      if (!animationName || animationName === state.selectedAnimation) {
        return
      }

      state.selectedAnimation = animationName
      applyAnimation()
    })
  })
}

function applyAnimation(): void {
  if (!state.player || !state.selectedAnimation) {
    renderControls()
    return
  }

  setAnimationPreservingViewport(state.player, state.selectedAnimation, state.isLooping)
  syncPlaybackState()
  renderControls()
  queueStageAnchorRender()
}

function applySkin(): void {
  if (!state.player || !state.selectedSkin || !state.player.skeleton) {
    renderControls()
    return
  }

  state.player.skeleton.setSkinByName(state.selectedSkin)
  state.player.skeleton.setSlotsToSetupPose()
  resetSkeletonPhysics(state.player)
  renderControls()
  queueStageAnchorRender()
}

function refreshFixedViewportForCurrentCanvas(): void {
  if (!state.player) {
    return
  }

  const viewport = createPannableViewport(
    getPlayerCanvasSize(state.player),
    { scale: state.previewScale, panX: state.panX, panY: state.panY },
  )
  installFixedViewport(state.player, viewport)
}

function isStageInteractive(): boolean {
  return Boolean(
    state.player
    && state.selectedAsset?.status === 'supported'
    && !state.isLoadingPreview,
  )
}

function applyZoomAt(event: WheelEvent, nextScale: number): void {
  if (!state.player) {
    return
  }

  const canvasSize = getPlayerCanvasSize(state.player)
  const rect = state.player.dom.getBoundingClientRect()
  applyViewState(
    zoomAtScreenPoint(
      canvasSize,
      currentViewState(),
      { x: event.clientX - rect.left, y: event.clientY - rect.top },
      nextScale,
    ),
  )
  refreshFixedViewportForCurrentCanvas()
  queueStageAnchorRender()
  renderControls()
}

function applyPanDelta(dxPixels: number, dyPixels: number): void {
  if (!state.player) {
    return
  }

  applyViewState(
    panByPixels(getPlayerCanvasSize(state.player), currentViewState(), dxPixels, dyPixels),
  )
  refreshFixedViewportForCurrentCanvas()
  queueStageAnchorRender()
}

function resetView(): void {
  applyViewState({ scale: 1, panX: 0, panY: 0 })
  refreshFixedViewportForCurrentCanvas()
  queueStageAnchorRender()
  renderControls()
}

function currentViewState(): ViewState {
  return { scale: state.previewScale, panX: state.panX, panY: state.panY }
}

function applyViewState(view: ViewState): void {
  state.previewScale = view.scale
  state.panX = view.panX
  state.panY = view.panY
}

function applyStageBackground(): void {
  if (state.backgroundMode === 'custom') {
    refs.stageFrame.dataset.bgMode = 'custom'
    refs.stageFrame.style.setProperty('--stage-bg', state.backgroundCustom)
  } else {
    refs.stageFrame.dataset.bgMode = 'default'
    refs.stageFrame.style.removeProperty('--stage-bg')
  }

  refs.bgColorInput.value = state.backgroundCustom
  persistStageBackgroundPreference()
  renderBackgroundControls()
}

function renderBackgroundControls(): void {
  refs.bgValue.textContent = state.backgroundMode === 'custom'
    ? state.backgroundCustom.toUpperCase()
    : '默认'

  refs.bgRow.querySelectorAll<HTMLButtonElement>('.bg-swatch').forEach((swatch) => {
    const isActive = swatch.dataset.bgMode === 'default'
      ? state.backgroundMode === 'default'
      : state.backgroundMode === 'custom'
        && swatch.dataset.bgColor?.toLowerCase() === state.backgroundCustom.toLowerCase()
    swatch.classList.toggle('is-active', isActive)
  })
}

function loadStageBackgroundPreference(): void {
  try {
    const raw = window.localStorage.getItem(STAGE_BACKGROUND_STORAGE_KEY)
    if (!raw) {
      return
    }

    const parsed = JSON.parse(raw) as { mode?: unknown; color?: unknown }
    if (parsed.mode === 'custom' && typeof parsed.color === 'string' && isHexColor(parsed.color)) {
      state.backgroundMode = 'custom'
      state.backgroundCustom = parsed.color
    }
  } catch {
    // 忽略损坏的本地偏好
  }
}

function persistStageBackgroundPreference(): void {
  try {
    window.localStorage.setItem(STAGE_BACKGROUND_STORAGE_KEY, JSON.stringify({
      mode: state.backgroundMode,
      color: state.backgroundCustom,
    }))
  } catch {
    // 存储不可用时静默降级
  }
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value)
}

function renderStageAnchor(): void {
  if (!shouldShowStageAnchor() || !state.player) {
    refs.stageAnchor.hidden = true
    return
  }

  const viewport = getInstalledViewport(state.player)
  if (!viewport) {
    refs.stageAnchor.hidden = true
    return
  }

  const playerRect = state.player.dom.getBoundingClientRect()
  const stageRect = refs.stageFrame.getBoundingClientRect()
  const markerPosition = projectWorldPointToStage(
    { x: 0, y: 0 },
    viewport,
    {
      left: playerRect.left,
      top: playerRect.top,
      width: playerRect.width,
      height: playerRect.height,
    },
    {
      left: stageRect.left,
      top: stageRect.top,
    },
  )

  refs.stageAnchor.hidden = !markerPosition.visible
  refs.stageAnchor.style.left = `${markerPosition.left}px`
  refs.stageAnchor.style.top = `${markerPosition.top}px`
}

function queueViewportRefresh(): void {
  if (viewportRefreshFrame) {
    window.cancelAnimationFrame(viewportRefreshFrame)
  }

  viewportRefreshFrame = window.requestAnimationFrame(() => {
    viewportRefreshFrame = 0
    refreshFixedViewportForCurrentCanvas()
    queueStageAnchorRender()
  })
}

function queueStageAnchorRender(): void {
  if (stageAnchorFrame) {
    window.cancelAnimationFrame(stageAnchorFrame)
  }

  stageAnchorFrame = window.requestAnimationFrame(() => {
    stageAnchorFrame = 0
    renderStageAnchor()
  })
}

function shouldShowStageAnchor(): boolean {
  return Boolean(
    state.player
    && state.selectedAsset?.status === 'supported'
    && !state.isLoadingPreview
    && !state.previewMessage,
  )
}

function syncPlaybackState(): void {
  if (!state.player) {
    return
  }

  if (state.isPlaying) {
    state.player.play()
  } else {
    state.player.pause()
  }
}

function resetPlaybackState(): void {
  state.animationOptions = []
  state.skinNames = []
  state.selectedAnimation = null
  state.selectedSkin = null
  state.previewMessage = ''
  state.isLoadingPreview = false
}

function disposePlayer(): void {
  state.loadToken += 1
  if (viewportRefreshFrame) {
    window.cancelAnimationFrame(viewportRefreshFrame)
    viewportRefreshFrame = 0
  }
  if (stageAnchorFrame) {
    window.cancelAnimationFrame(stageAnchorFrame)
    stageAnchorFrame = 0
  }
  panPointer = null
  refs.stageFrame.classList.remove('is-panning')
  if (state.player) {
    state.player.dispose()
    state.player = null
  }
  refs.stageAnchor.hidden = true
  refs.stageHost.innerHTML = ''
}

function updateStaticControls(): void {
  refs.speedRange.min = '0.25'
  refs.speedRange.max = '3'
  refs.speedRange.step = '0.05'
  refs.scaleRange.min = String(MIN_PREVIEW_SCALE)
  refs.scaleRange.max = String(MAX_PREVIEW_SCALE)
  refs.scaleRange.step = '0.05'
  renderAll()
}

function getStageNotice(selected: SpineAssetEntry | null): string {
  if (state.isLoadingPreview) {
    return ''
  }

  if (!selected) {
    return state.scanMessage || '当前没有可显示的资源。'
  }

  if (selected.status !== 'supported') {
    return selected.statusMessage
  }

  return state.previewMessage
}

function getStageState(selected: SpineAssetEntry | null): 'empty' | 'legacy' | 'broken' | 'supported' {
  if (!selected) {
    return 'empty'
  }

  return selected.status
}

function buildOptions(items: string[], selectedValue: string | null, emptyLabel: string): string {
  if (items.length === 0) {
    return `<option value="">${emptyLabel}</option>`
  }

  return items
    .map((item) => {
      const selected = item === selectedValue ? ' selected' : ''
      return `<option value="${escapeHtml(item)}"${selected}>${escapeHtml(item)}</option>`
    })
    .join('')
}

function getStatusLabel(status: SpineAssetEntry['status']): string {
  if (status === 'supported') {
    return '可播放'
  }

  if (status === 'legacy') {
    return '旧版'
  }

  return '损坏'
}

function getInstalledViewport(player: SpinePlayer): InstalledViewport | null {
  const instance = player as SpinePlayer & {
    currentViewport?: Partial<InstalledViewport>
    config?: {
      viewport?: Partial<InstalledViewport>
    }
  }

  const candidate = instance.currentViewport ?? instance.config?.viewport
  if (!candidate) {
    return null
  }

  if (
    typeof candidate.x !== 'number'
    || typeof candidate.y !== 'number'
    || typeof candidate.width !== 'number'
    || typeof candidate.height !== 'number'
  ) {
    return null
  }

  return {
    x: candidate.x,
    y: candidate.y,
    width: candidate.width,
    height: candidate.height,
  }
}

function getAppMarkup(): string {
  return `
    <div class="shell">
      <header class="topbar">
        <h1>新版 Spine 资源查看器</h1>
      </header>

      <main class="workspace">
        <aside class="panel panel-assets">
          <div class="panel-header">
            <h2>资源列表</h2>
            <button id="refresh-button" class="ghost-button" type="button">刷新</button>
          </div>
          <div id="asset-list" class="asset-list"></div>
        </aside>

        <section class="panel panel-stage">
          <div class="stage-topline">
            <h2 id="stage-title">未选择资源</h2>
          </div>
          <div id="stage-frame" class="stage-frame" data-state="empty" data-loading="false">
            <div class="stage-backdrop"></div>
            <div class="stage-grid"></div>
            <div id="stage-anchor" class="stage-anchor" hidden aria-hidden="true">
              <img class="stage-anchor-image" src="${anchorMarkerUrl}" alt="">
            </div>
            <div id="stage-notice" class="stage-notice" hidden></div>
            <div id="stage-host" class="stage-host"></div>
          </div>
        </section>

        <aside class="panel panel-controls">
          <div class="panel-header panel-header-compact">
            <h2>播放控制</h2>
          </div>

          <section class="control-section">
            <div class="control-list-header">
              <span class="control-list-title">动画</span>
              <span class="control-list-title">帧数</span>
            </div>
            <div id="animation-list" class="animation-list"></div>
          </section>

          <label class="control-block">
            <span class="control-label">皮肤</span>
            <select id="skin-select" class="control-select" aria-label="皮肤列表"></select>
          </label>

          <div class="control-row">
            <button id="play-button" class="primary-button" type="button">播放</button>
            <button id="loop-button" class="ghost-button" type="button">循环中</button>
          </div>

          <label class="control-block">
            <span class="control-label with-value">倍速 <span id="speed-value">1.00x</span></span>
            <input id="speed-range" class="control-range" type="range" aria-label="播放速度">
          </label>

          <label class="control-block">
            <span class="control-label with-value">缩放 <span id="scale-value">1.00x</span></span>
            <input id="scale-range" class="control-range" type="range" aria-label="预览缩放">
            <span class="control-hint">滚轮缩放 · 按住拖动移动 · 双击复位</span>
          </label>

          <div class="control-row">
            <button id="view-reset-button" class="ghost-button" type="button">重置视图</button>
          </div>

          <div class="control-block">
            <span class="control-label with-value">背景 <span id="bg-value">默认</span></span>
            <div id="bg-row" class="bg-row">
              <button class="bg-swatch is-default" data-bg-mode="default" type="button" title="默认背景" aria-label="默认背景"></button>
              <button class="bg-swatch" data-bg-color="#ffffff" type="button" title="白色" style="--swatch: #ffffff" aria-label="白色背景"></button>
              <button class="bg-swatch" data-bg-color="#c9c9c9" type="button" title="浅灰" style="--swatch: #c9c9c9" aria-label="浅灰背景"></button>
              <button class="bg-swatch" data-bg-color="#4a4a4a" type="button" title="深灰" style="--swatch: #4a4a4a" aria-label="深灰背景"></button>
              <button class="bg-swatch" data-bg-color="#000000" type="button" title="黑色" style="--swatch: #000000" aria-label="黑色背景"></button>
              <input id="bg-color-input" class="bg-color-input" type="color" value="#ffffff" title="自定义背景色" aria-label="自定义背景色">
            </div>
          </div>
        </aside>
      </main>
    </div>
  `
}

function must<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Missing element: ${selector}`)
  }

  return element
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
