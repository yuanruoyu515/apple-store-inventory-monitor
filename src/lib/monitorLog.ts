import { describeAvailability, type TargetState, type StatusTone } from "./types.ts";

export type DeliveryTone = "fast" | "soon" | "standard" | "later" | "unavailable" | "unknown";

export interface DeliveryPresentation {
  /** 表格里的紧凑日期，例如“10/14”或“9/22 – 9/25”。 */
  label: string;
  /** 不依赖颜色的速度提示，例如“明天”或“30 天后”。 */
  timing: string;
  tone: DeliveryTone;
  /** 清理 HTML 后的 Apple 原始文案，供悬浮说明与辅助技术读取。 */
  detail: string;
}

/** 只解释本轮业务字段；库存判定与到货通知仍以引擎结果为准。 */
export function describeMonitorStatus(row: Pick<TargetState, "availability" | "pickupDetails">): {
  label: string; tone: StatusTone; detail: string | null;
} {
  const a = row.availability;
  const base = describeAvailability(a);
  if (a.kind === "unknown") {
    const labels: Record<string, string> = {
      pickup_pending: "待开放取货",
      no_pickup_data: "暂无取货数据", store_pickup_unavailable: "暂停取货",
      product_not_returned: "未返回型号",
      blocked: "请求被拦截", rate_limited: "请求被限流",
      cooling_down: "保护冷却中",
      transport: "查询失败", schema_drift: "响应解析失败", apple_error: "Apple 返回错误",
      browser_unavailable: "浏览器未连接",
    };
    const detail = a.reason === "pickup_pending" && row.pickupDetails
      ? [
          `取货=${short(row.pickupDetails.pickupDisplay)}`,
          row.pickupDetails.pickupQuote ? `Apple：${short(row.pickupDetails.pickupQuote)}` : null,
        ].filter(Boolean).join("；")
      : base.detail;
    return { ...base, label: labels[a.reason] ?? base.label, detail };
  }
  const d = row.pickupDetails;
  if (!d) return base;
  const evidence = [
    `取货=${short(d.pickupDisplay)}`,
    d.pickupQuote ? `Apple：${short(d.pickupQuote)}` : null,
    d.saleReason ? `购买=${short(d.saleReason)}` : null,
    d.saleMessage ? `送货：${short(d.saleMessage)}` : null,
  ].filter(Boolean).join("；");
  // 已确认有货时绝不被送货描述覆盖；暂未开售必须有明确业务证据。
  if (a.kind === "out_of_stock") {
    if (d.saleReason === "COMING_SOON") {
      return { ...base, label: "即将发售", tone: "comingSoon", detail: evidence };
    }
    if (d.saleReason === "NOT_FOR_SALE") {
      const presale = /暂未发售|尚未发售|not yet available/i.test(d.saleMessage ?? "");
      return { ...base, label: presale ? "暂未开售" : "暂不可购买", tone: presale ? "presale" : "notForSale", detail: evidence };
    }
    if (d.pickupDisplay === "ineligible") return { ...base, label: "不支持取货", tone: "pickupUnsupported", detail: evidence };
  }
  return { ...base, detail: evidence };
}

