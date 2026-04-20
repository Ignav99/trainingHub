/**
 * Export a board SVG element as PNG.
 */
export function exportBoardPNG(svgElement: SVGSVGElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      // 2x for retina quality
      canvas.width = svgElement.clientWidth * 2
      canvas.height = svgElement.clientHeight * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('No canvas context'))
      ctx.scale(2, 2)
      ctx.drawImage(img, 0, 0, svgElement.clientWidth, svgElement.clientHeight)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG'))
    }
    img.src = url
  })
}

/**
 * Download a data URL as a file.
 */
export function downloadPNG(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
