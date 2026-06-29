import { describe, expect, it } from 'vitest'

import { projectWorldPointToStage } from './anchorMarker'

describe('projectWorldPointToStage', () => {
  it('maps the skeleton origin into stage pixels using the fixed viewport', () => {
    expect(
      projectWorldPointToStage(
        { x: 0, y: 0 },
        { x: -320, y: -180, width: 640, height: 480 },
        {
          left: 120,
          top: 80,
          width: 640,
          height: 480,
        },
        {
          left: 20,
          top: 10,
        },
      ),
    ).toEqual({
      left: 420,
      top: 370,
      visible: true,
    })
  })

  it('hides the marker when the viewport is invalid', () => {
    expect(
      projectWorldPointToStage(
        { x: 0, y: 0 },
        { x: -320, y: -180, width: 0, height: 480 },
        {
          left: 120,
          top: 80,
          width: 640,
          height: 480,
        },
        {
          left: 20,
          top: 10,
        },
      ),
    ).toEqual({
      left: 0,
      top: 0,
      visible: false,
    })
  })
})
