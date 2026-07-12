# 你来的那一夜 · The Night You Arrived

沉浸式「出生夜空」体验。用户输入出生日期、时间、地点，通过时间倒流动画与逐颗点亮的星空，看到**自己来到这个世界那一刻**天空的模样。

> 这不是星座占卜、不是 AI 随机生成的星图、不编造「NASA 认证」。
> 天体位置依据真实天文计算（恒星星表 + astronomy-engine），但地平线轮廓、银河纹理、星点光晕、闪烁、雾化、环境音与镜头动画属于**视觉增强**，不代表当晚肉眼实际所见。

---

## 1. 启动方式

```bash
# 依赖安装（仅首次）
npm install

# 本地开发（默认 http://localhost:5173）
npm run dev

# 生产构建（tsc 类型检查 + vite 打包，产物在 dist/）
npm run build

# 预览构建产物
npm run preview
```

要求 Node ≥ 18（开发期使用 Node 22 验证通过）。无需后端、无需登录、无外部付费服务（地理编码使用本地城市库，不调用线上 API）。

**无头自检脚本**（CI / 本地排查用，需系统已装 Chrome）：

```bash
node scripts/smoke.mjs
```

它会自动驱动表单 → 地点确认 → 倒流 → 点亮 → 信息 → 凝视 → 数据面板 → 收尾 全流程，在 `scripts/shots/` 留图，并校验：不存在城市会报错、地点确认卡出现、数据面板含地点信息、console / 网络零错误。

---

## 2. 项目文件结构

```
the-night-you-arrived/
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
├─ scripts/
│  ├─ smoke.mjs               # 无头浏览器全流程自检
│  └─ shots/                  # 自检留图
└─ src/
   ├─ main.tsx                # 挂载（刻意不加 StrictMode，避免 R3F/音频双挂载）
   ├─ App.tsx                 # 总编排：阶段状态机 + 输入校验 + 回退提示 + 数据面板
   ├─ types/
   │  └─ sky.ts               # 数据契约：BirthSkyInput / SkyObject / SkyData / GeoLocationResult / BirthMoment
   ├─ config/
   │  └─ animationConfig.ts   # 所有动画/渲染参数集中处
   ├─ astronomy/              # 第二轮新增：真实天文计算层（与渲染解耦）
   │  ├─ types.ts             # 计算层类型：ComputedStar / ComputedPlanet / AstronomicalSkyResult
   │  ├─ location.ts          # resolveBirthLocation（本地城市库 + IANA 时区，异步、可替换）
   │  ├─ time.ts              # resolveBirthMoment / toUtcDate（Luxon + IANA 时区 + 夏令时）
   │  ├─ starCatalog.ts       # 内置亮星星表 + 来源声明
   │  ├─ starPosition.ts      # 星表 → 地平坐标 + 地平线以上标记
   │  ├─ solarSystem.ts       # 月亮 / 行星 / 太阳（太阳仅用于白昼判断）
   │  ├─ galaxy.ts            # 真实银道坐标系 → 地平坐标的银河带
   │  └─ skyService.ts        # 统一入口 getAstronomicalSky + 缓存 + toSkyData
   ├─ lib/                    # 纯逻辑层（与渲染解耦）
   │  ├─ prng.ts              # 确定性随机（视觉模拟兜底用）
   │  ├─ color.ts             # 黑体色温 → RGB；B-V → 色温；大气消光
   │  ├─ skyGenerator.ts      # 视觉模拟生成（兜底）+ getRealAstronomicalSky 委托入口
   │  ├─ geo.ts               # 复用 astronomy/location 的城市库（模拟兜底）
   │  ├─ horizon.ts           # 由地形类别生成地平线剪影（视觉模拟）
   │  ├─ skyBuilder.ts        # 数据层 → GPU 缓冲；horizontalToScenePosition 单一坐标约定
   │  └─ starCatalog.json     # 内置亮星星表（1627 颗）
   ├─ three/
   │  ├─ starShader.ts        # 自定义 GLSL：逐颗淡入 + 非同步闪烁 + 柔光 + 大气消光
   │  └─ SkyScene.tsx         # R3F 主场景：构建几何/材质、方向标记 N/E/S/W、拖动凝视、收尾
   ├─ scenes/                 # 阶段 DOM 叠层
   │  ├─ InputScene.tsx       # 表单 + 生成前地点确认
   │  ├─ RewindOverlay.tsx
   │  ├─ InfoOverlay.tsx
   │  ├─ Controls.tsx
   │  ├─ DataPanel.tsx        # 真实数据说明面板
   │  └─ EndingOverlay.tsx
   └─ styles/global.css
```

### 数据流（三层分离）

