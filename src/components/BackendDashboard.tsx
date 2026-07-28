import React from "react";
import {
  Activity,
  ArrowRight,
  Blocks,
  Bot,
  Database,
  FileStack,
  FolderOpenDot,
  HardDriveDownload,
  Lock,
  Network,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Users2,
  Wrench
} from "lucide-react";

const quickStats = [
  {
    label: "API nội bộ",
    value: "12+",
    note: "Cụm route xác thực, học sinh, tài liệu, AI và toàn bộ nghiệp vụ hệ thống.",
    icon: Activity,
    accent: "from-emerald-400 to-teal-500"
  },
  {
    label: "Kho dữ liệu",
    value: "10+",
    note: "Lưu users, grades, journals, uploads, knowledge cache và dữ liệu vận hành lõi.",
    icon: Database,
    accent: "from-sky-400 to-indigo-500"
  },
  {
    label: "Lớp dịch vụ",
    value: "05",
    note: "Middleware, auth, models, routes và service layer đang điều phối toàn bộ backend.",
    icon: Blocks,
    accent: "from-violet-400 to-fuchsia-500"
  }
];

const backendModules = [
  {
    title: "Gateway API trung tâm",
    description:
      "Điểm vào chính cho xác thực, phân quyền, truy vấn học sinh, tài liệu và các tính năng AI của hệ thống.",
    icon: ServerCog,
    badge: "Routes"
  },
  {
    title: "Tầng dữ liệu & hồ sơ",
    description:
      "Quản lý dữ liệu lớp học, học sinh, điểm số, nhật ký, hồ sơ tâm lý và các tập tin đồng bộ nội bộ.",
    icon: FolderOpenDot,
    badge: "Data layer"
  },
  {
    title: "Bộ nhớ ngữ cảnh AI",
    description:
      "Lưu knowledge cache, prompt điều phối, fallback model và các cấu hình suy luận dài hạn.",
    icon: Bot,
    badge: "AI memory"
  },
  {
    title: "Bảo mật & tài khoản",
    description:
      "Điều phối đăng nhập, token, phiên hoạt động và các lớp bảo mật cho tài khoản quản trị và giáo viên.",
    icon: ShieldCheck,
    badge: "Security"
  }
];

const controlCards = [
  {
    title: "Auth & middleware",
    description: "Bảo vệ luồng truy cập, kiểm tra phiên và kiểm soát request trước khi vào nghiệp vụ.",
    icon: Lock
  },
  {
    title: "Services & xử lý AI",
    description: "Đóng gói logic hệ thống, pipeline AI và các luồng xử lý tài liệu dùng chung.",
    icon: Wrench
  },
  {
    title: "Storage & uploads",
    description: "Lưu file tải lên, dữ liệu JSON cục bộ và các tài nguyên backend phục vụ frontend.",
    icon: HardDriveDownload
  }
];

const infraPoints = [
  "Route /backend là trang hiển thị riêng cho khu backend, tách biệt với giao diện giáo viên ở trang chủ.",
  "Trang này mô tả kiến trúc vận hành: route, service, data, auth, uploads và bộ nhớ AI.",
  "Thiết kế được giữ đồng bộ hệ màu dark-tech nhưng không trùng nội dung với frontend chính."
];

export default function BackendDashboard() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-8%] h-80 w-80 rounded-full bg-indigo-500/18 blur-3xl" />
        <div className="absolute right-[-8%] top-24 h-96 w-96 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="absolute bottom-[-10%] left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/12 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_360px] lg:px-10 lg:py-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                <Network className="h-3.5 w-3.5" />
                Backend Control Surface
              </div>

              <div className="space-y-3">
                <h1 className="max-w-4xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[3rem] lg:leading-[1.05]">
                  Không gian vận hành backend cho hệ thống Lan Anh EduAI
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                  Đây là trang riêng cho backend tại đường dẫn <span className="font-semibold text-cyan-200">/backend</span>:
                  nơi mô tả lớp route, service, auth, data, uploads và bộ nhớ AI đang
                  vận hành phía sau frontend giáo viên.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.75)]" />
                  `/backend` là trang riêng, không trùng với frontend `/`
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Giao diện backend đã được làm mới theo phong cách dark-tech
                </div>
              </div>
            </div>

            <aside className="rounded-[28px] border border-white/10 bg-slate-900/70 p-4">
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  Vai trò hệ thống
                </div>
                <p className="text-sm leading-6 text-slate-200">
                  Backend đóng vai trò bộ não vận hành trung tâm: bảo vệ truy cập,
                  điều phối API, lưu dữ liệu và cung cấp ngữ cảnh cho AI.
                </p>
              </div>

              <div className="mt-3 space-y-3 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-indigo-500/20 to-cyan-400/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  <Database className="h-4 w-4" />
                  Hạ tầng hiển thị
                </div>
                <ul className="space-y-3 text-sm leading-6 text-slate-100">
                  {infraPoints.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </header>

        <main className="flex-1 py-8">
          <section className="grid gap-4 lg:grid-cols-3">
            {quickStats.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-xl shadow-slate-950/25 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-3 text-4xl font-black tracking-tight text-white">
                        {item.value}
                      </p>
                    </div>
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} shadow-lg`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-300">{item.note}</p>
                </article>
              );
            })}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-slate-950/30">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Module backend
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                    Các lớp cốt lõi đang duy trì toàn bộ phần backend
                  </h2>
                </div>
                <div className="hidden rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300 md:flex md:items-center md:gap-2">
                  <ServerCog className="h-4 w-4 text-cyan-300" />
                  Backend Architecture
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {backendModules.map((module) => {
                  const Icon = module.icon;
                  return (
                    <article
                      key={module.title}
                      className="rounded-[22px] border border-white/10 bg-slate-900/55 p-5 transition-transform duration-200 hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-200">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                          {module.badge}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-white">{module.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {module.description}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-indigo-500/20 via-slate-900/85 to-cyan-500/10 p-6 shadow-xl shadow-slate-950/30">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  Vùng điều phối chính
                </p>
                <div className="mt-4 space-y-4">
                  {controlCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.title}
                        className="rounded-[22px] border border-white/10 bg-slate-950/45 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{card.title}</h3>
                            <p className="mt-1 text-sm leading-6 text-slate-300">
                              {card.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-slate-950/30">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <Users2 className="h-4 w-4 text-indigo-300" />
                  Điều hướng hệ thống
                </div>
                <div className="mt-4 space-y-3">
                  <a
                    href="/"
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:border-indigo-400/40 hover:bg-slate-900"
                  >
                    Mở frontend giáo viên
                    <ArrowRight className="h-4 w-4 text-indigo-300" />
                  </a>
                  <a
                    href="/backend"
                    className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/15"
                  >
                    Ở lại trang backend
                    <ArrowRight className="h-4 w-4 text-cyan-200" />
                  </a>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/55 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    <FileStack className="h-4 w-4 text-amber-300" />
                    Ghi chú triển khai
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Nếu deploy đúng cấu hình, frontend vẫn ở <span className="font-semibold text-white">/</span>
                    , còn backend landing page hiển thị riêng ở{" "}
                    <span className="font-semibold text-cyan-200">/backend</span>.
                  </p>
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}