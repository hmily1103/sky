import * as Astronomy from 'astronomy-engine'
const observer = new Astronomy.Observer(39.9042, 116.4074, 50) // 北京
const date = new Date('2024-03-18T13:00:00Z') // UTC 21:00 北京
const raDegToHours = (d) => (((d % 360) + 360) % 360) / 15

// 北极星 Polaris: RA≈37.95°(=2.53h), Dec≈+89.26°
const raDeg = 37.9529,
  dec = 89.2641
const bug = Astronomy.Horizon(date, observer, raDeg, dec, 'normal') // 错误:度当小时
const fix = Astronomy.Horizon(date, observer, raDegToHours(raDeg), dec, 'normal') // 正确
console.log('Polaris 修复前(度当小时): alt=%s az=%s', bug.altitude.toFixed(2), bug.azimuth.toFixed(2))
console.log('Polaris 修复后(正确换算): alt=%s az=%s', fix.altitude.toFixed(2), fix.azimuth.toFixed(2))
console.log('天文常识: 北极星高度角应≈当地纬度 39.90°, 方位角≈0°(正北)')

const b2 = Astronomy.Horizon(date, observer, 90, 0, 'normal')
const f2 = Astronomy.Horizon(date, observer, raDegToHours(90), 0, 'normal')
console.log('\n赤道星(RA90°,Dec0) 修复前 az=%s alt=%s', b2.azimuth.toFixed(1), b2.altitude.toFixed(1))
console.log('赤道星(RA90°,Dec0) 修复后 az=%s alt=%s', f2.azimuth.toFixed(1), f2.altitude.toFixed(1))
