// 深空天体（梅西耶）柔和图标着色器
// 按类型呈现：星系为沿位置角拉长的椭圆柔斑 + 亮核；星团/星云为圆柔斑（色调由顶点色给定）。
// 透视点尺寸与 starshader 一致，随世界缩放（收尾拉远）一起缩小。additive 叠加，不抢恒星。

export const deepSkyVertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPa;       // 位置角（弧度）
  attribute float aStretch;  // 主轴/次轴比（>=1）

  uniform float uPixelRatio;
  uniform float uSizeScale;

  varying vec3 vColor;
  varying float vPa;
  varying float vStretch;

  void main() {
    vColor = aColor;
    vPa = aPa;
    vStretch = aStretch;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uSizeScale * uPixelRatio * (260.0 / max(-mv.z, 1.0));
    gl_Position = projectionMatrix * mv;
  }
`

export const deepSkyFragmentShader = /* glsl */ `
  precision mediump float;

  uniform float uOpacity;  // 全局透明度（收尾淡出 + 逐颗点亮）
  uniform float uReveal;   // 0..1 淡入进度

  varying vec3 vColor;
  varying float vPa;
  varying float vStretch;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    // 旋转到天体自身坐标系，长轴沿位置角
    float c = cos(-vPa);
    float s = sin(-vPa);
    vec2 r = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    r.x /= max(vStretch, 1.0); // 沿长轴拉伸
    float d = length(r);
    if (d > 0.5) discard;

    float core = smoothstep(0.5, 0.0, d);
    float a = pow(core, 1.6);
    // 亮核：星系/星云中心的更密实感（所有类型都加一点，像真实深空照片的中心增亮）
    float halo = smoothstep(0.2, 0.0, d) * 0.5;
    float alpha = (a + halo) * uOpacity * uReveal;
    if (alpha < 0.006) discard;

    vec3 col = vColor * (0.7 + 0.5 * core);
    gl_FragColor = vec4(col, alpha);
  }
`
