import React, { useEffect, useMemo, useState } from "react";
import mqtt from "mqtt";
import skhynixLogo from "./assets/skhynix-logo.jpg";

type TabKey = "home" | "robot" | "job" | "battery" | "map" | "wireless" | "api";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

type UserRole = "viewer" | "operator" | "admin";

type Locale = "ko" | "en";

type RolePermissions = {
  tabs: TabKey[];
  canControl: boolean;
  canDownload: boolean;
};

type PermissionsConfig = Record<Exclude<UserRole, "admin">, RolePermissions>;

type ConnectionState = {
  status: ConnectionStatus;
  latencyMs: number | null;
  lastMessageAt: Date | null;
  error: string | null;
};

type SummaryMetrics = {
  uptimeRate: number;
  activeRobots: number;
  totalRobots: number;
  activeJobs: number;
  avgJobMinutes: number;
  alarms: {
    warn: number;
    crit: number;
  };
  latencyMs: number;
  energyPct: number;
};

type EventItem = {
  t: string;
  type: "INFO" | "WARN" | "CRIT";
  msg: string;
  robot: string;
  status?: string;
};

type RobotStatusItem = {
  id: string;
  state: string;
  bat: string;
  job: string;
  t: string;
};

type JobHistoryItem = {
  t: string;
  job: string;
  robot: string;
  d: string;
  r: string;
};

type BatteryItem = {
  id: string;
  soc: string;
  temp: string;
  cycle: string;
  state: string;
};

type MapStatus = {
  x: number;
  y: number;
  heading: number;
  speed: number;
  mission: string;
  state: string;
};

type MqttPayload =
  | { type: "summary"; payload: Partial<SummaryMetrics> }
  | { type: "events"; payload: EventItem[] | EventItem }
  | { type: "robots"; payload: RobotStatusItem[] | RobotStatusItem }
  | { type: "jobs"; payload: JobHistoryItem[] | JobHistoryItem }
  | { type: "battery"; payload: BatteryItem[] | BatteryItem }
  | { type: "map"; payload: Partial<MapStatus> }
  | { type: "latency"; payload: { ms: number } };

const defaultSummary: SummaryMetrics = {
  uptimeRate: 92,
  activeRobots: 18,
  totalRobots: 20,
  activeJobs: 36,
  avgJobMinutes: 4.2,
  alarms: {
    warn: 2,
    crit: 0,
  },
  latencyMs: 120,
  energyPct: 78,
};

const defaultEvents: EventItem[] = [
  { t: "14:12:08", type: "WARN", msg: "지연 증가(>200ms)", robot: "AMR-03", status: "확인 필요" },
  { t: "14:10:21", type: "INFO", msg: "미션 시작", robot: "AMR-03", status: "정상" },
  { t: "14:08:55", type: "INFO", msg: "구역 A 진입", robot: "AMR-03", status: "정상" },
];

const defaultRobotStatus: RobotStatusItem[] = [
  { id: "AMR-01", state: "RUN", bat: "82%", job: "픽업 → 드롭", t: "14:12:10" },
  { id: "AMR-02", state: "IDLE", bat: "64%", job: "-", t: "14:12:02" },
  { id: "AMR-03", state: "RUN", bat: "75%", job: "검사 라인 이동", t: "14:11:58" },
  { id: "AMR-04", state: "CHARGE", bat: "31%", job: "충전 스테이션", t: "14:11:40" },
];

const defaultJobHistory: JobHistoryItem[] = [
  { t: "14:10", job: "라인A→라인B", robot: "AMR-01", d: "3m 40s", r: "완료" },
  { t: "14:08", job: "창고→포장", robot: "AMR-03", d: "4m 02s", r: "완료" },
  { t: "14:06", job: "라인C→검사", robot: "AMR-02", d: "2m 55s", r: "완료" },
];

const defaultBatteryInventory: BatteryItem[] = [
  { id: "AMR-01", soc: "82%", temp: "32°C", cycle: "412", state: "정상" },
  { id: "AMR-02", soc: "64%", temp: "35°C", cycle: "389", state: "정상" },
  { id: "AMR-03", soc: "75%", temp: "37°C", cycle: "465", state: "점검" },
];

const defaultMapStatus: MapStatus = {
  x: 12.34,
  y: 8.21,
  heading: 275,
  speed: 1.2,
  mission: "픽업(노드 21) → 드롭(노드 07)",
  state: "RUN",
};

const defaultConnectionState: ConnectionState = {
  status: "disconnected",
  latencyMs: null,
  lastMessageAt: null,
  error: null,
};

