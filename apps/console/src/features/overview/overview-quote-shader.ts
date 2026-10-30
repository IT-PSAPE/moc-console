export const overviewQuoteColorTokens = ['--color-background-brand_solid', '--color-text-on-brand'] as const

export const overviewQuoteShader = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color0;
uniform vec3 u_color1;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = vec2((uv.x - 0.78) * u_resolution.x / u_resolution.y, uv.y - 0.5);
  float t = u_time * 0.12;
  float flow = 0.5 + 0.5 * sin(p.x * 2.1 + sin(p.y * 3.0 + t) * 0.75 + t);
  float distance = length(p - vec2(0.2 * sin(t), 0.18 * cos(t * 0.8)));
  float ribbons = smoothstep(0.78, 0.98, sin(distance * 9.0 - t));
  float glow = exp(-dot(p, p) * 0.7);
  float light = clamp(0.03 + flow * 0.12 + ribbons * 0.12 + glow * 0.08, 0.0, 0.35);
  gl_FragColor = vec4(mix(u_color0, u_color1, light), 1.0);
}
`