```
BirthSkyInput（日期/时间/地点）
   │  getAstronomicalSky()          ← astronomy/ 数据层：地点解析 + 时区换算 + 天文计算 + 缓存
   ▼
AstronomicalSkyResult（真实恒星/月亮/行星/太阳高度 + 元数据）
   │  toSkyData()                   ← 映射为渲染契约
   ▼
SkyData（objects: SkyObject[] + 元数据）
   │  buildSkyScene()               ← lib/ 渲染层：数据 → 顶点缓冲 / 几何 / 地平线
   ▼
BuiltSky → SkyScene + starShader   ← GPU：着色器逐颗点亮 + 拖动凝视 + 方向标记
   ▼
6 阶段体验（input → rewind → rising → info → gaze → ending）
```

React 与 Three.js 只接收**已经计算完成**的数据，不执行任何天文计算（spec §8）。

---

## 3. 真实计算范围（本轮已实现）

| 内容 | 实现 | 说明 |
|------|------|------|
| **恒星位置** | 真实星表（RA/Dec J2000）→ astronomy-engine 换算观测时刻地平坐标 | 1627 颗亮星；岁差/章动由库处理 |
| **月亮位置** | astronomy-engine 计算地平坐标 + 月相（满月分数） | 地平线以下不渲染 |
| **行星位置** | 水/金/火/木/土/天王/海王星，由 astronomy-engine 计算 | 地平线以下不渲染；标签默认隐藏 |
| **太阳** | 参与白昼判断（不直接渲染） | 太阳在地平线以上 → 提示「白天出生 / 天文视图」 |
| **银河带走向** | 真实银道坐标系（银心/北银极）定位 | 纹理与光晕仍为视觉增强 |
| **大气消光** | 近地平星更暗、更偏红（Kasten-Young 气团 + 差异化消光） | 视觉物理近似 |
| **时区/夏令时** | Luxon + IANA，含历史时区规则 | 用户输入的当地民用时间 → 正确 UTC |
| **地点解析** | 本地城市库（中文/拼音/英文别名 + IANA 时区） | 生成前确认，不凭模糊字符串直接生成 |

**视觉增强（明确区分，不代表真实所见）**：地平线轮廓（按地形类别程序化，非真实地貌）、银河纹理与光晕、星点光晕与轻微非同步闪烁、雾化与暗角、环境音、镜头动画、方向标记样式。

---

## 4. 所用天文库与数据来源

