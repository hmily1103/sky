// 出生时刻解析模块。
//
// 核心准确性问题（规范第 5 节）：用户输入的“出生时间”是出生地当地民用时间，
// 必须按 IANA 时区正确换算成 UTC，并处理夏令时。
// 绝不能用浏览器当前时区，也不能简单 new Date(date + time) 拼接。
//
// 使用 Luxon 完成时区 / 夏令时换算。

import { DateTime } from 'luxon'
import { BirthMoment } from '../types/sky'

const DEFAULT_TIME = '21:00'

function cleanTime(time: string | undefined): string {
  return time && /^\d{1,2}:\d{2}$/.test(time.trim()) ? time.trim() : DEFAULT_TIME
}

function toIsoLocal(date: string, time: string): string {
  return `${date} ${time}`
}

/**
 * 把“日期 + 当地时刻 + IANA 时区”解析为统一时刻结构。
 * - localDateTime：出生地当地时刻（人类可读）
 * - utcDateTime：换算后的 UTC（ISO，供 astronomy-engine 使用）
 * - isTimeEstimated：用户未提供时间时为 true（默认当地 21:00）
 */
export function resolveBirthMoment(date: string, time: string | undefined, timezone: string): BirthMoment {
  const t = cleanTime(time)
  const local = DateTime.fromISO(`${date}T${t}`, { zone: timezone })

  // 时区无效或日期非法时的兜底（不应发生，按 UTC 直译并标记）
  if (!local.isValid) {
    const fb = DateTime.fromISO(`${date}T${t}`, { zone: 'UTC' })
    return {
      localDateTime: toIsoLocal(date, t),
      timezone: 'UTC',
      utcDateTime: fb.toUTC().toISO() ?? '',
      isTimeEstimated: !time,
    }
  }

  return {
    localDateTime: toIsoLocal(date, t),
    timezone,
    utcDateTime: local.toUTC().toISO() ?? '',
    isTimeEstimated: !time,
  }
}

/**
 * 把“日期 + 当地时刻 + IANA 时区”转换为 UTC 的 JS Date（供 astronomy-engine 计算）。
 * 正确处理夏令时与历史时区规则（由 Luxon / IANA 数据库负责）。
 */
export function toUtcDate(date: string, time: string | undefined, timezone: string): Date {
  const t = cleanTime(time)
  const local = DateTime.fromISO(`${date}T${t}`, { zone: timezone })
  const safe = local.isValid ? local : DateTime.fromISO(`${date}T${t}`, { zone: 'UTC' })
  return safe.toUTC().toJSDate()
}
