// 亮星辉光着色器：柔光晕 + 十字衍射星芒（天文摄影质感）。
// 仅用于视星等低于阈值的少数最亮星与亮行星，克制不抢戏。additive 叠加。

export const glowVertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;

  uniform float uPixelRatio;
  uniform float uSizeScale;

  varying vec3 vColor;

  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uSizeScale * uPixelRatio * (180.0 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`

export const glowFragmentShader = /* glsl */ `
  precision mediump float;

  uniform float uOpacity;  // 全局透明度（收尾淡出 + 逐颗点亮）
  uniform float uReveal;   // 0..1 淡入进度

  varying vec3 vColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv) * 2.0;
    // 柔光晕：范围更小、更淡，只给亮星一点点空气感
    float glow = exp(-r * r * 4.0) * 0.45;
    // 十字衍射星芒（更细更短，避免大白十字）
    float sx = exp(-abs(uv.y) * 22.0) * max(0.0, 1.0 - abs(uv.x) * 3.2);
    float sy = exp(-abs(uv.x) * 22.0) * max(0.0, 1.0 - abs(uv.y) * 3.2);
    float spike = sx + sy;
    float a = glow * 0.65 + spike * 0.55;
    float alpha = a * uOpacity * uReveal;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`