const I18N = {
  ko: {
    "tab.home": "홈",
    "tab.robot": "로봇 상태",
    "tab.job": "작업 이력",
    "tab.battery": "배터리 정보",
    "tab.map": "지도",
    "tab.wireless": "무선 진단",
    "tab.api": "API & 다운로드",
    "tabDesc.home": "운영 요약 대시보드",
    "tabDesc.robot": "개별/전체 상태",
    "tabDesc.job": "작업 이력 분석",
    "tabDesc.battery": "배터리 추세",
    "tabDesc.map": "지도·밀도·품질",
    "tabDesc.wireless": "신호·핑·로밍",
    "tabDesc.api": "API/내보내기",
    "status.system": "시스템 상태",
    "status.normal": "정상 운영",
    "status.lastCheck": "마지막 점검 2시간 전",
    "header.title": "AMR 실시간 운영 대시보드",
    "header.connection": "연결",
    "header.latency": "지연",
    "header.lastUpdate": "마지막 업데이트",
    "label.robot": "로봇",
    "label.zone": "구역",
    "label.all": "전체",
    "chip.alarms": "알람",
    "chip.events": "이벤트",
    "label.search": "검색",
    "placeholder.search": "로봇 ID, 이벤트",
    "auth.login": "로그인",
    "auth.logout": "로그아웃",
    "auth.selectAccount": "계정 선택",
    "auth.confirmLogin": "로그인",
    "label.user": "사용자",
    "label.license": "라이선스",
    "label.licenseOk": "OK",
    "section.summary": "운영 요약",
    "section.summaryRange": "최근 2시간",
    "section.fleet": "플릿 상태",
    "section.realtime": "실시간",
    "section.events": "최근 이벤트",
    "section.eventsHint": "클릭 시 상세",
    "section.robotStatus": "개별 로봇 상태",
    "section.jobGraph": "작업 이력 그래프",
    "section.jobRange": "일/주/월",
    "section.jobList": "세그먼트 & 작업",
    "section.jobRecent": "최근 50건",
    "section.batteryGraphs": "배터리 그래프",
    "section.batteryHint": "SOC/온도/전류",
    "section.batteryInventory": "배터리 인벤토리",
    "section.batteryByRobot": "로봇별 상태",
    "section.mapView": "지도 뷰",
    "section.mapHint": "위치 밀도 / 로컬라이제이션 / 무선",
    "section.mapRobot": "로봇 상태",
    "section.mapRealtime": "초단위 갱신",
    "section.mapRoute": "구역/경로 정보",
    "section.mapRouteHint": "금지구역·장애물",
    "section.wireless": "무선 진단",
    "section.wirelessHint": "Signal / Ping / BSSID / Roams",
    "section.spot": "Spot Details",
    "section.spotHint": "선택 지점 정보",
    "section.api": "API",
    "section.apiHint": "문서/테스트",
    "section.download": "다운로드",
    "section.downloadHint": "PNG/CSV/JSON",
    "section.downloadNote": "정보 영역 / 전체 그래프 다운로드 지원",
    "section.admin": "관리자 메뉴",
    "section.adminHint": "권한 설정",
    "admin.permissions": "권한",
    "admin.control": "조작 가능",
    "admin.download": "다운로드",
    "admin.noPermission": "권한 없음",
    "admin.rolePermissionSuffix": "권한",
    "admin.note": "관리자 권한은 고정이며, 변경 사항은 브라우저에 저장됩니다.",
    "metric.uptime": "가동률",
    "metric.uptimeSub": "최근 24시간 평균",
    "metric.activeRobots": "활성 로봇",
    "metric.totalRobots": "전체",
    "metric.activeJobs": "진행 작업",
    "metric.avgJob": "평균",
    "metric.alarm": "알람",
    "metric.alarmSub": "주의",
    "metric.alarmSubCrit": "위험",
    "metric.latency": "지연",
    "metric.latencySub": "네트워크 RTT",
    "metric.energy": "에너지",
    "metric.energySub": "가중 평균 배터리",
    "metric.running": "작업 중",
    "metric.idle": "대기",
    "metric.charging": "충전 중",
    "metric.immediateCheck": "즉시 확인",
    "placeholder.summary": "(차트) 작업량·가동률·지연 추이",
    "placeholder.robotDist": "(차트) 로봇 상태 분포",
    "placeholder.batteryDist": "(차트) 배터리 분포",
    "placeholder.jobGraph": "(그래프) 작업량/처리시간/성공률",
    "placeholder.batteryGraph": "(그래프) SOC·온도·충방전 추이",
    "placeholder.map": "(맵 영역) 위치·밀도·로컬라이제이션·무선 품질",
    "placeholder.route": "(패널) 현재 경로/다음 목표/구역 이벤트",
    "placeholder.wirelessMap": "(맵) 신호/핑/로밍 포인트 표시",
    "label.time": "시간",
    "label.job": "작업",
    "label.result": "결과",
    "label.duration": "소요",
    "label.state": "상태",
    "label.battery": "배터리",
    "label.temp": "온도",
    "label.cycle": "사이클",
    "label.coordinates": "좌표",
    "label.baseStation": "기지국",
    "label.channel": "채널 6",
    "label.signal": "신호",
    "label.ping": "핑",
    "label.currentPoint": "현재 포인트",
    "label.qualityGood": "품질 양호",
    "label.rtt": "RTT",
    "label.mission": "미션",
    "label.mapState": "상태",
    "label.lastUpdate": "마지막 업데이트",
    "label.sortFilter": "정렬/필터 지원",
    "label.clickDetail": "클릭 시 상세",
    "label.angle": "각도",
    "label.speed": "속도",
    "label.expandSidebar": "사이드바 펼치기",
    "label.collapseSidebar": "사이드바 접기",
    "unit.robots": "대",
    "unit.jobs": "건",
    "unit.count": "건",
    "unit.minutes": "분",
    "time.secondsAgo": "{s}s 전",
    "error.mqttMissing": "VITE_MQTT_URL 미설정",
    "label.systemOk": "정상",
    "label.checkNeeded": "확인 필요",
    "label.complete": "완료",
    "label.monitor": "점검",
    "label.normal": "정상",
    "label.section": "구역",
  },
  en: {
    "tab.home": "Home",
    "tab.robot": "Robot Status",
    "tab.job": "Job History",
    "tab.battery": "Battery Info",
    "tab.map": "Map",
    "tab.wireless": "Wireless",
    "tab.api": "API & Download",
    "tabDesc.home": "Operations summary dashboard",
    "tabDesc.robot": "Individual & fleet status",
    "tabDesc.job": "Job history analysis",
    "tabDesc.battery": "Battery trends",
    "tabDesc.map": "Map, density, quality",
    "tabDesc.wireless": "Signal, ping, roaming",
    "tabDesc.api": "API / export",
    "status.system": "System status",
    "status.normal": "Normal operation",
    "status.lastCheck": "Last check 2 hours ago",
    "header.title": "AMR Real-time Operations Dashboard",
    "header.connection": "Connection",
    "header.latency": "Latency",
    "header.lastUpdate": "Last update",
    "label.robot": "Robot",
    "label.zone": "Zone",
    "label.all": "All",
    "chip.alarms": "Alarms",
    "chip.events": "Events",
    "label.search": "Search",
    "placeholder.search": "Robot ID, event",
    "auth.login": "Login",
    "auth.logout": "Logout",
    "auth.selectAccount": "Select account",
    "auth.confirmLogin": "Login",
    "label.user": "User",
    "label.license": "License",
    "label.licenseOk": "OK",
    "section.summary": "Operations summary",
    "section.summaryRange": "Last 2 hours",
    "section.fleet": "Fleet status",
    "section.realtime": "Real-time",
    "section.events": "Recent events",
    "section.eventsHint": "Click for details",
    "section.robotStatus": "Robot status",
    "section.jobGraph": "Job history graph",
    "section.jobRange": "Day / Week / Month",
    "section.jobList": "Segments & jobs",
    "section.jobRecent": "Last 50",
    "section.batteryGraphs": "Battery info graphs",
    "section.batteryHint": "SOC / Temp / Current",
    "section.batteryInventory": "Battery inventory",
    "section.batteryByRobot": "By robot",
    "section.mapView": "Map view",
    "section.mapHint": "Position density / Localization / Wireless",
    "section.mapRobot": "Robot status",
    "section.mapRealtime": "Updated per second",
    "section.mapRoute": "Zones / Routes",
    "section.mapRouteHint": "No-go areas / obstacles",
    "section.wireless": "Wireless diagnostics",
    "section.wirelessHint": "Signal / Ping / BSSID / Roams",
    "section.spot": "Spot details",
    "section.spotHint": "Selected spot info",
    "section.api": "API",
    "section.apiHint": "Docs / Test",
    "section.download": "Download",
    "section.downloadHint": "PNG / CSV / JSON",
    "section.downloadNote": "Download support for information area / all graphs",
    "section.admin": "Admin menu",
    "section.adminHint": "Permission settings",
    "admin.permissions": "Permissions",
    "admin.control": "Allow control",
    "admin.download": "Download",
    "admin.noPermission": "No access",
    "admin.rolePermissionSuffix": "Permissions",
    "admin.note": "Admin permissions are fixed. Changes are saved in the browser.",
    "metric.uptime": "Uptime",
    "metric.uptimeSub": "Last 24h average",
    "metric.activeRobots": "Active robots",
    "metric.totalRobots": "Total",
    "metric.activeJobs": "Active jobs",
    "metric.avgJob": "Avg",
    "metric.alarm": "Alarms",
    "metric.alarmSub": "Warn",
    "metric.alarmSubCrit": "Crit",
    "metric.latency": "Latency",
    "metric.latencySub": "Network RTT",
    "metric.energy": "Energy",
    "metric.energySub": "Weighted battery average",
    "metric.running": "Running",
    "metric.idle": "Idle",
    "metric.charging": "Charging",
    "metric.immediateCheck": "Immediate action",
    "placeholder.summary": "(Chart) workload, uptime, latency",
    "placeholder.robotDist": "(Chart) robot state distribution",
    "placeholder.batteryDist": "(Chart) battery distribution",
    "placeholder.jobGraph": "(Chart) throughput / duration / success rate",
    "placeholder.batteryGraph": "(Chart) SOC / temp / charge-discharge",
    "placeholder.map": "(Map) position, density, localization, wireless",
    "placeholder.route": "(Panel) current route / next goal / zone events",
    "placeholder.wirelessMap": "(Map) signal/ping/roaming points",
    "label.time": "Time",
    "label.job": "Job",
    "label.result": "Result",
    "label.duration": "Duration",
    "label.state": "State",
    "label.battery": "Battery",
    "label.temp": "Temp",
    "label.cycle": "Cycle",
    "label.coordinates": "Coordinates",
    "label.baseStation": "Base station",
    "label.channel": "Channel 6",
    "label.signal": "Signal",
    "label.ping": "Ping",
    "label.currentPoint": "Current point",
    "label.qualityGood": "Good quality",
    "label.rtt": "RTT",
    "label.mission": "Mission",
    "label.mapState": "State",
    "label.lastUpdate": "Last update",
    "label.sortFilter": "Sort / filter",
    "label.clickDetail": "Click for details",
    "label.angle": "Angle",
    "label.speed": "Speed",
    "label.expandSidebar": "Expand sidebar",
    "label.collapseSidebar": "Collapse sidebar",
    "unit.robots": "robots",
    "unit.jobs": "jobs",
    "unit.count": "count",
    "unit.minutes": "min",
    "time.secondsAgo": "{s}s ago",
    "error.mqttMissing": "VITE_MQTT_URL not set",
    "label.systemOk": "OK",
    "label.checkNeeded": "Needs review",
    "label.complete": "Complete",
    "label.monitor": "Inspection",
    "label.normal": "Normal",
    "label.section": "Zone",
  },
} as const;

