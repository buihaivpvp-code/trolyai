/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LessonPlan, SlideItem } from "./types";

export interface CachedItem {
  lessonPlan: LessonPlan;
  slides: SlideItem[];
}

export const KNOWLEDGE_CACHE: { [key: string]: CachedItem } = {
  "4-Khoa học-Vòng tuần hoàn của nước": {
    lessonPlan: {
      grade: 4,
      subject: "Khoa học",
      topic: "Vòng tuần hoàn của nước trong tự nhiên",
      curriculum: "Kết nối tri thức",
      objectives: [
        "Mô tả được vòng tuần hoàn của nước trong tự nhiên bằng sơ đồ hoặc sơ đồ khối.",
        "Trân trọng, bảo vệ nguồn nước sạch và sử dụng nước tiết kiệm.",
        "Rèn luyện kĩ năng quan sát, đặt câu hỏi, thảo luận nhóm để rút ra kết luận khoa học."
      ],
      materials: {
        teacher: ["Sơ đồ vòng tuần hoàn của nước (ảnh lớn/slide trình chiếu)", "Video khoa học ngắn về mưa", "Dụng cụ thí nghiệm (ly nước nóng, đĩa nhựa trong, đá lạnh)"],
        student: ["Sách giáo khoa Khoa học 4", "Bút dạ, giấy vẽ A3 nhóm"]
      },
      activities: {
        warmup: {
          title: "Hoạt động 1: Khởi động (Kích hoạt tư duy học sinh)",
          duration: "5 phút",
          teacherActions: "GV cho cả lớp chơi trò chơi 'Mưa rơi - Gió thổi'. GV đặt câu hỏi kích thích trí tưởng tượng: 'Các em có bao giờ thắc mắc: Nước mưa từ đâu ra? Sau cơn mưa, những vũng nước trên sân trường biến đi đâu mất?' GV dẫn dắt vào bài mới.",
          studentActions: "HS hào hứng tham gia hoạt động vận động theo khẩu lệnh của GV. Thảo luận đôi nhanh và đưa ra các suy đoán ngây ngô cá nhân: 'Dạ, mưa từ mây bay xuống ạ', 'Nước vũng bay lên trời khi nắng to'."
        },
        explore: {
          title: "Hoạt động 2: Khám phá lý thuyết (Lắp ráp kiến thức cốt lõi)",
          duration: "13 phút",
          teacherActions: "GV thực hiện thí nghiệm nhỏ biểu diễn: Đổ nước ấm vào ly, đậy đĩa nhựa lên, xếp đá lạnh lên đĩa. Yêu cầu học sinh quan sát đáy đĩa nhựa. GV tiếp tục chiếu sơ đồ vòng tuần hoàn của nước: bay hơi, ngưng tụ, tạo mưa, chảy tràn, ngấm vào đất. GV gọi các nhóm chỉ sơ đồ.",
          studentActions: "HS quan sát thấy các giọt nước đọng lại ở đáy đĩa nhựa trong và nhận biết sự ngưng tụ giống như tạo mây. HS thảo luận nhóm 4, thảo luận về quá trình bay hơi của biển, hồ, cách mây hình thành nâng độ cao và tạo mưa dội nước trở lại đất."
        },
        practice: {
          title: "Hoạt động 3: Luyện tập và Hệ thống hóa",
          duration: "12 phút",
          teacherActions: "GV phát cho mỗi nhóm một tờ giấy A3 và các mảnh ghép thuật ngữ: 'Bay hơi', 'Ngưng tụ', 'Mây', 'Mưa', 'Hơi nước'. GV yêu cầu các nhóm vẽ lại sơ đồ vòng tuần hoàn của nước bằng nét vẽ sáng tạo và dán các nhãn chú thích vào đúng vị trí.",
          studentActions: "HS hoạt động nhóm: phân công bạn vẽ khung cảnh núi non, biển cả, mây trời; bạn dán nhãn; các bạn khác vẽ mũi tên biểu thị hướng đi tuần hoàn của dòng nước sạch. Đại diện nhóm dán sản phẩm lên bảng và trình bày ngắn gọn."
        },
        apply: {
          title: "Hoạt động 4: Vận dụng (Gắn liền đời sống thực tiễn)",
          duration: "10 phút",
          teacherActions: "GV chiếu hình ảnh trẻ em vùng cao gùi nước sạch xa hàng cây số, hoặc lòng sông cạn nứt nẻ. GV hỏi: GV hỏi: 'Nước đi tuần hoàn vô tận, tại sao chúng ta vẫn kêu gọi tiết kiệm và bảo vệ nguồn nước sạch? Các em sẽ thực hiện hành động nhỏ nào hằng ngày?' Tổng kết, dặn dò.",
          studentActions: "HS quan sát lặng đi và suy ngẫm: Trả lời: 'Nếu nước bẩn bốc hơi bẩn thì mưa xuống cũng mang theo chất độc hại', 'Vòng tuần hoàn chậm hơn tốc độ con người làm bẩn nước'. Đăng kí việc tốt: Tắt vòi nước khi rửa tay, nhặt rác bảo vệ giếng nước."
        }
      },
      isFromCache: true
    },
    slides: [
      {
        slideNumber: 1,
        title: "BÍ MẬT CỦA CÁC GIỌT NƯỚC LỘNG LẪY",
        points: [
          "Chào mừng các em đến với cuộc phiêu lưu của giọt nước!",
          "Nước xung quanh ta luôn đồng hành cùng cuộc sống.",
          "Cùng khám phá vòng tuần hoàn vĩnh cửu nuôi dưỡng Trái Đất."
        ],
        illustrationPrompt: "Vietnamese primary school educational illustration, Vietnamese classroom with a smiling teacher showing a water droplet character on blackboard, cute bright colors, friendly watercolor cartoon style, safe for children, Vietnamese label 'Hành trình của Nước' only, no foreign language text",
        illustrationStyleBase: "Watercolor cartoon, friendly, safe, bright colors",
        speakingScript: "Chào các con! Hôm nay chúng ta sẽ bước vào thế giới nhiệm màu của Khoa học 4. Các con có bao giờ tự hỏi vì sao mưa rơi mãi mà ao hồ của chúng ta không bao giờ cạn sạch? Hôm nay, giọt nước nhỏ dễ thương mang tên BiBi sẽ dẫn chúng ta đi du lịch nhé!",
        activityLabel: "Trò chơi Khởi động",
        activityContent: "Học sinh hô to khẩu lệnh 'Mưa rơi tí tách - Nước sạch ngọt ngào; Nước chảy đi đâu - Khắp hành tinh xanh!' kết hợp xòe bàn tay nhảy múa.",
        simulatedImage: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600&auto=format&fit=crop&q=80"
      },
      {
        slideNumber: 2,
        title: "SỰ BAY HƠI - CÁNH BAY CỦA GIỌT NƯỚC",
        points: [
          "Khi Mặt Trời sưởi ấm nước sông, hồ, biển cả ấm lên.",
          "Những giọt nước nhỏ bé nhẹ nhàng hóa thành hơi nước.",
          "Hơi nước vô hình bay cao vào bầu trời bao la."
        ],
        illustrationPrompt: "Vietnamese primary school educational illustration, bright sunny ocean beach, a cute smiling sun shining rays, little water drop characters growing wings and flying upward as vapor clouds, soft watercolor styling, Vietnamese label 'Bay Hơi' only",
        illustrationStyleBase: "Watercolor cartoon, friendly, safe, bright colors",
        speakingScript: "Nhìn kìa các con! Ông Mặt Trời đang chiếu rọi ánh nắng ấm áp của mình xuống bãi biển Nha Trang xanh mát kìa. Nước biển hấp thụ hơi ấm, nhẹ nhàng hóa thân thành hơi nước, mọc chiếc cánh nhỏ bay vút lên bầu trời cao xanh thẳm.",
        activityLabel: "Thảo luận đôi",
        activityContent: "Tìm ví dụ khác ngoài đời về sự bay hơi của nước (Quần áo phơi khô, nước đun sôi bốc hơi, ao cá cạn nước ngày nắng nóng).",
        simulatedImage: "https://images.unsplash.com/photo-1548263544-24e2c88c72e9?w=600&auto=format&fit=crop&q=80"
      },
      {
        slideNumber: 3,
        title: "SỰ NGƯNG TỤ - NHỮNG ĐÁM MÂY KHỔNG LỒ",
        points: [
          "Bốc hơi lên cao gặp không khí lạnh ngắt.",
          "Vô vàn hạt nước li ti xích lại gần nhau, bắt tay nhau.",
          "Họ cùng dệt nên những đám mây bồng bềnh tuyệt đẹp phơi phới."
        ],
        illustrationPrompt: "Vietnamese primary school educational illustration, blue sky with soft white and gray clouds shaking hands and smiling under cold breeze, beautiful soft colors, clean watercolor style, Vietnamese label 'Ngưng Tụ' only",
        illustrationStyleBase: "Watercolor cartoon, friendly, safe, bright colors",
        speakingScript: "Càng bay cao thì càng lạnh buốt các con ạ! Khi hốt hoảng gặp lạnh, các phần tử hơi nước cuống quýt ôm lấy nhau, bắt tay sưởi ấm, tạo thành muôn ngàn hạt nước lấp lánh kết thành những đám mây xốp như kẹo bông gòn phơi phới trên trời.",
        activityLabel: "Câu đố nhanh",
        activityContent: "Mây có màu trắng hay xám là do yếu tố nào quyết định? Mây nhiều nước sẽ chuyển thành màu gì? (Màu xám sẫm chuẩn bị có mưa gõ nhịp).",
        simulatedImage: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=600&auto=format&fit=crop&q=80"
      },
      {
        slideNumber: 4,
        title: "MƯA RƠI & SỰ CHẢY TRÀN TRỞ VỀ ĐẤT MẸ",
        points: [
          "Mây nặng trĩu đung đưa rồi ngưng tụ thành hạt nước quá lớn.",
          "Trọng lực kéo những hạt nước sà xuống mặt đất: Mưa tuôn trào!",
          "Nước ngọt từ sông, núi chảy tràn ra biển rộng."
        ],
        illustrationPrompt: "Vietnamese educational illustration, Vietnamese children with red scarves and yellow boots jumping joyfully in the rain under green trees next to their schoolyard, cute watercolor style, bright colors, Vietnamese label 'Mưa Rơi' only",
        illustrationStyleBase: "Watercolor cartoon, friendly, safe, bright colors",
        speakingScript: "Khi đám mây trở nên quá nặng trĩu, không thể chống đỡ nổi nữa, ngàn vạn giọt nước reo vang hò hét: Tạm biệt trời cao, chúng con về với đất mẹ đại ngàn đây! Tách... tách... rào... rào... Những cơn mưa mang dòng nước ngọc ngà tắm mát cho ruộng vườn trù phú Việt Nam.",
        activityLabel: "Đố vui phản xạ",
        activityContent: "Học sinh cùng làm động tác múa tay theo âm lượng tiếng mưa từ to dần đến bé dần dưới hiệu lệnh gõ thước của cô giáo.",
        simulatedImage: "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?w=600&auto=format&fit=crop&q=80"
      }
    ]
  },
  "5-Toán-Phép nhân phân số": {
    lessonPlan: {
      grade: 5,
      subject: "Toán",
      topic: "Phép nhân phân số",
      curriculum: "Chân trời sáng tạo",
      objectives: [
        "Biết cách tính nhân hai phân số (lấy tử số nhân tử số, mẫu số nhân mẫu số).",
        "Áp dụng tính diện tích các hình phẳng có số đo phân số trong sách giáo khoa.",
        "Rèn luyện tư duy logic, tính chính xác cẩn thận khi rút gọn phân số trung gian."
      ],
      materials: {
        teacher: ["Hình chữ nhật chia thành các ô vuông minh họa trực quan", "Thẻ số hoạt động"],
        student: ["Sách giáo khoa Toán 5", "Vở nháp, thước kẻ chia vạch"]
      },
      activities: {
        warmup: {
          title: "Hoạt động 1: Khởi động",
          duration: "5 phút",
          teacherActions: "GV nêu bài toán thực tiễn: Một khu vườn nhỏ hình chữ nhật có chiều dài 4/5m, chiều rộng 2/3m. Làm thế nào để tính diện tích của khu vườn này? Diện tích = dài x rộng = (4/5) x (2/3). Giúp học sinh trăn trở về hướng quy đồng hay tìm thuật toán mới.",
          studentActions: "HS hồi tưởng lại công thức diện tích hình chữ nhật: Chiều dài nhân chiều rộng. Tuy nhiên các em băn khoăn cách thức tính nhân hai phân số vì trước đây chỉ mới học nhân phân số với số tự nhiên."
        },
        explore: {
          title: "Hoạt động 2: Khám phá kiến thức",
          duration: "13 phút",
          teacherActions: "GV vẽ một hình vuông cạnh 1m lên bảng. Chia hình vuông này thành 15 ô vuông bằng nhau (chiều ngang 5 phần, chiều dọc 3 phần). Tô đậm một hình chữ nhật biểu trưng cho chiều dài 4/5m và chiều rộng 2/3m. GV đếm số ô tô đậm và so với tổng số ô để học sinh rút ra quy tắc.",
          studentActions: "HS đếm thấy hình chữ nhật tô đậm chiếm đúng 8 ô nhỏ. Tổng số ô vuông là 15 ô. Diện tích bằng 8/15 m2. HS phát hiện: Tử số 8 = 4 x 2; Mẫu số 15 = 5 x 3. Từ đó phát biểu quy tắc: Muốn nhân hai phân số, ta lấy tử số nhân tử số, mẫu số nhân mẫu số."
        },
        practice: {
          title: "Hoạt động 3: Luyện tập",
          duration: "12 phút",
          teacherActions: "GV cho học sinh làm các bài tập sách giáo khoa trên bảng. Chú ý hướng dẫn học sinh thao tác rút gọn phân số trước khi nhân để tránh ra kết quả số quá to (ví dụ: 3/5 x 5/6 = 15/30 = 1/2, hoặc rút gọn chéo số 5 và số 3/6 rút gọn còn 1/2).",
          studentActions: "HS thực hiện tính toán độc lập vào vở nháp. Đại diện 3 HS lên bảng thi đua làm nhanh. Cả lớp nhận xét chéo về việc ghi chép đúng, ghi đơn vị đo lường và kỹ năng rút gọn phân số về phân số tối giản."
        },
        apply: {
          title: "Hoạt động 4: Vận dụng",
          duration: "10 phút",
          teacherActions: "GV tổ chức cuộc thi tiếp sức 'Thợ săn phân số'. GV đưa ra bài toán thực tiễn chia bánh chưng trong ngày Tết cổ truyền hoặc chia ruộng cấy mạ của gia đình nòng cốt ruộng Việt Nam. Khen ngợi nhóm hiểu nhanh nhất.",
          studentActions: "HS chia đội tham gia nhiệt tình. Tính toán nhanh lượng bánh thừa chia cho bạn bè rồi nêu cảm nhận về sự tiện lợi của phép toán."
        }
      },
      isFromCache: true
    },
    slides: [
      {
        slideNumber: 1,
        title: "PHÉP NHÂN PHÂN SỐ - AN TOÀN & CHÍNH XÁC",
        points: [
          "Công thức vàng giúp giải nhanh toán phân số.",
          "Tuyệt chiêu: Lấy tử nhân tử, mẫu nhân mẫu.",
          "Mẹo rút gọn siêu xa giúp bài toán nhẹ tênh."
        ],
        illustrationPrompt: "Vietnamese primary school educational illustration, two cheerful Vietnamese kids pointing at a mathematical equation with cute fraction blocks of cake on a clean polished surface, watercolor illustration style, bright background, Vietnamese label 'Phép Nhân Phân Số' only",
        illustrationStyleBase: "Watercolor cartoon, friendly, safe, bright colors",
        speakingScript: "Chào các con thân yêu của cô! Hôm nay chúng ta sẽ tiếp tục chinh phục vương quốc toán học lớp 5 với một công thức cực kì dễ thương và dễ nhớ. Đó chính là Phép nhân Phân số. Hôm nay chúng ta sẽ thấy việc nhân phân số thực chất còn dễ dàng hơn cả phép cộng trừ quy đồng mẫu số phức tạp đấy!",
        activityLabel: "Khởi động não bộ",
        activityContent: "Học sinh đập hai tay vào nhau hô: 'Tử xích lại tử, mẫu ôm chặt mẫu - Nhân vào liền nhau!'",
        simulatedImage: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&auto=format&fit=crop&q=80"
      }
    ]
  }
};

export function getCachedItem(grade: number, subject: string, topic: string): CachedItem | null {
  // Try exact lookup
  const exactKey = `${grade}-${subject}-${topic}`;
  if (KNOWLEDGE_CACHE[exactKey]) {
    return KNOWLEDGE_CACHE[exactKey];
  }

  // Try partial lookup on subject and topic
  for (const key of Object.keys(KNOWLEDGE_CACHE)) {
    const [g, s, t] = key.split("-");
    if (g === String(grade) && s.toLowerCase() === subject.toLowerCase() && topic.toLowerCase().includes(t.toLowerCase())) {
      return KNOWLEDGE_CACHE[key];
    }
  }

  return null;
}
