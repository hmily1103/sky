// 从抓取的 Messier 目录原始表格生成 src/astronomy/data/messier.json。
// 数据为真实天文坐标（J2000），来源：Wikipedia "List of Messier objects"。
// 仅用于构建期生成静态数据文件，不进运行时。
import fs from 'node:fs'
import path from 'node:path'

const RAW = `M1|Crab Nebula|supernova remnant|05h 34m 31.9s|+22°00′52.2″|8.44|6.83
M2|—|globular cluster|21h 33m 27.0s|−00°49′23.7″|6.5|16
M3|—|globular cluster|13h 42m 11.6s|+28°22′38.2″|6.2|18
M4|Spider Globular Cluster|globular cluster|16h 23m 35.2s|−26°31′32.7″|5.6|26
M5|Rose Cluster|globular cluster|15h 18m 33.2s|+02°04′51.7″|5.6|23
M6|Butterfly Cluster|open cluster|17h 40.1m|−32°13′|4.2|25
M7|Ptolemy's Cluster|open cluster|17h 53m 51.2s|−34°47′34″|3.3|80
M8|Lagoon Nebula|diffuse nebula|18h 03m 37s|−24°23′12″|4.6|90×40
M9|—|globular cluster|17h 19m 11.8s|−18°30′58.5″|7.7|9.3
M10|—|globular cluster|16h 57m 8.9s|−04°05′58.1″|6.6|20
M11|Wild Duck Cluster|open cluster|18h 51.1m|−06°16′|5.8|22.8
M12|—|globular cluster|16h 47m 14.2s|−01°56′54.7″|6.7|16
M13|Great Hercules Cluster|globular cluster|16h 41m 41.2s|+36°27′35.5″|5.8|20
M14|—|globular cluster|17h 37m 36.2s|−03°14′45.3″|7.6|11
M15|Great Pegasus Cluster|globular cluster|21h 29m 58.3s|+12°10′01.2″|6.2|18
M16|Eagle Nebula|diffuse nebula|18h 18m 48s|−13°49′|6.4|70×50
M17|Omega Nebula|diffuse nebula|18h 20m 26s|−16°10′36″|6.0|11
M18|Black Swan Cluster|open cluster|18h 19.9m|−17°08′|7.5|9.8
M19|—|globular cluster|17h 02m 37.7s|−26°16′04.6″|6.8|17
M20|Trifid Nebula|diffuse nebula|18h 02m 23s|−23°01′48″|6.3|28
M21|Webb's Cross Cluster|open cluster|18h 04.6m|−22°30′|6.5|14
M22|Great Sagittarius Cluster|globular cluster|18h 36m 23.9s|−23°54′17.1″|5.1|32
M23|—|open cluster|17h 56.8m|−19°01′|5.5|35
M24|Small Sagittarius Star Cloud|Milky Way star cloud|18h 17m|−18°33′|2.5|120×60
M25|—|open cluster|18h 31.6m|−19°15′|4.6|36
M26|—|open cluster|18h 45.2m|−09°24′|8.0|14
M27|Dumbbell Nebula|planetary nebula|19h 59m 36.3s|+22°43′16.1″|7.4|8.0×5.6
M28|—|globular cluster|18h 24m 32.9s|−24°52′11.4″|6.8|11.2
M29|Cooling Tower Cluster|open cluster|20h 23m 56s|+38°31′24″|7.1|7
M30|Jellyfish Cluster|globular cluster|21h 40m 22.1s|−23°10′47.5″|7.2|12
M31|Andromeda Galaxy|galaxy|00h 42m 44.3s|+41°16′09″|3.4|190×60
M32|Andromeda Satellite #1|galaxy|00h 42m 41.8s|+40°51′55″|8.1|8.7×6.5
M33|Triangulum Galaxy|galaxy|01h 33m 50.0s|+30°39′36.7″|5.5|70.8×41.7
M34|Spiral Cluster|open cluster|02h 42.1m|+42°46′|5.5|35
M35|Shoe-Buckle Cluster|open cluster|06h 09.1m|+24°21′|5.3|28
M36|Pinwheel Cluster|open cluster|05h 36m 12s|+34°08′04″|6.3|12
M37|Salt and Pepper Cluster|open cluster|05h 52m 18s|+32°33′02″|6.2|24
M38|Starfish Cluster|open cluster|05h 28m 42s|+35°51′18″|7.4|21
M39|Pyramid Cluster|open cluster|21h 31m 42s|+48°26′00″|4.6|29
M40|Winnecke 4|optical double|12h 22m 12.5s|+58°04′59″|8.4|0.86
M41|Little Beehive Cluster|open cluster|06h 46.0m|−20°46′|4.5|38
M42|Great Orion Nebula|diffuse nebula|05h 35m 17.3s|−05°23′28″|4.0|65×60
M43|De Mairan's Nebula|diffuse nebula|05h 35.6m|−05°16′|9.0|20×15
M44|Beehive Cluster|open cluster|08h 40.4m|+19°59′|3.7|95
M45|Pleiades|open cluster|03h 47m 24s|+24°07′00″|1.6|120
M46|—|open cluster|07h 41.8m|−14°49′|6.0|22.8
M47|—|open cluster|07h 36.6m|−14°30′|4.4|30
M48|—|open cluster|08h 13.7m|−05°45′|5.5|30
M49|—|galaxy|12h 29m 46.7s|+08°00′02″|8.4|10.2×8.3
M50|Heart-Shaped Cluster|open cluster|07h 03.2m|−08°20′|5.9|16
M51|Whirlpool Galaxy|galaxy|13h 29m 52.7s|+47°11′43″|8.4|11.2×6.9
M52|Scorpion Cluster|open cluster|23h 24.2m|+61°35′|7.3|13
M53|—|globular cluster|13h 12m 55.3s|+18°10′05.4″|7.6|13
M54|—|globular cluster|18h 55m 03.3s|−30°28′47.5″|7.6|12
M55|Specter Cluster|globular cluster|19h 39m 59.7s|−30°57′53.1″|6.3|19
M56|—|globular cluster|19h 16m 35.6s|+30°11′00.5″|8.3|8.8
M57|Ring Nebula|planetary nebula|18h 53m 35.1s|+33°01′45.0″|8.8|3.83×3.83
M58|—|galaxy|12h 37m 43.5s|+11°49′05″|9.7|5.9×4.7
M59|—|galaxy|12h 42m 02.3s|+11°38′49″|9.6|5.4×3.7
M60|—|galaxy|12h 43m 39.6s|+11°33′09″|8.8|7.4×6.0
M61|Swelling Spiral Galaxy|galaxy|12h 21m 54.9s|+04°28′25″|9.7|6.5×5.8
M62|Flickering Globular|globular cluster|17h 01m 12.6s|−30°06′44.5″|6.5|15
M63|Sunflower Galaxy|galaxy|13h 15m 49.3s|+42°01′45″|8.6|12.6×7.2
M64|Black Eye Galaxy|galaxy|12h 56m 43.7s|+21°40′58″|8.5|10.7×5.1
M65|Leo Triplet|galaxy|11h 18m 55.9s|+13°05′32″|9.3|8.7×2.5
M66|Leo Triplet|galaxy|11h 20m 15.0s|+12°59′30″|8.9|9.1×4.2
M67|King Cobra Cluster|open cluster|08h 51.3m|+11°49′|6.1|30
M68|—|globular cluster|12h 39m 28.0s|−26°44′38.6″|7.8|11
M69|—|globular cluster|18h 31m 23.1s|−32°20′53.1″|7.6|10.8
M70|—|globular cluster|18h 43m 12.8s|−32°17′31.6″|7.9|8
M71|Angelfish Cluster|globular cluster|19h 53m 46.5s|+18°46′45.1″|8.2|7.2
M72|—|globular cluster|20h 53m 27.7s|−12°32′14.3″|9.3|6.6
M73|—|asterism|20h 58m 54s|−12°38′|9.0|2.8
M74|Phantom Galaxy|galaxy|01h 36m 41.8s|+15°47′01″|9.4|10.5×9.5
M75|—|globular cluster|20h 06m 04.8s|−21°55′16.2″|8.5|6.8
M76|Little Dumbbell Nebula|planetary nebula|01h 42.4m|+51°34′31″|10.1|2.7×1.8
M77|Cetus A|galaxy|02h 42m 40.7s|−00°00′48″|8.9|7.1×6.0
M78|—|diffuse nebula|05h 46m 46.7s|+00°00′50″|8.3|8×6
M79|—|globular cluster|05h 24m 10.6s|−24°31′27.3″|7.7|8.7
M80|—|globular cluster|16h 17m 02.4s|−22°58′33.9″|7.3|10
M81|Bode's Galaxy|galaxy|09h 55m 33.2s|+69°03′55″|6.9|26.9×14.1
M82|Cigar Galaxy|galaxy|09h 55m 52.2s|+69°40′47″|8.4|11.2×4.3
M83|Southern Pinwheel Galaxy|galaxy|13h 37m 00.9s|−29°51′57″|7.6|12.9×11.5
M84|—|galaxy|12h 25m 03.7s|+12°53′13″|9.1|6.5×5.6
M85|—|galaxy|12h 25m 24.0s|+18°11′28″|9.1|7.1×5.5
M86|—|galaxy|12h 26m 11.7s|+12°56′46″|8.9|8.9×5.8
M87|Virgo A|galaxy|12h 30m 49.4s|+12°23′28.0″|8.6|7.2×6.8
M88|—|galaxy|12h 31m 59.2s|+14°25′14″|9.6|6.9×3.7
M89|—|galaxy|12h 35m 39.8s|+12°33′23″|9.8|5.1×4.7
M90|Carabin Galaxy|galaxy|12h 36m 49.8s|+13°09′46″|9.5|9.5×4.4
M91|—|galaxy|12h 35m 26.4s|+14°29′47″|10.2|5.4×4.3
M92|—|globular cluster|17h 17m 07.4s|+43°08′09.4″|6.4|14
M93|Critter Cluster|open cluster|07h 44.6m|−23°52′|6.0|10
M94|Crocodile Eye Galaxy|galaxy|12h 50m 53.1s|+41°07′14″|8.2|11.2×9.1
M95|—|galaxy|10h 43m 57.7s|+11°42′14″|9.7|3.1×2.9
M96|—|galaxy|10h 46m 45.7s|+11°49′12″|9.2|7.6×5.2
M97|Owl Nebula|planetary nebula|11h 14m 47.7s|+55°01′08.5″|9.9|3.4×3.3
M98|—|galaxy|12h 13m 48.3s|+14°54′01.7″|10.1|9.8×2.8
M99|St. Catherine's Wheel|galaxy|12h 18m 49.6s|+14°24′59″|9.9|5.4×4.7
M100|Mirror Galaxy|galaxy|12h 22m 54.9s|+15°49′21″|9.3|7.4×6.3
M101|Pinwheel Galaxy|galaxy|14h 03m 12.6s|+54°20′57″|7.9|28.8×26.9
M102|Spindle Galaxy|galaxy|15h 06m 29.5s|+55°45′48″|9.9|4.7×1.9
M103|—|open cluster|01h 33.2m|+60°42′|7.4|6
M104|Sombrero Galaxy|galaxy|12h 39m 59.4s|−11°37′23″|8.0|9×4
M105|—|galaxy|10h 47m 49.6s|+12°34′54″|9.3|5.4×4.8
M106|—|galaxy|12h 18m 57.5s|+47°18′14″|8.4|18.6×7.2
M107|Crucifix Cluster|globular cluster|16h 32m 31.9s|−13°03′13.6″|7.9|10
M108|Surfboard Galaxy|galaxy|11h 11m 31.0s|+55°40′27″|10.0|8.7×2.2
M109|Vacuum Cleaner Galaxy|galaxy|11h 57m 36.0s|+53°22′28″|9.8|7.6×4.7
M110|Andromeda Satellite #2|galaxy|00h 40m 22.1s|+41°41′07″|8.5|21.9×11.0`

