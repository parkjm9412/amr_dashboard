import React, { useMemo, useState } from "react";
import skhynixLogo from "./assets/skhynix-logo.jpg";

type TabKey = "home" | "robot" | "job" | "battery" | "map" | "wireless" | "api";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
}) {
  const items: Array<{ key: TabKey; label: string; desc: string }> = [
    { key: "home", label: "Home", desc: "운영 요약 대시보드" },
    { key: "robot", label: "Robot Status", desc: "개별/전체 상태" },
    { key: "job", label: "Job History", desc: "작업 이력 분석" },
    { key: "battery", label: "Battery Info", desc: "배터리 추세" },
    { key: "map", label: "Map", desc: "지도·밀도·품질" },
    { key: "wireless", label: "Wireless Diagnostics", desc: "신호·핑·로밍" },
    { key: "api", label: "API & Download", desc: "API/내보내기" },
  ];

  return (
    <aside className="hidden min-h-screen w-64 flex-col border-r border-[#e5e7eb] bg-white lg:flex">
      <div className="px-6 py-6">
        <img src={skhynixLogo} alt="SK hynix" className="h-6 w-auto" />
        <div className="mt-2 text-lg font-semibold text-[#111827]">AMR Control</div>
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
            >
              <span
                className={cn(
                  "mt-1 h-2 w-2 rounded-full",
                  tab === item.key ? "bg-[#ef3124]" : "bg-[#d1d5db]"
                )}
              />
              <span className="flex-1">
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-[#6b7280]">{item.desc}</div>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-auto px-6 py-6">
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <div className="text-xs text-[#6b7280]">시스템 상태</div>
          <div className="mt-2 flex items-center justify-between text-sm text-[#111827]">
            <div className="flex items-center gap-2">
              <StatusDot />
              정상 운영
            </div>
            <span className="text-xs text-[#6b7280]">99.98%</span>
          </div>
          <div className="mt-2 text-xs text-[#6b7280]">마지막 점검 2시간 전</div>
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
    <section className="space-y-3">
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
    <div className={cn("rounded-xl border border-[#e5e7eb] bg-white p-4 shadow-sm", ring)}>
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
    <div className="flex h-[360px] items-center justify-center rounded-xl bg-[#f3f4f6] text-sm text-[#6b7280]">
      {label}
    </div>
  );
}

function TopBar({
  tab,
  setTab,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
}) {
  const tabs: Array<{ key: TabKey; label: string }> = useMemo(
    () => [
      { key: "home", label: "Home" },
      { key: "robot", label: "Robot Status" },
      { key: "job", label: "Job History" },
      { key: "battery", label: "Battery Info" },
      { key: "map", label: "Map" },
      { key: "wireless", label: "Wireless" },
      { key: "api", label: "API & Download" },
    ],
    []
  );

  return (
    <div className="sticky top-0 z-10 border-b border-[#e5e7eb] bg-white">
      <div className="h-1 bg-[#ef3124]" />
      <div className="flex items-center gap-4 px-6 py-4">
        <div className="min-w-[220px]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
            <img src={skhynixLogo} alt="SK hynix" className="h-5 w-auto" />
            AMR 실시간 운영 대시보드
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-[#6b7280]">
            <StatusDot />
            연결: OK · 지연 120ms · Last update 0.3s ago
          </div>
        </div>

        <div className="flex flex-1 items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
            <div className="text-xs text-[#6b7280]">로봇</div>
            <select className="bg-transparent text-sm text-[#111827] outline-none">
              <option>AMR-01</option>
              <option>AMR-02</option>
              <option>AMR-03</option>
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
            <div className="text-xs text-[#6b7280]">구역</div>
            <select className="bg-transparent text-sm text-[#111827] outline-none">
              <option>전체</option>
              <option>A</option>
              <option>B</option>
              <option>C</option>
            </select>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <Chip label="알람 2" />
            <Chip label="이벤트 14" />
          </div>
        </div>

        <div className="hidden lg:flex items-center rounded-xl border border-[#e5e7eb] bg-white p-1 shadow-sm">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                tab === t.key
                  ? "bg-[#ef3124] text-white"
                  : "text-[#374151] hover:bg-[#f3f4f6]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto hidden xl:flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2">
            <span className="text-xs text-[#6b7280]">검색</span>
            <input
              className="w-40 bg-transparent text-sm text-[#111827] outline-none"
              placeholder="로봇 ID, 이벤트"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#6b7280]">
            2026-01-15 15:24
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#6b7280]">
            KR · EN
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#6b7280]">
            User: Admin
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs text-[#6b7280]">
            License: OK
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-6 pb-4 lg:hidden">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              tab === t.key ? "bg-[#ef3124] text-white" : "text-[#374151] hover:bg-[#f3f4f6]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="가동률" value="92" unit="%" sub="최근 24시간 평균" status="ok" />
        <MetricCard label="활성 로봇" value="18" unit="대" sub="전체 20대" />
        <MetricCard label="진행 작업" value="36" unit="건" sub="평균 4.2분" />
        <MetricCard label="알람" value="2" unit="건" sub="주의 2 / 위험 0" status="warn" />
        <MetricCard label="지연" value="120" unit="ms" sub="네트워크 RTT" />
        <MetricCard label="에너지" value="78" unit="%" sub="가중 평균 배터리" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <Section title="운영 요약" right="최근 2시간">
            <div className="p-4">
              <Placeholder label="(차트) 작업량·가동률·지연 추이" />
            </div>
          </Section>
          <Section title="플릿 상태" right="실시간">
            <div className="p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Placeholder label="(차트) 로봇 상태 분포" />
                <Placeholder label="(차트) 배터리 분포" />
              </div>
            </div>
          </Section>
        </div>

        <Section title="최근 이벤트" right="클릭 시 상세">
          <div className="p-4">
            <div className="space-y-2">
              {[
                { t: "14:12:08", type: "WARN", msg: "지연 증가(>200ms)", robot: "AMR-03" },
                { t: "14:10:21", type: "INFO", msg: "미션 시작", robot: "AMR-03" },
                { t: "14:08:55", type: "INFO", msg: "구역 A 진입", robot: "AMR-03" },
              ].map((e, i) => (
                <button
                  key={i}
                  className="w-full rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-left hover:bg-[#f3f4f6]"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-[#6b7280]">{e.t} · {e.robot}</div>
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs border",
                        e.type === "WARN"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-[#f3f4f6] text-[#374151] border-[#e5e7eb]"
                      )}
                    >
                      {e.type}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-[#111827]">{e.msg}</div>
                  <div className="mt-1 text-xs text-[#6b7280]">확인 필요</div>
                </button>
              ))}
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function RobotStatusTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="RUN" value="12" unit="대" sub="작업 중" status="ok" />
        <MetricCard label="IDLE" value="4" unit="대" sub="대기" />
        <MetricCard label="CHARGE" value="2" unit="대" sub="충전 중" />
        <MetricCard label="ERROR" value="0" unit="대" sub="즉시 확인" status="ok" />
      </div>

      <Section title="개별 로봇 상태" right="정렬/필터 지원">
        <div className="p-4">
          <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
            <table className="w-full text-sm">
              <thead className="bg-[#f3f4f6] text-xs text-[#6b7280]">
                <tr>
                  <th className="px-3 py-2 text-left">로봇</th>
                  <th className="px-3 py-2 text-left">상태</th>
                  <th className="px-3 py-2 text-left">배터리</th>
                  <th className="px-3 py-2 text-left">현재 작업</th>
                  <th className="px-3 py-2 text-left">마지막 업데이트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {[
                  { id: "AMR-01", state: "RUN", bat: "82%", job: "픽업 → 드롭", t: "14:12:10" },
                  { id: "AMR-02", state: "IDLE", bat: "64%", job: "-", t: "14:12:02" },
                  { id: "AMR-03", state: "RUN", bat: "75%", job: "검사 라인 이동", t: "14:11:58" },
                  { id: "AMR-04", state: "CHARGE", bat: "31%", job: "충전 스테이션", t: "14:11:40" },
                ].map((r) => (
                  <tr key={r.id} className="hover:bg-[#f3f4f6]">
                    <td className="px-3 py-2">{r.id}</td>
                    <td className="px-3 py-2">{r.state}</td>
                    <td className="px-3 py-2">{r.bat}</td>
                    <td className="px-3 py-2">{r.job}</td>
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

function JobHistoryTab() {
  return (
    <div className="space-y-6">
      <Section title="Job History Graph" right="일/주/월">
        <div className="p-4">
          <Placeholder label="(그래프) 작업량/처리시간/성공률" />
        </div>
      </Section>
      <Section title="Segments & Jobs" right="최근 50건">
        <div className="p-4">
          <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
            <table className="w-full text-sm">
              <thead className="bg-[#f3f4f6] text-xs text-[#6b7280]">
                <tr>
                  <th className="px-3 py-2 text-left">시간</th>
                  <th className="px-3 py-2 text-left">작업</th>
                  <th className="px-3 py-2 text-left">로봇</th>
                  <th className="px-3 py-2 text-left">소요</th>
                  <th className="px-3 py-2 text-left">결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {[
                  { t: "14:10", job: "라인A→라인B", robot: "AMR-01", d: "3m 40s", r: "완료" },
                  { t: "14:08", job: "창고→포장", robot: "AMR-03", d: "4m 02s", r: "완료" },
                  { t: "14:06", job: "라인C→검사", robot: "AMR-02", d: "2m 55s", r: "완료" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-[#f3f4f6]">
                    <td className="px-3 py-2">{row.t}</td>
                    <td className="px-3 py-2">{row.job}</td>
                    <td className="px-3 py-2">{row.robot}</td>
                    <td className="px-3 py-2">{row.d}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{row.r}</td>
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

function BatteryInfoTab() {
  return (
    <div className="space-y-6">
      <Section title="Battery Info Graphs" right="SOC/온도/전류">
        <div className="p-4">
          <Placeholder label="(그래프) SOC·온도·충방전 추이" />
        </div>
      </Section>
      <Section title="Battery Inventory" right="로봇별 상태">
        <div className="p-4">
          <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
            <table className="w-full text-sm">
              <thead className="bg-[#f3f4f6] text-xs text-[#6b7280]">
                <tr>
                  <th className="px-3 py-2 text-left">로봇</th>
                  <th className="px-3 py-2 text-left">SOC</th>
                  <th className="px-3 py-2 text-left">온도</th>
                  <th className="px-3 py-2 text-left">사이클</th>
                  <th className="px-3 py-2 text-left">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {[
                  { id: "AMR-01", soc: "82%", temp: "32°C", cycle: "412", state: "정상" },
                  { id: "AMR-02", soc: "64%", temp: "35°C", cycle: "389", state: "정상" },
                  { id: "AMR-03", soc: "75%", temp: "37°C", cycle: "465", state: "점검" },
                ].map((b) => (
                  <tr key={b.id} className="hover:bg-[#f3f4f6]">
                    <td className="px-3 py-2">{b.id}</td>
                    <td className="px-3 py-2">{b.soc}</td>
                    <td className="px-3 py-2">{b.temp}</td>
                    <td className="px-3 py-2">{b.cycle}</td>
                    <td className="px-3 py-2 text-[#6b7280]">{b.state}</td>
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

function MapTab() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Section title="Map View" right="Position Density / Localization / Wireless">
        <div className="p-4">
          <Placeholder label="(맵 영역) 위치·밀도·로컬라이제이션·무선 품질" />
        </div>
      </Section>

      <div className="space-y-6">
        <Section title="로봇 상태" right="초단위 갱신">
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="X" value="12.34" unit="m" />
              <MetricCard label="Y" value="8.21" unit="m" />
              <MetricCard label="각도" value="275" unit="°" />
              <MetricCard label="속도" value="1.2" unit="m/s" />
            </div>
            <div className="rounded-lg bg-[#f3f4f6] p-3 text-sm text-[#374151]">
              미션: 픽업(노드 21) → 드롭(노드 07) / 상태: RUN
            </div>
          </div>
        </Section>

        <Section title="구역/경로 정보" right="금지구역·장애물">
          <div className="p-4">
            <Placeholder label="(패널) 현재 경로/다음 목표/구역 이벤트" />
          </div>
        </Section>
      </div>
    </div>
  );
}

function WirelessDiagnosticsTab() {
  return (
    <div className="space-y-6">
      <Section title="Wireless Diagnostics" right="Signal / Ping / BSSID / Roams">
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
          <Placeholder label="(맵) 신호/핑/로밍 포인트 표시" />
        </div>
      </Section>

      <Section title="Spot Details" right="선택 지점 정보">
        <div className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <MetricCard label="Coordinates" value="X 24.2 / Y 18.4" sub="현재 포인트" />
            <MetricCard label="Base Station" value="BSSID-02" sub="Channel 6" />
            <MetricCard label="Signal" value="-62" unit="dBm" sub="품질 양호" />
            <MetricCard label="Ping" value="48" unit="ms" sub="RTT" />
          </div>
        </div>
      </Section>
    </div>
  );
}

function ApiDownloadTab() {
  return (
    <div className="space-y-6">
      <Section title="API" right="문서/테스트">
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

      <Section title="Download" right="PNG/CSV/JSON">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm text-[#374151]">
            <span className="rounded-full border border-[#e5e7eb] px-3 py-1">PNG</span>
            <span className="rounded-full border border-[#e5e7eb] px-3 py-1">CSV</span>
            <span className="rounded-full border border-[#e5e7eb] px-3 py-1">JSON</span>
          </div>
          <div className="text-xs text-[#6b7280]">Information Area / All Graphs 다운로드 지원</div>
        </div>
      </Section>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<TabKey>("home");

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-[#111827]">
      <div className="flex min-h-screen">
        <Sidebar tab={tab} setTab={setTab} />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar tab={tab} setTab={setTab} />
          <main className="mx-auto w-full max-w-[1280px] flex-1 space-y-6 px-6 py-6">
            {tab === "home" && <HomeTab />}
            {tab === "robot" && <RobotStatusTab />}
            {tab === "job" && <JobHistoryTab />}
            {tab === "battery" && <BatteryInfoTab />}
            {tab === "map" && <MapTab />}
            {tab === "wireless" && <WirelessDiagnosticsTab />}
            {tab === "api" && <ApiDownloadTab />}
          </main>
        </div>
      </div>
    </div>
  );
}
