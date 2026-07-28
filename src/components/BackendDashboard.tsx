import React, { useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Database,
  FileStack,
  FolderOpenDot,
  HardDriveDownload,
  KeyRound,
  Layers3,
  Network,
  ShieldCheck,
  Sparkles,
  Users2,
  Wrench
} from "lucide-react";

type BackendFeatureId =
  | "auth"
  | "students"
  | "documents"
  | "ai"
  | "storage"
  | "system";

type BackendFeature = {
  id: BackendFeatureId;
  title: string;
  short: string;
  summary: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
  status: string;
  metrics: Array<{ label: string; value: string }>;
  bullets: string[];
  details: {
    heading: string;
    description: string;
    sections: Array<{
      title: string;
      body: string;
    }>;
  };
};

const backendFeatures: BackendFeature[] = [
  {
    id: "auth",
    title: "Xác thực & phân quyền",
    short: "Đăng nhập, hồ sơ giáo viên, token và bảo vệ route.",
    summary: "Điều phối toàn bộ truy cập vào hệ thống backend.",
    icon: KeyRound,
    accentClass: "from-cyan-400 to-blue-500",
    status: "Ổn định",
    metrics: [
      { label: "Nhóm API", value: "02" },
      { label: "Phiên bảo vệ", value: "JWT" },
      { label: "Vai trò chính", value: "Admin / GV" }
    ],
    bullets: [
      "Kiểm tra token trước khi vào các route nghiệp vụ.",
      "Đồng bộ thông tin hồ sơ giáo viên và trạng thái đăng nhập.",
      "Giảm rủi ro truy cập trái phép vào dữ liệu học sinh."
    ],
    details: {
      heading: "Trung tâm kiểm soát truy cập",
      description:
        "Khối này chịu trách nhiệm xác minh danh tính người dùng, cấp phiên, bảo vệ route và duy trì trải nghiệm đăng nhập ổn định trên toàn hệ thống.",
      sections: [
        {
          title: "Mục đích",
          body: "Đảm bảo chỉ người dùng hợp lệ mới có thể thao tác với tài liệu, hồ sơ lớp học và các công cụ AI phía sau."
        },
        {
          title: "Luồng chính",
          body: "Đăng nhập → nhận token → gọi `/api/auth/me` → đồng bộ hồ sơ → bảo vệ các thao tác cập nhật và truy vấn dữ liệu."
        },
        {
          title: "Giá trị vận hành",
          body: "Tăng an toàn dữ liệu, giúp backend có thể mở rộng thêm vai trò quản trị hoặc giáo viên mà không làm rối phần frontend."
        }
      ]
    }
  },
  {
    id: "students",
    title: "Hồ sơ học sinh & lớp học",
    short: "Quản lý danh sách lớp, điểm số, nhật ký và hồ sơ chuyên sâu.",
    summary: "Kho nghiệp vụ cốt lõi cho dữ liệu giáo dục.",
    icon: Users2,
    accentClass: "from-emerald-400 to-teal-500",
    status: "Đang khai thác",
    metrics: [
      { label: "Tệp dữ liệu", value: "10+" },
      { label: "Nghiệp vụ", value: "Lớp / Điểm / Nhật ký" },
      { label: "Mức ưu tiên", value: "Cao" }
    ],
    bullets: [
      "Quản lý danh sách học sinh và thông tin lớp học theo cấu trúc rõ ràng.",
      "Lưu điểm số, nhận xét, hồ sơ năng lực và dữ liệu tâm lý.",
      "Cung cấp nền dữ liệu ổn định cho frontend và AI phân tích."
    ],
    details: {
      heading: "Lớp dữ liệu giáo dục trung tâm",
      description:
        "Đây là khu vực backend chứa phần lớn dữ liệu nghiệp vụ: học sinh, lớp học, điểm số, hành vi, nhật ký và nhiều hồ sơ hỗ trợ chủ nhiệm.",
      sections: [
        {
          title: "Phạm vi dữ liệu",
          body: "Bao gồm students, grades, journals, profiles, monthly reports và các biến thể dữ liệu liên quan đến công tác chủ nhiệm."
        },
        {
          title: "Ý nghĩa sản phẩm",
          body: "Là nền móng để các màn hình frontend có thể hiển thị danh sách, tra cứu, phân tích và tổng hợp báo cáo theo từng lớp."
        },
        {
          title: "Lợi ích dài hạn",
          body: "Khi dữ liệu được tổ chức tốt ở backend, việc thêm tính năng AI, báo cáo hoặc dashboard thống kê sẽ nhanh và nhất quán hơn."
        }
      ]
    }
  },
  {
    id: "documents",
    title: "Kho tài liệu & tri thức",
    short: "Lưu trữ tài liệu giảng dạy, nội dung mẫu và nguồn tri thức dùng chung.",
    summary: "Không gian backend để tiếp nhận và tổ chức tài liệu tải lên.",
    icon: FolderOpenDot,
    accentClass: "from-violet-400 to-fuchsia-500",
    status: "Đang mở rộng",
    metrics: [
      { label: "Uploads", value: "Nhiều tệp" },
      { label: "Nguồn dữ liệu", value: "DOC / DOCX / TXT" },
      { label: "Mục tiêu", value: "Tái sử dụng" }
    ],
    bullets: [
      "Tiếp nhận file tải lên và duy trì thư viện tài liệu dùng lại.",
      "Kết nối với các luồng phân tích nội dung và sinh học liệu.",
      "Giữ backend làm nơi tổ chức tri thức thay vì để rải rác ở frontend."
    ],
    details: {
      heading: "Trạm tiếp nhận tài liệu",
      description:
        "Tài liệu tải lên và các nguồn tri thức dùng chung được gom về backend để dễ kiểm soát, dễ phân tích và có thể tái sử dụng cho nhiều tính năng khác nhau.",
      sections: [
        {
          title: "Vai trò",
          body: "Làm nơi tiếp nhận file giáo án, đề mẫu, tài liệu hỗ trợ và chuẩn hóa dữ liệu trước khi đưa vào AI hoặc frontend."
        },
        {
          title: "Kết nối hệ thống",
          body: "Tài liệu từ đây có thể phục vụ kho học liệu, tạo bài giảng, tạo đề kiểm tra hoặc xây dựng knowledge cache."
        },
        {
          title: "Giá trị vận hành",
          body: "Giảm thất lạc tài nguyên và giúp đội ngũ có một điểm quản lý nội dung thống nhất phía backend."
        }
      ]
    }
  },
  {
    id: "ai",
    title: "Dịch vụ AI & bộ nhớ ngữ cảnh",
    short: "Knowledge cache, prompt điều phối và các pipeline suy luận.",
    summary: "Bộ não tăng cường cho các tính năng tạo nội dung.",
    icon: Bot,
    accentClass: "from-amber-400 to-orange-500",
    status: "Đang tinh chỉnh",
    metrics: [
      { label: "Cache", value: "1 lớp chính" },
      { label: "Ứng dụng", value: "Slide / Đề / Tư vấn" },
      { label: "Trạng thái", value: "AI-ready" }
    ],
    bullets: [
      "Lưu tri thức trung gian giúp giảm lặp lại xử lý AI.",
      "Cung cấp ngữ cảnh cho sinh slide, đề kiểm tra và tính năng hỗ trợ giáo viên.",
      "Cho phép backend kiểm soát prompt và chất lượng phản hồi tốt hơn."
    ],
    details: {
      heading: "Lớp suy luận và trí nhớ hệ thống",
      description:
        "Backend không chỉ gọi AI mà còn đóng vai trò quản lý bộ nhớ ngữ cảnh, nguồn tri thức và các pipeline xử lý để đầu ra ổn định hơn.",
      sections: [
        {
          title: "Điểm mạnh",
          body: "Tách AI logic ra khỏi giao diện giúp frontend nhẹ hơn và mọi thay đổi về pipeline có thể triển khai tập trung ở backend."
        },
        {
          title: "Trường hợp sử dụng",
          body: "Sinh slide bài giảng, gợi ý đề kiểm tra, xử lý tài liệu và mở rộng về sau sang phân tích hồ sơ học sinh."
        },
        {
          title: "Lợi ích kỹ thuật",
          body: "Dễ kiểm soát prompt, cache và fallback; từ đó giảm chi phí gọi model và tăng tính nhất quán của phản hồi."
        }
      ]
    }
  },
  {
    id: "storage",
    title: "Lưu trữ file & dữ liệu cục bộ",
    short: "Uploads, JSON data, cache và tài nguyên phục vụ toàn hệ thống.",
    summary: "Nền lưu trữ thực dụng cho tài nguyên backend hiện tại.",
    icon: HardDriveDownload,
    accentClass: "from-pink-400 to-rose-500",
    status: "Sẵn sàng",
    metrics: [
      { label: "Thư mục", value: "uploads / data" },
      { label: "Định dạng", value: "JSON + file" },
      { label: "Mục tiêu", value: "Nhanh / rõ" }
    ],
    bullets: [
      "Lưu các file tải lên từ người dùng và dữ liệu nền của hệ thống.",
      "Giúp dự án chạy đơn giản trong giai đoạn hiện tại mà vẫn dễ quan sát.",
      "Là lớp trung gian trước khi nâng cấp sang storage chuyên biệt."
    ],
    details: {
      heading: "Hệ lưu trữ vận hành thực tế",
      description:
        "Trang backend cần phản ánh rõ rằng hệ thống đang có lớp dữ liệu cục bộ và thư mục uploads đóng vai trò rất quan trọng trong vận hành hiện tại.",
      sections: [
        {
          title: "Tài nguyên lưu trữ",
          body: "Bao gồm JSON dữ liệu, file người dùng tải lên và các artifact được dùng trong xử lý nội bộ."
        },
        {
          title: "Ưu điểm",
          body: "Dễ debug, dễ backup thủ công và phù hợp cho giai đoạn cần tốc độ phát triển nhanh."
        },
        {
          title: "Hướng nâng cấp",
          body: "Có thể dần chuyển sang object storage hoặc database mạnh hơn mà không phải thay đổi quá nhiều trải nghiệm frontend."
        }
      ]
    }
  },
  {
    id: "system",
    title: "Điều phối hệ thống tổng thể",
    short: "Routes, services, middleware và lớp kết nối nội bộ.",
    summary: "Bản đồ vận hành tổng quát của toàn backend.",
    icon: Layers3,
    accentClass: "from-slate-300 to-slate-500",
    status: "Trung tâm",
    metrics: [
      { label: "Lớp chính", value: "Routes / Services / Middleware" },
      { label: "Vai trò", value: "Điều phối" },
      { label: "Tầm nhìn", value: "Mở rộng" }
    ],
    bullets: [
      "Liên kết các module dữ liệu, auth, AI và lưu trữ thành một hệ thống hoàn chỉnh.",
      "Giúp backend có cấu trúc rõ ràng khi tiếp tục phát triển thêm tính năng.",
      "Là điểm nhìn tổng hợp cho admin hoặc đội phát triển."
    ],
    details: {
      heading: "Bản đồ kiến trúc backend",
      description:
        "Đây là lớp nhìn toàn cục: route nhận request, middleware kiểm tra điều kiện, service xử lý nghiệp vụ và các kho dữ liệu trả kết quả về frontend.",
      sections: [
        {
          title: "Cấu trúc",
          body: "Mỗi request đi qua middleware, được route điều hướng, service xử lý, rồi truy cập data hoặc AI trước khi phản hồi lại giao diện."
        },
        {
          title: "Lợi ích cho đội phát triển",
          body: "Giúp mọi người nhìn backend như một hệ thống có tổ chức, dễ giao việc và dễ mở rộng theo module."
        },
        {
          title: "Mục tiêu giao diện",
          body: "Trang `/backend` nên đóng vai trò landing page vận hành: chọn chức năng bên trái, xem chi tiết và trạng thái bên phải."
        }
      ]
    }
  }
];

