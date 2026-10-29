import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { saveSettings } from "@/lib/store";
import type { BarkLevel, BarkOptions } from "@/lib/types";

/** Bark App 内置铃声（与 Bark 仓库 Sounds 目录一致）。 */
const BARK_SOUNDS = [
  "alarm", "anticipate", "bell", "birdsong", "bloom", "calypso", "chime", "choo",
  "descent", "electronic", "fanfare", "glass", "gotosleep", "healthnotification",
  "horn", "ladder", "mailsent", "minuet", "multiwayinvitation", "newmail",
  "newsflash", "noir", "paymentsuccess", "shake", "sherwoodforest", "silence",
  "spell", "suspense", "telegraph", "tiptoes", "typewriters", "update",
];

// Radix Select 不允许空字符串作为选项值，用占位值表示「Bark 默认铃声」。
const DEFAULT_SOUND = "__default__";

const LEVEL_LABELS: Record<BarkLevel, string> = {
  default: "不指定",
  active: "active（立即亮屏显示）",
  time_sensitive: "timeSensitive（专注模式也显示）",
  passive: "passive（只加入通知列表，不亮屏）",
  critical: "critical（重要警告，忽略静音与勿扰）",
};

/**
 * Bark 推送增强设置：通知等级、铃声、音量与持续响铃。
 *
 * 这些参数只在 Bark 推送里生效；所有项都可以留空/保持默认，此时请求与旧版
 * 完全一致。
 */
export function BarkPushSettings({ options }: { options: BarkOptions }) {
  const [volume, setVolume] = useState(options.volume === null ? "" : String(options.volume));
  useEffect(() => setVolume(options.volume === null ? "" : String(options.volume)), [options.volume]);

  const save = (patch: Partial<BarkOptions>) =>
    void saveSettings({ barkOptions: { ...options, ...patch } });

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-border/55 bg-background/30 p-3">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <BellRing className="size-3.5" aria-hidden="true" /> Bark 推送增强
      </p>

      <div className="field-group">
        <Label htmlFor="bark-level" className="control-label">通知等级</Label>
        <Select value={options.level} onValueChange={(value) => save({ level: value as BarkLevel })}>
          <SelectTrigger id="bark-level" className="control-surface w-full" aria-label="通知等级">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(LEVEL_LABELS) as BarkLevel[]).map((level) => (
              <SelectItem key={level} value={level}>{LEVEL_LABELS[level]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-4 break-words text-muted-foreground">
          「重要警告」需要先在 iPhone 设置与 Bark App 里开启对应权限；开启后会忽略静音和勿扰模式。
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6rem] gap-2">
        <div className="field-group">
          <Label htmlFor="bark-sound" className="control-label">铃声</Label>
          <Select
            value={options.sound || DEFAULT_SOUND}
            onValueChange={(value) => save({ sound: value === DEFAULT_SOUND ? "" : value })}
          >
            <SelectTrigger id="bark-sound" className="control-surface w-full" aria-label="铃声">
              <SelectValue />
            </SelectTrigger>
            {/* 铃声多达 30 余项，默认的 item-aligned 会铺满整个窗口、无处点击收起；
                改为贴着输入框弹出并限制高度，列表内滚动。 */}
            <SelectContent position="popper" className="max-h-64">
              <SelectItem value={DEFAULT_SOUND}>Bark 默认</SelectItem>
              {/* 旧配置里手填的自定义铃声不在内置列表中时，保留为可选项，避免被悄悄清空。 */}
              {options.sound && !BARK_SOUNDS.includes(options.sound) && (
                <SelectItem value={options.sound}>{options.sound}（自定义）</SelectItem>
              )}
              {BARK_SOUNDS.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] leading-4 break-words text-muted-foreground">
            可在 Bark App 的「铃声」页试听。
          </p>
        </div>
        <div className="field-group">
          <Label htmlFor="bark-volume" className="control-label">音量</Label>
          <Input
            id="bark-volume"
            inputMode="numeric"
            className="control-surface select-text tabular-nums"
            placeholder="默认 5"
            value={volume}
            onChange={(event) => setVolume(event.target.value.replace(/\D/g, ""))}
            onBlur={() => {
              if (volume.trim() === "") {
                if (options.volume !== null) save({ volume: null });
                return;
              }
              const parsed = Math.min(Number.parseInt(volume, 10), 10);
              if (parsed !== options.volume) save({ volume: parsed });
              else setVolume(String(parsed));
            }}
          />
          <p className="text-[11px] leading-4 break-words text-muted-foreground">
            0–10，仅「重要警告」生效。
          </p>
        </div>
      </div>

      <div className="setting-row">
        <Label htmlFor="bark-call" className="text-sm font-normal">持续响铃</Label>
        <Switch
          id="bark-call"
          aria-label="持续响铃"
          checked={options.call}
          onCheckedChange={(call) => save({ call })}
        />
      </div>
      <p className="text-[11px] leading-4 break-words text-muted-foreground">
        开启后铃声重复播放约 30 秒；配合「重要警告」可在静音、勿扰模式下持续响铃。
      </p>
    </div>
  );
}