type I18nKey = keyof typeof I18N.ko;

const LOCALE_LABELS: Record<Locale, string> = {
  ko: "KR",
  en: "EN",
};

const TRANSLATION_MAP = {
  koToEn: new Map<string, string>([
    ["지연 증가(>200ms)", "Latency increase (>200ms)"],
    ["미션 시작", "Mission started"],
    ["구역 A 진입", "Entered zone A"],
    ["확인 필요", "Needs review"],
    ["정상", "Normal"],
    ["픽업 → 드롭", "Pickup → Drop"],
    ["검사 라인 이동", "Move to inspection line"],
    ["충전 스테이션", "Charging station"],
    ["라인A→라인B", "Line A → Line B"],
    ["창고→포장", "Warehouse → Packing"],
    ["라인C→검사", "Line C → Inspection"],
    ["완료", "Complete"],
    ["점검", "Inspection"],
    ["픽업(노드 21) → 드롭(노드 07)", "Pickup (Node 21) → Drop (Node 07)"],
    ["구역", "Zone"],
  ]),
  enToKo: new Map<string, string>([
    ["Latency increase (>200ms)", "지연 증가(>200ms)"],
    ["Mission started", "미션 시작"],
    ["Entered zone A", "구역 A 진입"],
    ["Needs review", "확인 필요"],
    ["Normal", "정상"],
    ["Pickup → Drop", "픽업 → 드롭"],
    ["Move to inspection line", "검사 라인 이동"],
    ["Charging station", "충전 스테이션"],
    ["Line A → Line B", "라인A→라인B"],
    ["Warehouse → Packing", "창고→포장"],
    ["Line C → Inspection", "라인C→검사"],
    ["Complete", "완료"],
    ["Inspection", "점검"],
    ["Pickup (Node 21) → Drop (Node 07)", "픽업(노드 21) → 드롭(노드 07)"],
    ["Zone", "구역"],
  ]),
};

const TAB_OPTIONS: Array<{ key: TabKey; labelKey: I18nKey; descKey?: I18nKey }> = [
  { key: "home", labelKey: "tab.home", descKey: "tabDesc.home" },
  { key: "robot", labelKey: "tab.robot", descKey: "tabDesc.robot" },
  { key: "job", labelKey: "tab.job", descKey: "tabDesc.job" },
  { key: "battery", labelKey: "tab.battery", descKey: "tabDesc.battery" },
  { key: "map", labelKey: "tab.map", descKey: "tabDesc.map" },
  { key: "wireless", labelKey: "tab.wireless", descKey: "tabDesc.wireless" },
  { key: "api", labelKey: "tab.api", descKey: "tabDesc.api" },
];

const ROLE_LABELS: Record<Locale, Record<UserRole, string>> = {
  ko: {
    viewer: "뷰어",
    operator: "작업자",
    admin: "관리자",
  },
  en: {
    viewer: "Viewer",
    operator: "Operator",
    admin: "Admin",
  },
};

const PERMISSIONS_STORAGE_KEY = "amr-dashboard-permissions";