- **天文计算库**：[`astronomy-engine`](https://github.com/sinclairzx81/astronomy-engine)（纯 TypeScript，无依赖，支持地平坐标、月亮/行星、岁差/章动）。
- **恒星星表**：基于 **d3-celestial 公开亮星星表**（Hipparcos / Yale Bright Star Catalogue 派生），取视星等 ≤ 5.0 的亮星精简为项目内置 `src/lib/starCatalog.json`，共 **1627 颗**，含赤经/赤纬（J2000）、视星等、B-V 色指数。
- **数据许可**：以 d3-celestial 原始发布为准（CC-BY 4.0）。**本项目未使用 Gaia 数据，请勿声称使用 Gaia。**
- **时间库**：[`luxon`](https://moment.github.io/luxon/)（IANA 时区数据库，处理夏令时与历史时区规则）。

所有第三方依赖均写入 `package.json`。

---

## 5. 地理编码方案

- 统一入口：`async function resolveBirthLocation(name): Promise<GeoLocationResult>`（`src/astronomy/location.ts`）。
- 当前为**本地城市库**：内置常见城市（必含规范要求的北京/上海/广州/深圳/辽宁锦州/沈阳/成都/重庆/杭州/南京/武汉/西安/青岛/香港/New York/London/Paris/Tokyo/Sydney 等），每城含中文名/拼音/英文别名 + 纬度 + 经度 + **IANA 时区** + 国家码。
- 优先命中本地库（无网络、隐私安全、即时）；接口保持异步，将来插入线上地理编码服务时只需替换 `resolveBirthLocation` 内部实现，调用方不变。
- **不把任何 API Key 硬编码到前端。**
- 无匹配 / 多匹配 / 超时 / 接口失败：统一以 `LocationResolveError` 抛出，由界面显示「未找到该地点，请检查或换用附近城市」，不静默生成。
- 生成前必须显示解析结果（显示名 + 经纬度 + 时区），用户确认后才生成（spec §4.4）。

---

## 6. 时区处理（spec §5，准确性重点）

- 用户输入的出生时间 = **出生地当地民用时间**（如「锦州 12:00」即锦州当地，非 UTC）。
- 统一方法：`resolveBirthMoment(date, time, timezone): BirthMoment` 与 `toUtcDate(...)`，使用 **Luxon + IANA 时区**，正确处理**夏令时**与**历史时区规则**（例如 1990 年北京仍实行夏令时 UTC+9；纽约冬令时 EST / 夏令时 EDT 自动区分）。
- **绝不使用浏览器当前时区**，也**不简单拼接 `new Date(date+time)`**。
- 历史时区能力来自 Luxon 内置的 IANA 数据库；其能力与限制即本项目时区处理的能力与限制（极端历史边界以 IANA 数据为准）。

### 不知道出生时间

- 默认使用出生地当地 **21:00**，`moment.isTimeEstimated = true`；
- 界面明确显示「时间未知，按 21:00 还原」，不把默认时间伪装为用户真实出生时刻。

### 白天出生

- 若太阳在出生时刻位于地平线以上，仍按真实时间计算天体位置；
- 界面提示「你出生时当地处于白昼。为让你看见当时位于天空中的星体，已采用天文视图；太阳光与天空亮度属视觉处理」；
- 太阳位置与大气亮度明确标记为**视觉处理**。

---

## 7. 缓存

- 相同输入缓存天文计算结果（内存 `Map` + `localStorage`）。
- 缓存键包含：日期、时间、纬度、经度、时区、**星表/算法版本**（`sky-v2.1`）。
- 星表或算法版本变化 → 缓存自动失效。
- 避免同一次体验重复计算；动画期间不重复进行天文计算。

---

## 8. 已知精度限制（诚实声明）

- **恒星自行（proper motion）未修正**：对几十年时间跨度的普通亮星影响远小于视觉分辨率，非专业测量级精度；岁差/章动已由 astronomy-engine 处理。
- **非 Gaia 星表**：仅 1627 颗亮星，非完整星表；暗星与深空目标不覆盖。
- **不模拟**：当天真实天气、云层遮挡、光污染、建筑物/地形遮挡、房间或窗户朝向、历史空气透明度、当地精确地形。
- **大气消光为近似**：采用 Kasten-Young 气团公式与差异化消光系数建模，非实测大气剖面。
- **银河带纹理为视觉增强**：走向与中心增亮为真实银道定位，但亮度分布/光晕属艺术处理。
- 页面文案始终区分「真实计算」与「视觉增强」，不出现「NASA 认证」「绝对精确」等未经证实表述。

---

## 9. 测试方法

`node scripts/smoke.mjs` 覆盖端到端流程与若干边界。建议手动核对以下情形：

**地点**：北京 / 辽宁锦州 / London / New York / 不存在的城市（应报错）/ 空地点（应报错）/ 中文与英文地名。
**时间**：已知时间 / 未知时间（默认 21:00 并标注）/ 白天出生（提示准确）/ 夜晚出生 / 夏令时地区 / 非夏令时地区 / 跨日 UTC 转换 / 1980 年代 / 2000 年后 / 闰年 2-29。
**天文表现**：不同时间星空合理变化；相同输入结果一致；相同地点相隔半年星座位置明显变化；相同日期不同地点地平坐标不同；月亮位置随日期变化；行星位置非固定随机点；地平线以下天体不显示；亮星明显强于暗星；白天出生提示准确。
**回退**：地理编码失败 / 天文库异常 / 星表加载失败 / 网络断开 / 缓存损坏 —— 均不应白屏，且必须显式提示「当前为视觉演示数据」。

---

## 10. 扩展指引

- **替换地理编码服务**：在 `src/astronomy/location.ts` 的 `resolveBirthLocation` 内接入线上 API（注意密钥走后端代理、不暴露前端），保持返回 `GeoLocationResult` 与抛错约定即可，其余代码不动。
- **升级星表**：替换 `src/lib/starCatalog.json` 为更完整的星表（如保留 `{ra,dec,mag,bv}` 字段），并更新 `src/astronomy/starCatalog.ts` 的 `CATALOG_META`（来源与许可），`buildSkyScene` 的设备裁剪会自动控制渲染数量。

---

## 11. 验收对照（已实现）

- ✅ 输入出生日期/时间/地点 → 解析出经纬度与 IANA 时区
- ✅ 当地时间正确换算 UTC（Luxon + 夏令时 + 历史时区规则）
- ✅ 恒星位置来自星表 + 天文计算（非随机）
- ✅ 月亮与主要行星位置来自天文计算
- ✅ 地平线以下天体不出现在天空
- ✅ 相同输入结果一致（确定性 + 缓存）
- ✅ 不同日期/地点产生天文学上合理的变化
- ✅ 真实数据与视觉增强明确区分（徽标 + 数据面板）
- ✅ 计算失败不伪装成真实结果（显式回退提示）
- ✅ 第一轮时间倒流与星空点亮动画完整保留
- ✅ PC / 移动端正常显示（竖屏适配 + 减弱动效支持）
- ✅ 可运行、可构建（`npm run build` 通过）
- ✅ 生成前地点确认、方向标记 N/E/S/W、真实数据说明面板
- ✅ 控制台无持续报错、无夸大表述

---

## 12. 后续可优化

1. **首星锚点**：开场第一声 chime 与最亮真实星精确定位同步，强化「被第一眼击中」的情绪锚点。
2. **Web Worker**：将天文计算移入 Worker，避免超大城市/星表时的主线程压力（当前 1627 颗在主流设备上瞬时完成，暂未必需）。
3. **更多城市 / 更完整星表 / 线上地理编码接入**。