const TYPE_MAP = {
  'open cluster': 'open',
  'globular cluster': 'globular',
  'diffuse nebula': 'nebula',
  'planetary nebula': 'planetary',
  'supernova remnant': 'snr',
  galaxy: 'galaxy',
  'optical double': 'double',
  asterism: 'asterism',
  'Milky Way star cloud': 'nebula',
}

function parseRA(s) {
  const m = s.match(/(\d+(?:\.\d+)?)h\s*(?:(\d+(?:\.\d+)?)m)?(?:\s*(\d+(?:\.\d+)?)s)?/)
  if (!m) return 0
  const h = +m[1]
  const mn = m[2] ? +m[2] : 0
  const sec = m[3] ? +m[3] : 0
  return (h + mn / 60 + sec / 3600) * 15
}

function parseDec(s) {
  s = s.replace(/−/g, '-')
  const m = s.match(/([+-]?)(\d+(?:\.\d+)?)°\s*(?:(\d+(?:\.\d+)?)′?)?(?:\s*(\d+(?:\.\d+)?)″)?/)
  if (!m) return 0
  const sign = m[1] === '-' ? -1 : 1
  const d = +m[2]
  const mn = m[3] ? +m[3] : 0
  const sec = m[4] ? +m[4] : 0
  return sign * (d + mn / 60 + sec / 3600)
}

function parseSize(s) {
  s = s.replace(/−/g, '-')
  if (s.includes('×')) {
    const [a, b] = s.split('×').map((x) => parseFloat(x))
    return [a || 1, b || 1]
  }
  const v = parseFloat(s)
  return [v || 1, v || 1]
}

const out = []
for (const line of RAW.split('\n')) {
  if (!line.trim()) continue
  const [m, name, type, raStr, decStr, magStr, sizeStr] = line.split('|')
  const kind = TYPE_MAP[type]
  if (!kind) {
    console.warn('skip unknown type', type, 'for', m)
    continue
  }
  out.push({
    m: m.trim(),
    name: (name || '').trim(),
    type: kind,
    ra: +parseRA(raStr).toFixed(4),
    dec: +parseDec(decStr).toFixed(4),
    mag: parseFloat(magStr),
    size: parseSize(sizeStr).map((x) => +x.toFixed(2)),
    pa: 0,
  })
}

const outPath = path.resolve(process.cwd(), 'src/astronomy/data/messier.json')
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 2))
console.log(`wrote ${out.length} Messier objects to ${outPath}`)
