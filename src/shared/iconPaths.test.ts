import { describe, expect, it } from 'vitest'

import { getWindowIconPath } from './iconPaths'

describe('getWindowIconPath', () => {
  it('uses the packaged resources folder after build', () => {
    expect(
      getWindowIconPath({
        isPackaged: true,
        appPath: 'E:/project/newspine/spine4-viewer',
        resourcesPath: 'E:/project/newspine/spine4-viewer/release/win-unpacked/resources',
      }),
    ).toBe('E:\\project\\newspine\\spine4-viewer\\release\\win-unpacked\\resources\\icon.ico')
  })

  it('uses the local build-resources icon during development', () => {
    expect(
      getWindowIconPath({
        isPackaged: false,
        appPath: 'E:/project/newspine/spine4-viewer',
        resourcesPath: 'unused',
      }),
    ).toBe('E:\\project\\newspine\\spine4-viewer\\build-resources\\icon.ico')
  })
})
