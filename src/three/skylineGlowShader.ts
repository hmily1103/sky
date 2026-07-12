// 天际线金色描边辉光带着色器
// 几何为沿天际线顶部的 triangle-strip 横幅：顶端(aV=1)最亮，向下(aV=0)渐隐为透明，
// 形成"烫金发光描边"的辉光，而不是一条孤零零的 1px 细线。

export const skylineGlowVertexShader = /* glsl */ `
  attribute float aV;
  varying float vV;
  void main() {
    vV = aV;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const skylineGlowFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vV;
  void main() {
    // 顶端最亮，向下平滑渐隐；pow 让辉光集中在贴近金线处
    float g = pow(clamp(vV, 0.0, 1.0), 1.7);
    gl_FragColor = vec4(uColor * g, g * uOpacity);
  }
`