const DEFAULT_ROLE_PERMISSIONS: PermissionsConfig = {
  viewer: {
    tabs: ["home", "robot", "map"],
    canControl: false,
    canDownload: false,
  },
  operator: {
    tabs: ["home", "robot", "job", "battery", "map", "wireless"],
    canControl: true,
    canDownload: false,
  },
};

const ADMIN_PERMISSIONS: RolePermissions = {
  tabs: ["home", "robot", "job", "battery", "map", "wireless", "api"],
  canControl: true,
  canDownload: true,
};

function getInitialPermissions(): PermissionsConfig {
  if (typeof window === "undefined") {
    return DEFAULT_ROLE_PERMISSIONS;
  }
  const stored = window.localStorage.getItem(PERMISSIONS_STORAGE_KEY);
  if (!stored) {
    return DEFAULT_ROLE_PERMISSIONS;
  }
  try {
    const parsed = JSON.parse(stored) as Partial<PermissionsConfig>;
    return {
      viewer: parsed.viewer ?? DEFAULT_ROLE_PERMISSIONS.viewer,
      operator: parsed.operator ?? DEFAULT_ROLE_PERMISSIONS.operator,
    };
  } catch {
    return DEFAULT_ROLE_PERMISSIONS;
  }
}

function formatLastUpdate(lastMessageAt: Date | null, now: number, t: Translator) {
  if (!lastMessageAt) {
    return "-";
  }
  const diffSeconds = Math.max(0, Math.round((now - lastMessageAt.getTime()) / 1000));
  return t("time.secondsAgo").replace("{s}", diffSeconds.toString());
}

function mergeSummary(prev: SummaryMetrics, payload: Partial<SummaryMetrics>): SummaryMetrics {
  return {
    ...prev,
    ...payload,
    alarms: {
      ...prev.alarms,
      ...payload.alarms,
    },
  };
}

function upsertById<T extends { id: string }>(list: T[], item: T) {
  const index = list.findIndex((entry) => entry.id === item.id);
  if (index === -1) {
    return [item, ...list].slice(0, 50);
  }
  const next = [...list];
  next[index] = { ...next[index], ...item };
  return next;
}

