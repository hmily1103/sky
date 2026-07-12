// 静态天幕渐变（位于场景根、不随星空旋转）：深蓝夜空从地平线向天顶变暗，
// 地平线附近加一抹极淡暖辉（城市光污染感），让纯黑的城市剪影与金色描边能从天空里"读"出来。
// 这是"奢侈在框"的工艺层，克制不抢戏。

export const skyDomeVertexShader = /* glsl */ `
  varying float vNy;
  void main() {
    vNy = normalize(position).y; // -1（脚底）.. 1（天顶）
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const skyDomeFragmentShader = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGlow;
  varying float vNy;
  void main() {
    // 地平线(y≈0)偏亮，天顶偏暗；pow 控制过渡陡缓
    float f = pow(clamp(vNy, 0.0, 1.0), 0.55);
    vec3 col = mix(uHorizon, uZenith, f);
    // 地平线附近极淡暖辉（克制）
    float band = exp(-pow((vNy - 0.02) * 6.0, 2.0));
    col += uGlow * band;
    gl_FragColor = vec4(col, 1.0);
  }
`