export default function BackendDashboard() {
  const [activeFeatureId, setActiveFeatureId] = useState<BackendFeatureId>("auth");

  const activeFeature = useMemo(
    () => backendFeatures.find((feature) => feature.id === activeFeatureId) ?? backendFeatures[0],
    [activeFeatureId]
  );

  const ActiveIcon = activeFeature.icon;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-6%] h-72 w-72 rounded-full bg-cyan-500/14 blur-3xl" />
        <div className="absolute right-[-6%] top-28 h-80 w-80 rounded-full bg-indigo-500/16 blur-3xl" />
        <div className="absolute bottom-[-10%] left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="border-b border-white/10 pb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                <Network className="h-3.5 w-3.5" />
                Backend Workspace
              </div>
              <div>
                <h1 className="text-balance text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
                  Giao diện backend dạng điều hướng chức năng
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                  Cột trái là danh sách chức năng backend. Cột phải hiển thị mô tả chi tiết,
                  phạm vi dữ liệu và giá trị vận hành của từng nhóm chức năng riêng biệt.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs text-slate-400">Tổng chức năng</p>
                <p className="mt-1 text-2xl font-bold text-white">06</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs text-slate-400">Trang hiện tại</p>
                <p className="mt-1 text-sm font-semibold text-cyan-200">/backend</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs text-slate-400">Chế độ</p>
                <p className="mt-1 text-sm font-semibold text-emerald-200">Vận hành nội bộ</p>
              </div>
            </div>
          </div>
        </header>

        <main className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-3">
            <div className="border-b border-white/10 px-3 pb-3 pt-2">
              <p className="text-sm font-semibold text-white">Danh sách chức năng</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Chọn một nhóm chức năng để xem chi tiết ở khung bên phải.
              </p>
            </div>

            <div className="mt-3 space-y-2">
              {backendFeatures.map((feature) => {
                const Icon = feature.icon;
                const isActive = feature.id === activeFeature.id;

                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => setActiveFeatureId(feature.id)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                      isActive
                        ? "border-cyan-400/35 bg-cyan-400/12 text-white"
                        : "border-white/10 bg-slate-900/45 text-slate-200 hover:border-white/20 hover:bg-white/6"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accentClass} text-white shadow-lg`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <h2 className="text-sm font-bold">{feature.title}</h2>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                              isActive
                                ? "bg-cyan-200/15 text-cyan-100"
                                : "bg-white/8 text-slate-300"
                            }`}
                          >
                            {feature.status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{feature.short}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex flex-col gap-5 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${activeFeature.accentClass} text-white shadow-lg`}
                >
                  <ActiveIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-cyan-200">{activeFeature.summary}</p>
                  <h2 className="mt-1 text-balance text-2xl font-black tracking-[-0.03em] text-white sm:text-3xl">
                    {activeFeature.details.heading}
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-[15px]">
                    {activeFeature.details.description}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  <Activity className="h-4 w-4 text-emerald-300" />
                  Trạng thái chức năng
                </div>
                <p className="mt-2 text-lg font-bold text-white">{activeFeature.status}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {activeFeature.metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                  <p className="text-xs text-slate-400">{metric.label}</p>
                  <p className="mt-2 text-xl font-bold text-white">{metric.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
              <div className="space-y-4">
                {activeFeature.details.sections.map((section) => (
                  <article key={section.title} className="rounded-2xl border border-white/10 bg-slate-900/45 p-5">
                    <h3 className="text-lg font-bold text-white">{section.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{section.body}</p>
                  </article>
                ))}
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-900/55 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <ShieldCheck className="h-4 w-4 text-cyan-300" />
                    Điểm nhấn chức năng
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                    {activeFeature.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <FileStack className="h-4 w-4 text-amber-300" />
                    Liên kết điều hướng
                  </div>
                  <div className="mt-4 space-y-3">
                    <a
                      href="/"
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-400/30 hover:bg-white/8"
                    >
                      Sang frontend chính
                      <Sparkles className="h-4 w-4 text-cyan-200" />
                    </a>
                    <a
                      href="/backend"
                      className="flex items-center justify-between rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100"
                    >
                      Đang ở backend
                      <Database className="h-4 w-4 text-cyan-200" />
                    </a>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Wrench className="h-4 w-4 text-indigo-300" />
                    Ghi chú bố cục
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    Bố cục mới chia rõ 2 vùng: cột trái để chọn nhóm chức năng, cột phải để đọc
                    trạng thái, phạm vi và chi tiết vận hành của backend.
                  </p>
                </div>
              </aside>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}