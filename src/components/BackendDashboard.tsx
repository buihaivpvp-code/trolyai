import React from "react";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  Bot,
  Database,
  FileStack,
  FolderOpenDot,
  GraduationCap,
  LayoutDashboard,
  Lock,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Users2,
  Wrench
} from "lucide-react";

const quickStats = [
  {
    label: "API hệ thống",
    value: "12+",
    note: "Nơi tập trung toàn bộ endpoint xác thực, dữ liệu học sinh, AI và nghiệp vụ giáo viên",
    icon: Activity,
    accent: "from-emerald-400 to-teal-500"
  },
  {
    label: "Kho dữ liệu lõi",
    value: "10+",
    note: "Lưu dữ liệu hệ thống, hồ sơ, điểm số, nhật ký, tài liệu và các nguồn đồng bộ nội bộ",
    icon: Database,
    accent: "from-sky-400 to-indigo-500"
  },
  {
    label: "Lớp điều phối backend",
    value: "05",
    note: "Gồm tài khoản, tư duy AI, API, data storage và tài nguyên vận hành toàn hệ thống",
    icon: LayoutDashboard,
    accent: "from-violet-400 to-fuchsia-500"
  }
];

const backendModules = [
  {
    title: "Kho API nghiệp vụ",
    description:
      "Lưu và điều phối toàn bộ API cho đăng nhập, học sinh, lớp học, tài liệu, AI và các luồng tích hợp hệ thống.",
    icon: ServerCog,
    status: "Gateway trung tâm"
  },
  {
    title: "Bộ nhớ tư duy AI",
    description:
      "Lưu prompt, ngữ cảnh, tri thức, cache phản hồi và các lớp suy luận để AI trả lời đúng theo hệ thống.",
    icon: Bot,
    status: "Ngữ cảnh dài hạn"
  },
  {
    title: "Kho data & tài liệu",
    description:
      "Lưu dữ liệu học sinh, điểm số, hồ sơ, nhật ký, uploads và các nguồn JSON nội bộ phục vụ vận hành.",
    icon: FolderOpenDot,
    status: "Dữ liệu tập trung"
  },
  {
    title: "Quản lý tài khoản & phân quyền",
    description:
      "Lưu tài khoản, token, phiên đăng nhập, vai trò người dùng và các quy tắc bảo mật cho toàn nền tảng.",
    icon: ShieldCheck,
    status: "Bảo mật nhiều lớp"
  }
];

const operationCards = [
  {
    title: "Lưu API và route hệ thống",
    description:
      "Backend là nơi giữ toàn bộ route /api, middleware, xác thực, phân quyền và các điểm kết nối dịch vụ.",
    icon: ServerCog
  },
  {
    title: "Lưu tư duy và tri thức AI",
    description:
      "Quản lý prompt, knowledge cache, fallback model, hành vi trả lời và cấu hình suy luận cho từng chức năng.",
    icon: Wrench
  },
  {
    title: "Lưu data, tài khoản và tài nguyên lõi",
    description:
      "Theo dõi data/, uploads/, users, hồ sơ học sinh và toàn bộ thành phần thuộc hạ tầng vận hành của hệ thống.",
    icon: FileStack
  }
];

export default function BackendDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-[-8%] h-72 w-72 rounded-full bg-indigo-500/18 blur-3xl" />
        <div className="absolute top-32 right-[-6%] h-80 w-80 rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[28px] border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-8 px-6 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                <Lock className="h-3.5 w-3.5" />
                Backend Workspace
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[2.8rem]">
                  Trung tâm vận hành hệ thống EduAI
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                  Khu vực này đại diện cho backend lõi của sản phẩm: nơi lưu API,
                  lưu tư duy AI, lưu data, lưu tài khoản và toàn bộ thành phần
                  thuộc hệ thống để frontend giáo viên có thể vận hành ổn định.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.75)]" />
                  Route /backend đã được gắn giao diện hiển thị
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  Thiết kế đồng bộ phong cách dark-tech của sản phẩm
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-900/70 p-4 sm:grid-cols-2 lg:w-[360px] lg:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <GraduationCap className="h-4 w-4 text-indigo-300" />
                  Sứ mệnh hệ thống
                </div>
                <p className="text-sm leading-6 text-slate-200">
                  Xây backend như bộ não vận hành trung tâm: lưu tri thức, dữ
                  liệu, tài khoản và dịch vụ hệ thống theo cấu trúc an toàn, dễ mở rộng.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-cyan-400/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  <BookOpenCheck className="h-4 w-4" />
                  Trạng thái hiển thị
                </div>
                <p className="text-sm leading-6 text-slate-100">
                  Giao diện này diễn giải rõ backend đang giữ vai trò trung tâm lưu API,
                  tư duy AI, data và tài khoản của toàn bộ nền tảng.
                </p>
              </div>
            </div>
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
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    {item.note}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-slate-950/30">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Module backend
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                    Các lớp backend đang lưu giữ và điều phối toàn bộ lõi hệ thống
                  </h2>
                </div>
                <div className="hidden rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-300 md:flex md:items-center md:gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  Secure Architecture
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
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                          {module.status}
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-bold text-white">
                        {module.title}
                      </h3>
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
                  Tác vụ ưu tiên
                </p>
                <div className="mt-4 space-y-4">
                  {operationCards.map((card) => {
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
                            <h3 className="text-sm font-bold text-white">
                              {card.title}
                            </h3>
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
                  <ArrowRight className="h-4 w-4 text-amber-300" />
                  Điều hướng nhanh
                </div>
                <div className="mt-4 space-y-3">
                  <a
                    href="/"
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:border-indigo-400/40 hover:bg-slate-900"
                  >
                    Mở ứng dụng giáo viên
                    <ArrowRight className="h-4 w-4 text-indigo-300" />
                  </a>
                  <a
                    href="/backend"
                    className="flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/15"
                  >
                    Làm mới dashboard backend
                    <ArrowRight className="h-4 w-4 text-cyan-200" />
                  </a>
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}