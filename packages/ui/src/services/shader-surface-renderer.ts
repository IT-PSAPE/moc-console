export type ShaderSurfaceRenderer = {
  resize: (width: number, height: number) => void
  render: (time: number) => void
  dispose: () => void
}

const vertexSource = 'attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }'

function readPalette(canvas: HTMLCanvasElement, tokens: readonly string[]): Float32Array[] | null {
  const palette = document.createElement('canvas')
  palette.width = 1
  palette.height = 1
  const context = palette.getContext('2d', { willReadFrequently: true })
  if (!context) return null
  const styles = getComputedStyle(canvas)
  const colors: Float32Array[] = []
  for (const token of tokens) {
    const color = styles.getPropertyValue(token).trim()
    if (!CSS.supports('color', color)) return null
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    const pixel = context.getImageData(0, 0, 1, 1).data
    colors.push(new Float32Array([pixel[0] / 255, pixel[1] / 255, pixel[2] / 255]))
  }
  return colors
}

export function createShaderSurfaceRenderer(canvas: HTMLCanvasElement, fragmentSource: string, colorTokens: readonly string[]): ShaderSurfaceRenderer | null {
  const context = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, powerPreference: 'low-power' })
  if (!context) return null
  const gl = context
  const vertex = gl.createShader(gl.VERTEX_SHADER)
  const fragment = gl.createShader(gl.FRAGMENT_SHADER)
  const program = gl.createProgram()
  const buffer = gl.createBuffer()
  if (!vertex || !fragment || !program || !buffer) {
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    gl.deleteProgram(program)
    gl.deleteBuffer(buffer)
    return null
  }
  gl.shaderSource(vertex, vertexSource)
  gl.shaderSource(fragment, fragmentSource)
  gl.compileShader(vertex)
  gl.compileShader(fragment)
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.bindAttribLocation(program, 0, 'a_position')
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  const palette = readPalette(canvas, colorTokens)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS) || !palette) {
    gl.deleteProgram(program)
    gl.deleteBuffer(buffer)
    return null
  }
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  const timeUniform = gl.getUniformLocation(program, 'u_time')
  const resolutionUniform = gl.getUniformLocation(program, 'u_resolution')
  for (const [index, color] of palette.entries()) gl.uniform3fv(gl.getUniformLocation(program, `u_color${index}`), color)

  function resize(width: number, height: number): void {
    const scale = Math.min(1, 1024 / width, 512 / height)
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    gl.viewport(0, 0, canvas.width, canvas.height)
  }
  function render(time: number): void {
    gl.uniform1f(timeUniform, time)
    gl.uniform2f(resolutionUniform, canvas.width, canvas.height)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
  function dispose(): void {
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
  }
  return { resize, render, dispose }
}
