// 星星点精灵着色器
// 设计目标：明暗/大小/色温差异、非同步极轻闪烁、柔和光晕、透视景深。
// 所有星星“逐颗点亮”由 uTime 与逐顶点 aReveal 控制。

export const starVertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aReveal;
  attribute float aPhase;
  attribute float aTwk;       // 逐顶点闪烁权重：1=正常闪烁，0=不闪烁（银河带）
  attribute float aHero;      // 首星锚点标记：1=那夜最亮的星（点亮更早、光晕更柔）

  uniform float uTime;        // 自“点亮开始”起经过的秒数
  uniform float uFadeDur;     // 单颗淡入时长
  uniform float uPixelRatio;
  uniform float uSizeScale;
  uniform float uTwinkle;     // 0 = 关闭闪烁（reduced-motion）

  varying vec3 vColor;
  varying float vBright;
  varying float vHero;

  void main() {
    // 逐颗点亮进度（smoothstep 缓动）
    float rev = clamp((uTime - aReveal) / uFadeDur, 0.0, 1.0);
    rev = rev * rev * (3.0 - 2.0 * rev);

    // 极轻、非同步闪烁（银河带 aTwk=0 时不闪烁，保持柔静）
    float tw = 1.0 - uTwinkle * aTwk * (0.22 - 0.22 * sin(uTime * 0.7 + aPhase * 6.2831));

    vBright = rev * tw;
    vHero = aHero;
    vColor = aColor;

    // 首星光晕略大，便于视线落在“那夜第一颗星”上（克制：仅 1.6 倍）
    float heroLift = 1.0 + 0.6 * aHero;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float size = aSize * uSizeScale * heroLift * (0.45 + 0.55 * rev);
    gl_PointSize = size * uPixelRatio * (260.0 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`

export const starFragmentShader = /* glsl */ `
  precision mediump float;

  uniform float uOpacity;     // 全局透明度（收尾淡出用）

  varying vec3 vColor;
  varying float vBright;
  varying float vHero;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);          // 0=中心, 0.5=精灵边缘
    if (d > 0.5) discard;

    // 紧致核心：明亮但只占内圈，对应真实星点的“核”
    float coreD = clamp(d / 0.32, 0.0, 1.0);
    float core = pow(1.0 - coreD, 1.8);

    // 向外扩散的柔晕：覆盖整个精灵，亮度沿半径平缓下降，
    // 让星不再是“硬点”，而是一颗带弥散盘的真实星（光学真实）。
    float halo = pow(smoothstep(0.5, 0.0, d), 1.25) * 0.6;

    // 取较亮者：核心明亮、外围柔和过渡
    float intensity = max(core, halo);

    float alpha = intensity * vBright * uOpacity;
    if (alpha < 0.006) discard;

    // 核心更亮更偏白，柔晕保留星的本色
    vec3 col = vColor * (0.6 + 0.8 * core);

    // 首星额外一层极淡外晕，标记“第一颗亮起”的瞬间（克制，不喧宾夺主）
    if (vHero > 0.5) {
      float heroHalo = smoothstep(0.5, 0.04, d) * 0.4;
      col += vColor * heroHalo;
      alpha = clamp(alpha + heroHalo * vBright * uOpacity, 0.0, 1.0);
    }

    gl_FragColor = vec4(col, alpha);
  }
`