function parseMqttPayload(topic: string, payload: string): MqttPayload | null {
  let data: unknown = null;
  try {
    data = JSON.parse(payload);
  } catch {
    return null;
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const message = data as { type?: string; payload?: unknown };
  if (message.type && message.payload) {
    return message as MqttPayload;
  }

  switch (topic) {
    case "amr/summary":
      return { type: "summary", payload: data as Partial<SummaryMetrics> };
    case "amr/events":
      return { type: "events", payload: data as EventItem[] | EventItem };
    case "amr/robots":
      return { type: "robots", payload: data as RobotStatusItem[] | RobotStatusItem };
    case "amr/jobs":
      return { type: "jobs", payload: data as JobHistoryItem[] | JobHistoryItem };
    case "amr/battery":
      return { type: "battery", payload: data as BatteryItem[] | BatteryItem };
    case "amr/map":
      return { type: "map", payload: data as Partial<MapStatus> };
    case "amr/latency":
      return { type: "latency", payload: data as { ms: number } };
    default:
      return null;
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Translator = (key: I18nKey) => string;

function translateText(value: string, locale: Locale) {
  const map = locale === "en" ? TRANSLATION_MAP.koToEn : TRANSLATION_MAP.enToKo;
  return map.get(value) ?? value;
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-[#f1c4c0] bg-[#fff5f5] px-2 py-1 text-xs font-medium text-[#9b1c1c]">
      {label}
    </span>
  );
}

function StatusDot({ tone = "ok" }: { tone?: "ok" | "warn" | "crit" }) {
  const color =
    tone === "crit" ? "bg-[#ef3124]" : tone === "warn" ? "bg-amber-500" : "bg-emerald-500";
  return <span className={cn("h-2.5 w-2.5 rounded-full", color)} />;
}

function Sidebar({
  tab,
  setTab,
  permissions,
  t,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  permissions: RolePermissions;
  t: Translator;
}) {
  const items = TAB_OPTIONS.filter((item) => permissions.tabs.includes(item.key));

  return (
    <aside className="hidden min-h-screen w-64 flex-col border-r border-[#e5e7eb] bg-white lg:flex">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between">
          <img src={skhynixLogo} alt="SK hynix" className="h-12 w-auto" />
        </div>
        <div className="mt-4 text-lg font-semibold text-[#111827]">AMR Control</div>
        <div className="mt-1 text-xs text-[#6b7280]">Plant Ops Command</div>
      </div>

      <div className="px-4">
        <div className="px-2 text-xs font-semibold text-[#9ca3af]">MAIN</div>
        <div className="mt-2 space-y-1">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition",
                tab === item.key
                  ? "bg-[#fff5f5] text-[#9b1c1c] ring-1 ring-[#f1c4c0]"
                  : "text-[#374151] hover:bg-[#f3f4f6]"
              )}
              aria-label={t(item.labelKey)}
            >
              <>
                <span
                  className={cn(
                    "mt-1 h-2 w-2 rounded-full",
                    tab === item.key ? "bg-[#ef3124]" : "bg-[#d1d5db]"
                  )}
                />
                <span className="flex-1">
                  <div className="text-sm font-medium">{t(item.labelKey)}</div>
                  {item.descKey ? <div className="text-xs text-[#6b7280]">{t(item.descKey)}</div> : null}
                </span>
              </>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto px-6 py-6">
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <div className="text-xs text-[#6b7280]">{t("status.system")}</div>
          <div className="mt-2 flex items-center justify-between text-sm text-[#111827]">
            <div className="flex items-center gap-2">
              <StatusDot />
              {t("status.normal")}
            </div>
            <span className="text-xs text-[#6b7280]">99.98%</span>
          </div>
          <div className="mt-2 text-xs text-[#6b7280]">{t("status.lastCheck")}</div>
        </div>
      </div>
    </aside>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
          <span className="h-2 w-2 rounded-full bg-[#ef3124]" />
          {title}
        </div>
        {right ? <div className="text-xs text-[#6b7280]">{right}</div> : null}
      </div>
      <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  unit,
  sub,
  status,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  status?: "ok" | "warn" | "crit";
}) {
  const ring =
    status === "crit"
      ? "ring-1 ring-rose-200"
      : status === "warn"
        ? "ring-1 ring-amber-200"
        : "ring-0";

  return (
    <div className={cn("rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-sm", ring)}>
      <div className="text-xs text-[#6b7280]">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <div className="text-2xl font-semibold text-[#111827]">{value}</div>
        {unit ? <div className="text-sm text-[#6b7280]">{unit}</div> : null}
      </div>
      {sub ? <div className="mt-1 text-xs text-[#6b7280]">{sub}</div> : <div className="mt-1 h-4" />}
    </div>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-[240px] 2xl:h-[300px] 3xl:h-[340px] items-center justify-center rounded-xl bg-[#f3f4f6] text-sm text-[#6b7280]">
      {label}
    </div>
  );
}

function TopBar({
  tab,
  setTab,
  connection,
  lastUpdateLabel,
  permissions,
  role,
  isLoggedIn,
  loginRole,
  setLoginRole,
  onLogin,
  onLogout,
  locale,
  setLocale,
  t,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  connection: ConnectionState;
  lastUpdateLabel: string;
  role: UserRole;
  permissions: RolePermissions;
  isLoggedIn: boolean;
  loginRole: Exclude<UserRole, "viewer">;
  setLoginRole: (r: Exclude<UserRole, "viewer">) => void;
  onLogin: (r: Exclude<UserRole, "viewer">) => void;
  onLogout: () => void;
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Translator;
}) {
  const [loginOpen, setLoginOpen] = useState(false);

  const visibleTabs = useMemo(
    () => TAB_OPTIONS.filter((item) => permissions.tabs.includes(item.key)),
    [permissions.tabs]
  );

  const statusTone =
    connection.status === "connected"
      ? "ok"
      : connection.status === "connecting"
        ? "warn"
        : connection.status === "error"
          ? "crit"
          : "warn";

  const statusLabel =
    connection.status === "connected"
      ? "OK"
      : connection.status === "connecting"
        ? "CONNECTING"
        : connection.status === "error"
          ? "ERROR"
          : "OFF";

  const latencyLabel = connection.latencyMs !== null ? `${connection.latencyMs}ms` : "-";

  return (
    <div className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-white">
      <div className="h-1 bg-[#ef3124]" />
      <div className="flex flex-wrap items-center gap-4 px-6 py-3">
        <div className="min-w-[220px]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <img src={skhynixLogo} alt="SK hynix" className="h-9 w-auto" />
            {t("header.title")}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-[#6b7280]">
            <StatusDot tone={statusTone} />
            {t("header.connection")}: {statusLabel} · {t("header.latency")} {latencyLabel} ·{" "}
            {t("header.lastUpdate")} {lastUpdateLabel}
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2",
              permissions.canControl ? "" : "opacity-60"
            )}
          >
            <div className="text-xs text-[#6b7280]">{t("label.robot")}</div>
            <select
              className="bg-transparent text-sm text-[#111827] outline-none"
              disabled={!permissions.canControl}
            >
              <option>AMR-01</option>
              <option>AMR-02</option>
              <option>AMR-03</option>
            </select>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2",
              permissions.canControl ? "" : "opacity-60"
            )}
          >
            <div className="text-xs text-[#6b7280]">{t("label.zone")}</div>
            <select
              className="bg-transparent text-sm text-[#111827] outline-none"
              disabled={!permissions.canControl}
            >
              <option>{t("label.all")}</option>
              <option>A</option>
              <option>B</option>
              <option>C</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Chip label={`${t("chip.alarms")} 2`} />
            <Chip label={`${t("chip.events")} 14`} />
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
            <span className="text-xs text-[#6b7280]">{t("label.search")}</span>
            <input
              className={cn(
                "w-40 bg-transparent text-sm text-[#111827] outline-none",
                permissions.canControl ? "" : "opacity-60"
              )}
              placeholder={t("placeholder.search")}
              disabled={!permissions.canControl}
            />
          </div>
          <div className="relative">
            {isLoggedIn ? (
              <button
                className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#374151] hover:bg-[#f3f4f6]"
                onClick={onLogout}
              >
                {t("auth.logout")}
              </button>
            ) : (
              <button
                className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#374151] hover:bg-[#f3f4f6]"
                onClick={() => setLoginOpen((prev) => !prev)}
              >
                {t("auth.login")}
              </button>
            )}
            {!isLoggedIn && loginOpen ? (
              <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-[#e5e7eb] bg-white p-3 shadow-lg">
                <div className="text-xs font-semibold text-[#111827]">{t("auth.selectAccount")}</div>
                <select
                  className="mt-2 w-full rounded-lg border border-[#e5e7eb] px-2 py-1 text-xs text-[#111827]"
                  value={loginRole}
                  onChange={(e) => setLoginRole(e.target.value as Exclude<UserRole, "viewer">)}
                >
                  <option value="operator">{ROLE_LABELS[locale].operator}</option>
                  <option value="admin">{ROLE_LABELS[locale].admin}</option>
                </select>
                <button
                  className="mt-3 w-full rounded-lg bg-[#ef3124] px-2 py-1.5 text-xs text-white hover:bg-[#dc2b20]"
                  onClick={() => {
                    onLogin(loginRole);
                    setLoginOpen(false);
                  }}
                >
                  {t("auth.confirmLogin")}
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#6b7280]">
            2026-01-15 15:24
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-[#e5e7eb] bg-white p-1 text-xs text-[#6b7280]">
            {(["ko", "en"] as const).map((lang) => (
              <button
                key={lang}
                className={cn(
                  "rounded-lg px-2 py-1",
                  locale === lang ? "bg-[#ef3124] text-white" : "text-[#6b7280] hover:bg-[#f3f4f6]"
                )}
                onClick={() => setLocale(lang)}
              >
                {LOCALE_LABELS[lang]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#6b7280]">
            {t("label.user")}: {isLoggedIn ? ROLE_LABELS[locale][role] : ROLE_LABELS[locale].viewer}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#6b7280]">
            {t("label.license")}: {t("label.licenseOk")}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-6 pb-2">
        {visibleTabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm",
              tab === tabItem.key ? "bg-[#ef3124] text-white" : "text-[#374151] hover:bg-[#f3f4f6]"
            )}
          >
            {t(tabItem.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeTab({
  summary,
  events,
  t,
  locale,
}: {
  summary: SummaryMetrics;
  events: EventItem[];
  t: Translator;
  locale: Locale;
}) {
  const alarmStatus = summary.alarms.crit > 0 ? "crit" : summary.alarms.warn > 0 ? "warn" : "ok";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label={t("metric.uptime")}
          value={summary.uptimeRate.toFixed(0)}
          unit="%"
          sub={t("metric.uptimeSub")}
          status="ok"
        />
        <MetricCard
          label={t("metric.activeRobots")}
          value={summary.activeRobots.toString()}
          unit={t("unit.robots")}
          sub={`${t("metric.totalRobots")} ${summary.totalRobots} ${t("unit.robots")}`}
        />
        <MetricCard
          label={t("metric.activeJobs")}
          value={summary.activeJobs.toString()}
          unit={t("unit.jobs")}
          sub={`${t("metric.avgJob")} ${summary.avgJobMinutes.toFixed(1)} ${t("unit.minutes")}`}
        />
        <MetricCard
          label={t("metric.alarm")}
          value={(summary.alarms.warn + summary.alarms.crit).toString()}
          unit={t("unit.count")}
          sub={`${t("metric.alarmSub")} ${summary.alarms.warn} / ${t("metric.alarmSubCrit")} ${summary.alarms.crit}`}
          status={alarmStatus}
        />
        <MetricCard
          label={t("metric.latency")}
          value={summary.latencyMs.toString()}
          unit="ms"
          sub={t("metric.latencySub")}
        />
        <MetricCard
          label={t("metric.energy")}
          value={summary.energyPct.toString()}
          unit="%"
          sub={t("metric.energySub")}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <Section title={t("section.summary")} right={t("section.summaryRange")}>
            <div className="p-4">
              <Placeholder label={t("placeholder.summary")} />
            </div>
          </Section>
          <Section title={t("section.fleet")} right={t("section.realtime")}>
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Placeholder label={t("placeholder.robotDist")} />
                <Placeholder label={t("placeholder.batteryDist")} />
              </div>
            </div>
          </Section>
        </div>

        <Section title={t("section.events")} right={t("section.eventsHint")}>
          <div className="p-4">
            <div className="space-y-2">
              {events.map((e, i) => (
                <button
                  key={i}
                  className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-left hover:bg-[#f3f4f6]"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[#6b7280]">{e.t} · {e.robot}</div>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs border",
                        e.type === "CRIT"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : e.type === "WARN"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]"
                      )}
                    >
                      {e.type}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-[#111827]">
                    {translateText(e.msg, locale)}
                  </div>
                  <div className="mt-1 text-xs text-[#6b7280]">
                    {e.status ? translateText(e.status, locale) : t("label.checkNeeded")}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function RobotStatusTab({
  robots,
  t,
  locale,
}: {
  robots: RobotStatusItem[];
  t: Translator;
  locale: Locale;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          label="RUN"
          value={robots.filter((r) => r.state === "RUN").length.toString()}
          unit={t("unit.robots")}
          sub={t("metric.running")}
          status="ok"
        />
        <MetricCard
          label="IDLE"
          value={robots.filter((r) => r.state === "IDLE").length.toString()}
          unit={t("unit.robots")}
          sub={t("metric.idle")}
        />
        <MetricCard
          label="CHARGE"
          value={robots.filter((r) => r.state === "CHARGE").length.toString()}
          unit={t("unit.robots")}
          sub={t("metric.charging")}
        />
        <MetricCard
          label="ERROR"
          value={robots.filter((r) => r.state === "ERROR").length.toString()}
          unit={t("unit.robots")}
          sub={t("metric.immediateCheck")}
          status={robots.some((r) => r.state === "ERROR") ? "crit" : "ok"}
        />
      </div>

      <Section title={t("section.robotStatus")} right={t("label.sortFilter")}>
        <div className="p-4">
          <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
            <table className="w-full text-sm">
              <thead className="bg-[#f3f4f6] text-xs text-[#6b7280]">
                <tr>
                  <th className="px-3 py-2 text-left">{t("label.robot")}</th>
                  <th className="px-3 py-2 text-left">{t("label.state")}</th>
                  <th className="px-3 py-2 text-left">{t("label.battery")}</th>
                  <th className="px-3 py-2 text-left">{t("label.job")}</th>
                  <th className="px-3 py-2 text-left">{t("label.lastUpdate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {robots.map((r) => (
                  <tr key={r.id} className="hover:bg-[#f3f4f6]">
                    <td className="px-3 py-2">{r.id}</td>
                    <td className="px-3 py-2">{r.state}</td>
                    <td className="px-3 py-2">{r.bat}</td>
                    <td className="px-3 py-2">{translateText(r.job, locale)}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{r.t}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </div>
  );
}

function JobHistoryTab({
  jobs,
  t,
  locale,
}: {
  jobs: JobHistoryItem[];
  t: Translator;
  locale: Locale;
}) {
  return (
    <div className="space-y-6">
      <Section title={t("section.jobGraph")} right={t("section.jobRange")}>
        <div className="p-4">
          <Placeholder label={t("placeholder.jobGraph")} />
        </div>
      </Section>
      <Section title={t("section.jobList")} right={t("section.jobRecent")}>
        <div className="p-4">
          <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
            <table className="w-full text-sm">
              <thead className="bg-[#f3f4f6] text-xs text-[#6b7280]">
                <tr>
                  <th className="px-3 py-2 text-left">{t("label.time")}</th>
                  <th className="px-3 py-2 text-left">{t("label.job")}</th>
                  <th className="px-3 py-2 text-left">{t("label.robot")}</th>
                  <th className="px-3 py-2 text-left">{t("label.duration")}</th>
                  <th className="px-3 py-2 text-left">{t("label.result")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {jobs.map((row, i) => (
                  <tr key={i} className="hover:bg-[#f3f4f6]">
                    <td className="px-3 py-2">{row.t}</td>
                    <td className="px-3 py-2">{translateText(row.job, locale)}</td>
                    <td className="px-3 py-2">{row.robot}</td>
                    <td className="px-3 py-2">{row.d}</td>
                    <td className="px-3 py-2 text-[#6b7280]">
                      {translateText(row.r, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </div>
  );
}

function BatteryInfoTab({
  batteries,
  t,
  locale,
}: {
  batteries: BatteryItem[];
  t: Translator;
  locale: Locale;
}) {
  return (
    <div className="space-y-6">
      <Section title={t("section.batteryGraphs")} right={t("section.batteryHint")}>
        <div className="p-4">
          <Placeholder label={t("placeholder.batteryGraph")} />
        </div>
      </Section>
      <Section title={t("section.batteryInventory")} right={t("section.batteryByRobot")}>
        <div className="p-4">
          <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
            <table className="w-full text-sm">
              <thead className="bg-[#f3f4f6] text-xs text-[#6b7280]">
                <tr>
                  <th className="px-3 py-2 text-left">{t("label.robot")}</th>
                  <th className="px-3 py-2 text-left">SOC</th>
                  <th className="px-3 py-2 text-left">{t("label.temp")}</th>
                  <th className="px-3 py-2 text-left">{t("label.cycle")}</th>
                  <th className="px-3 py-2 text-left">{t("label.state")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {batteries.map((b) => (
                  <tr key={b.id} className="hover:bg-[#f3f4f6]">
                    <td className="px-3 py-2">{b.id}</td>
                    <td className="px-3 py-2">{b.soc}</td>
                    <td className="px-3 py-2">{b.temp}</td>
                    <td className="px-3 py-2">{b.cycle}</td>
                    <td className="px-3 py-2 text-[#6b7280]">
                      {translateText(b.state, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </div>
  );
}

function MapTab({
  mapStatus,
  t,
  locale,
}: {
  mapStatus: MapStatus;
  t: Translator;
  locale: Locale;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Section title={t("section.mapView")} right={t("section.mapHint")}>
        <div className="p-4">
          <Placeholder label={t("placeholder.map")} />
        </div>
      </Section>

      <div className="space-y-6">
        <Section title={t("section.mapRobot")} right={t("section.mapRealtime")}>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="X" value={mapStatus.x.toFixed(2)} unit="m" />
              <MetricCard label="Y" value={mapStatus.y.toFixed(2)} unit="m" />
              <MetricCard label={t("label.angle")} value={mapStatus.heading.toFixed(0)} unit="°" />
              <MetricCard label={t("label.speed")} value={mapStatus.speed.toFixed(1)} unit="m/s" />
            </div>
            <div className="rounded-lg bg-[#f3f4f6] p-3 text-sm text-[#374151]">
              {t("label.mission")}: {translateText(mapStatus.mission, locale)} /{" "}
              {t("label.mapState")}: {translateText(mapStatus.state, locale)}
            </div>
          </div>
        </Section>

        <Section title={t("section.mapRoute")} right={t("section.mapRouteHint")}>
          <div className="p-4">
            <Placeholder label={t("placeholder.route")} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function WirelessDiagnosticsTab({ t }: { t: Translator }) {
  return (
    <div className="space-y-6">
      <Section title={t("section.wireless")} right={t("section.wirelessHint")}>
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {["Signal", "Ping", "BSSID", "Roams", "Other"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-xs text-[#6b7280]"
              >
                {label}
              </span>
            ))}
          </div>
          <Placeholder label={t("placeholder.wirelessMap")} />
        </div>
      </Section>

      <Section title={t("section.spot")} right={t("section.spotHint")}>
        <div className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <MetricCard label={t("label.coordinates")} value="X 24.2 / Y 18.4" sub={t("label.currentPoint")} />
            <MetricCard label={t("label.baseStation")} value="BSSID-02" sub={t("label.channel")} />
            <MetricCard label={t("label.signal")} value="-62" unit="dBm" sub={t("label.qualityGood")} />
            <MetricCard label={t("label.ping")} value="48" unit="ms" sub={t("label.rtt")} />
          </div>
        </div>
      </Section>
    </div>
  );
}

function ApiDownloadTab({
  role,
  permissionsConfig,
  setPermissionsConfig,
  t,
  locale,
}: {
  role: UserRole;
  permissionsConfig: PermissionsConfig;
  setPermissionsConfig: React.Dispatch<React.SetStateAction<PermissionsConfig>>;
  t: Translator;
  locale: Locale;
}) {
  const effectivePermissions =
    role === "admin" ? ADMIN_PERMISSIONS : permissionsConfig[role];

  const updateRolePermission = (
    targetRole: Exclude<UserRole, "admin">,
    update: Partial<RolePermissions>
  ) => {
    setPermissionsConfig((prev) => ({
      ...prev,
      [targetRole]: {
        ...prev[targetRole],
        ...update,
      },
    }));
  };

  return (
    <div className="space-y-6">
      <Section title={t("section.api")} right={t("section.apiHint")}>
        <div className="p-4 space-y-2 text-sm text-[#374151]">
          <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
            GET /api/v1/robots
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
            GET /api/v1/jobs
          </div>
          <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
            GET /api/v1/wireless/diagnostics
          </div>
        </div>
      </Section>

      <Section title={t("section.download")} right={t("section.downloadHint")}>
        <div className="p-4 space-y-3">
          <div
            className={cn(
              "flex items-center gap-3 text-sm text-[#374151]",
              effectivePermissions.canDownload ? "" : "opacity-60"
            )}
          >
            <span className="rounded-full border border-[#e5e7eb] px-3 py-1">PNG</span>
            <span className="rounded-full border border-[#e5e7eb] px-3 py-1">CSV</span>
            <span className="rounded-full border border-[#e5e7eb] px-3 py-1">JSON</span>
          </div>
          <div className="text-xs text-[#6b7280]">
            {t("section.downloadNote")}
            {!effectivePermissions.canDownload ? ` (${t("admin.noPermission")})` : ""}
          </div>
        </div>
      </Section>

      {role === "admin" ? (
        <Section title={t("section.admin")} right={t("section.adminHint")}>
          <div className="p-4 space-y-4 text-sm text-[#374151]">
            {(["viewer", "operator"] as const).map((targetRole) => (
              <div key={targetRole} className="rounded-lg border border-[#e5e7eb] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[#111827]">
                    {ROLE_LABELS[locale][targetRole]} {t("admin.rolePermissionSuffix")}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#6b7280]">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissionsConfig[targetRole].canControl}
                        onChange={(e) =>
                          updateRolePermission(targetRole, { canControl: e.target.checked })
                        }
                      />
                      {t("admin.control")}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissionsConfig[targetRole].canDownload}
                        onChange={(e) =>
                          updateRolePermission(targetRole, { canDownload: e.target.checked })
                        }
                      />
                      {t("admin.download")}
                    </label>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {TAB_OPTIONS.map((tabItem) => (
                    <label
                      key={tabItem.key}
                      className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] px-3 py-2 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={permissionsConfig[targetRole].tabs.includes(tabItem.key)}
                        onChange={(e) => {
                          const nextTabs = e.target.checked
                            ? [...permissionsConfig[targetRole].tabs, tabItem.key]
                            : permissionsConfig[targetRole].tabs.filter((key) => key !== tabItem.key);
                          if (nextTabs.length === 0) {
                            return;
                          }
                          updateRolePermission(targetRole, { tabs: nextTabs });
                        }}
                      />
                      {t(tabItem.labelKey)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <div className="text-xs text-[#6b7280]">
              {t("admin.note")}
            </div>
          </div>
        </Section>
      ) : null}
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabKey>("home");
  const [locale, setLocale] = useState<Locale>("ko");
  const [role, setRole] = useState<UserRole>("viewer");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginRole, setLoginRole] = useState<Exclude<UserRole, "viewer">>("operator");
  const [permissionsConfig, setPermissionsConfig] = useState<PermissionsConfig>(() =>
    getInitialPermissions()
  );
  const [summary, setSummary] = useState<SummaryMetrics>(defaultSummary);
  const [events, setEvents] = useState<EventItem[]>(defaultEvents);
  const [robots, setRobots] = useState<RobotStatusItem[]>(defaultRobotStatus);
  const [jobs, setJobs] = useState<JobHistoryItem[]>(defaultJobHistory);
  const [batteries, setBatteries] = useState<BatteryItem[]>(defaultBatteryInventory);
  const [mapStatus, setMapStatus] = useState<MapStatus>(defaultMapStatus);
  const [connection, setConnection] = useState<ConnectionState>(defaultConnectionState);
  const [now, setNow] = useState(() => Date.now());

  const t = useMemo(
    () => (key: I18nKey) => I18N[locale][key] ?? I18N.ko[key],
    [locale]
  );

  const permissions = useMemo(
    () => (role === "admin" ? ADMIN_PERMISSIONS : permissionsConfig[role]),
    [permissionsConfig, role]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(permissionsConfig));
    }
  }, [permissionsConfig]);

  useEffect(() => {
    if (!permissions.tabs.includes(tab)) {
      setTab(permissions.tabs[0]);
    }
  }, [permissions.tabs, tab]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const mqttUrl = import.meta.env.VITE_MQTT_URL as string | undefined;
    if (!mqttUrl) {
      setConnection({
        status: "disconnected",
        latencyMs: null,
        lastMessageAt: null,
        error: t("error.mqttMissing"),
      });
      return;
    }

    const clientId =
      (import.meta.env.VITE_MQTT_CLIENT_ID as string | undefined) ??
      `amr-dashboard-${Math.random().toString(16).slice(2, 8)}`;

    const client = mqtt.connect(mqttUrl, {
      clientId,
      username: import.meta.env.VITE_MQTT_USERNAME as string | undefined,
      password: import.meta.env.VITE_MQTT_PASSWORD as string | undefined,
      keepalive: 30,
      reconnectPeriod: 2000,
      clean: true,
    });

    setConnection((prev) => ({ ...prev, status: "connecting", error: null }));

    client.on("connect", () => {
      setConnection((prev) => ({ ...prev, status: "connected", error: null }));
      client.subscribe([
        "amr/summary",
        "amr/events",
        "amr/robots",
        "amr/jobs",
        "amr/battery",
        "amr/map",
        "amr/latency",
      ]);
    });

    client.on("reconnect", () => {
      setConnection((prev) => ({ ...prev, status: "connecting" }));
    });

    client.on("close", () => {
      setConnection((prev) => ({ ...prev, status: "disconnected" }));
    });

    client.on("error", (err: Error) => {
      setConnection((prev) => ({ ...prev, status: "error", error: err.message }));
    });

    client.on("message", (topic: string, payload: Buffer) => {
      const parsed = parseMqttPayload(topic, payload.toString());
      if (!parsed) {
        return;
      }

      setConnection((prev) => ({ ...prev, lastMessageAt: new Date() }));

      switch (parsed.type) {
        case "summary":
          setSummary((prev) => mergeSummary(prev, parsed.payload));
          break;
        case "events":
          if (Array.isArray(parsed.payload)) {
            setEvents(parsed.payload);
          } else {
            const event = parsed.payload as EventItem;
            setEvents((prev) => [event, ...prev].slice(0, 20));
          }
          break;
        case "robots":
          if (Array.isArray(parsed.payload)) {
            setRobots(parsed.payload);
          } else {
            const robot = parsed.payload as RobotStatusItem;
            setRobots((prev) => upsertById(prev, robot));
          }
          break;
        case "jobs":
          if (Array.isArray(parsed.payload)) {
            setJobs(parsed.payload);
          } else {
            const job = parsed.payload as JobHistoryItem;
            setJobs((prev) => [job, ...prev].slice(0, 50));
          }
          break;
        case "battery":
          if (Array.isArray(parsed.payload)) {
            setBatteries(parsed.payload);
          } else {
            const battery = parsed.payload as BatteryItem;
            setBatteries((prev) => upsertById(prev, battery));
          }
          break;
        case "map":
          setMapStatus((prev) => ({ ...prev, ...parsed.payload }));
          break;
        case "latency":
          setConnection((prev) => ({ ...prev, latencyMs: parsed.payload.ms }));
          setSummary((prev) => ({ ...prev, latencyMs: parsed.payload.ms }));
          break;
        default:
          break;
      }
    });

    return () => {
      client.end(true);
    };
  }, []);

  const lastUpdateLabel = useMemo(
    () => formatLastUpdate(connection.lastMessageAt, now, t),
    [connection.lastMessageAt, now, t]
  );

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-[#111827]">
      <div className="flex min-h-screen">
        <Sidebar
          tab={tab}
          setTab={setTab}
          permissions={permissions}
          t={t}
        />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar
            tab={tab}
            setTab={setTab}
            connection={connection}
            lastUpdateLabel={lastUpdateLabel}
            permissions={permissions}
            role={role}
            isLoggedIn={isLoggedIn}
            loginRole={loginRole}
            setLoginRole={setLoginRole}
            onLogin={(nextRole) => {
              setRole(nextRole);
              setIsLoggedIn(true);
            }}
            onLogout={() => {
              setRole("viewer");
              setIsLoggedIn(false);
              setLoginRole("operator");
            }}
            locale={locale}
            setLocale={setLocale}
            t={t}
          />
          <main className="mx-auto w-full max-w-[1280px] 2xl:max-w-[1536px] 3xl:max-w-[1720px] flex-1 space-y-4 px-4 py-4 2xl:px-6 3xl:px-8">
            {tab === "home" && <HomeTab summary={summary} events={events} t={t} locale={locale} />}
            {tab === "robot" && <RobotStatusTab robots={robots} t={t} locale={locale} />}
            {tab === "job" && <JobHistoryTab jobs={jobs} t={t} locale={locale} />}
            {tab === "battery" && <BatteryInfoTab batteries={batteries} t={t} locale={locale} />}
            {tab === "map" && <MapTab mapStatus={mapStatus} t={t} locale={locale} />}
            {tab === "wireless" && <WirelessDiagnosticsTab t={t} />}
            {tab === "api" && (
              <ApiDownloadTab
                role={role}
                permissionsConfig={permissionsConfig}
                setPermissionsConfig={setPermissionsConfig}
                t={t}
                locale={locale}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