function short(raw: string): string {
  const text = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

export function describeBrowserFailure(rows: Pick<TargetState, "availability">[]): string | null {
  for (const row of rows) {
    if (row.availability.kind === "unknown" && row.availability.reason === "browser_unavailable") {
      return row.availability.detail;
    }
  }
  return null;
}

/** 只决定用户可执行的排查步骤，不推断占用者，也不触发清理。 */
export function describeBrowserRecovery(detail: string): string[] {
  if (/未找到.*(?:Chrome|Edge|Chromium|浏览器)/i.test(detail)) {
    return [
      "安装 Google Chrome 或 Microsoft Edge，使用默认安装位置（Mac 请放入“应用程序”目录）；手动打开一次，确认浏览器能够正常启动。",
      "回到果到雷达点击“处理后重试”；如果监控已暂停，点击“开始监控”。",
    ];
  }
  if (/拒绝访问|权限不足|系统阻止|access is denied|permission denied|operation not permitted|os error 5\b/i.test(detail)) {
    return [
      "查看安全软件的保护历史记录或拦截记录，检查是否阻止果到雷达启动 Chrome/Edge 或访问专属资料目录；确认被拦截时，允许对应程序。",
      "如果电脑受公司或管理员策略限制，请联系管理员处理权限；解除限制后回到软件重试。",
    ];
  }
  if (/目录.*(?:占用|锁)|目录锁|另一个.*实例|遗留.*进程|退出码\s*21|exit code:\s*21/i.test(detail)) {
    return [
      "从果到雷达的托盘菜单选择“退出”（Windows 在右下角，Mac 在顶部菜单栏），完全退出所有果到雷达实例；只关主窗口会留在后台。",
      "软件会自动关闭自己启动的专属浏览器及其子进程，无需手动关闭 Chrome/Edge。重新打开一次果到雷达，然后点击“开始监控”。",
      "如果仍然报同样的错误，重启电脑后仅打开一次果到雷达，再开始监控。",
    ];
  }
  return [
    "手动打开 Google Chrome 或 Microsoft Edge，确认浏览器能够正常启动；打不开时，先更新或修复浏览器。",
    "从果到雷达的托盘菜单选择“退出”，再重新打开软件并开始监控。",
  ];
}

/** 同一次启动故障只记一条汇总，正常门店和其他故障仍按项记录。 */
export function describeCycleRows(cycle: number, rows: TargetState[], previousFailure: string | null = null): string[] {
  const lines: string[] = [];
  const failures = new Map<string, number>();
  for (const row of rows) {
    const a = row.availability;
    if (a.kind === "unknown" && a.reason === "browser_unavailable") {
      failures.set(a.detail, (failures.get(a.detail) ?? 0) + 1);
    } else {
      lines.push(describeCycleRow(cycle, row));
    }
  }
  for (const [detail, count] of failures) {
    if (detail !== previousFailure) {
      lines.unshift(`第 ${cycle} 轮 · 查询浏览器未连接，影响 ${count} 项监控：${detail}。库存尚未更新；运行中会按设置间隔重新连接。`);
    }
  }
  return lines;
}

/**
 * 把 Apple 的送货文案整理成一眼可扫读的日期与速度等级。
 *
 * 这里只负责展示，不参与取货库存判断。无法识别的地区化文案仍会原样展示，
 * 避免因为新增地区或 Apple 改文案就把“可送货”错误折叠成“暂无送货”。
 */
export function describeDelivery(
  pickupDetails?: Pick<NonNullable<TargetState["pickupDetails"]>, "saleMessage" | "deliveryDate">,
  checkedAtMs: number | null = Date.now(),
): DeliveryPresentation | null {
  const detail = short(pickupDetails?.saleMessage ?? "");
  if (!detail) return null;

  if (/暂无|不提供|不可送|未发售|尚未发售|not (?:currently )?available|unavailable|not offered|no delivery|提供(?:されて)?いません/i.test(detail)) {
    return { label: "暂无送货", timing: "Apple 未提供日期", tone: "unavailable", detail };
  }

  const referenceMs = checkedAtMs ?? Date.now();
  const encoded = pickupDetails?.deliveryDate?.match(/^(20\d{2})(\d{2})(\d{2})$/);
  const encodedDates = encoded ? parseDeliveryDates(`${encoded[1]}/${encoded[2]}/${encoded[3]}`) : [];
  const textDates = parseDeliveryDates(detail);
  const dates = textDates.length ? textDates : encodedDates;
  if (dates.length > 0) {
    const firstDays = daysFrom(referenceMs, dates[0]!);
    return {
      label: dates.map(formatShortDate).join(dates.length > 1 ? " – " : ""),
      timing: deliveryTiming(firstDays),
      tone: deliveryTone(firstDays),
      detail,
    };
  }

  if (/今天|今日|today|当日|same[ -]?day|\d+\s*(?:小时|小時|hours?)/i.test(detail)) {
    return { label: compactDeliveryLabel(detail), timing: "当日送达", tone: "fast", detail };
  }
  if (/明天|明日|tomorrow/i.test(detail)) {
    return { label: compactDeliveryLabel(detail), timing: "1 天内", tone: "fast", detail };
  }

  return {
    label: compactDeliveryLabel(detail),
    timing: "以 Apple 返回的送货说明为准",
    tone: "unknown",
    detail,
  };
}

/** 提取 Apple 明确返回的到店取货日期；不把它误当成送货日期。 */
export function describePickupDate(pickupQuote?: string | null): string | null {
  const dates = parseDeliveryDates(short(pickupQuote ?? ""));
  return dates[0] ? formatShortDate(dates[0]) : null;
}

/** 这是 Apple 建议再次查询的日期，绝不能标成“可取货日期”。 */
export function describePickupRecheckDate(pickupQuote?: string | null): string | null {
  const match = short(pickupQuote ?? "").match(/\bCheck back for availability on (\d{1,2})\.(\d{1,2})\b/i);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (!parseDeliveryDates(`2024/${month}/${day}`).length) return null;
  return `${month}/${day} 再查`;
}

function parseDeliveryDates(raw: string): Date[] {
  const values: Date[] = [];
  const seen = new Set<number>();
  const pattern = /\b(20\d{2})[/.\-](\d{1,2})[/.\-](\d{1,2})\b/g;
  for (const match of raw.matchAll(pattern)) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 12);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) continue;
    const time = date.getTime();
    if (!seen.has(time)) {
      seen.add(time);
      values.push(date);
    }
  }
  return values;
}

function daysFrom(referenceMs: number, deliveryDate: Date): number {
  const reference = new Date(referenceMs);
  const referenceDay = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 12);
  return Math.round((deliveryDate.getTime() - referenceDay.getTime()) / 86_400_000);
}

function deliveryTiming(days: number): string {
  if (days <= 0) return "今天";
  if (days === 1) return "明天";
  return `${days} 天后`;
}

function deliveryTone(days: number): DeliveryTone {
  if (days <= 1) return "fast";
  if (days <= 3) return "soon";
  if (days <= 7) return "standard";
  return "later";
}

function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function compactDeliveryLabel(raw: string): string {
  const withoutPrice = raw.split(/\s+[—–-]\s+/u)[0]?.trim() || raw;
  const compact = withoutPrice.replace(/\b20\d{2}[/.\-](\d{1,2})[/.\-](\d{1,2})\b/g, "$1/$2");
  return compact.length > 28 ? `${compact.slice(0, 28)}…` : compact;
}

export function describeCycleRow(cycle: number, row: TargetState): string {
  const { label, detail } = describeMonitorStatus(row);
  const t = row.target;
  const watchBand = t.companionPart
    ? `；送货搭配表带=${t.companionName ? `${t.companionName} [${t.companionPart}]` : t.companionPart}`
    : "";
  return `第 ${cycle} 轮 · ${label}：${t.storeTitle} [${t.storeNumber}] ${t.productName} [${t.partNumber}]${watchBand}${detail ? `（${detail}）` : ""}`;
}

export function describeCycleSummary(rows: TargetState[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = describeMonitorStatus(row).label;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, count]) => `${label} ${count} 项`).join("、") || "无监控项";
}
