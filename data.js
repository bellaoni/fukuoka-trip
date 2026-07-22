// 엄마랑 후쿠오카 2박 3일 일정 데이터
// tag: normal | food | onsen | shop  (워시테이프 색상에 사용)

const TRIP = {
  title: "엄마랑 후쿠오카 2박 3일",
  hotel: "프린스 스마트인 하카타 (하카타역 도보 5분)",
  // 마이맵 embed 링크 - 여기 값을 바꾸면 모든 기기(폰/아이패드/동행자)에서 동일하게 보임
  mapEmbedUrl: "https://www.google.com/maps/d/embed?mid=1HCObB6k8sQUzeuHVu9o_LDUuGEkl29M&ehbc=2E312F&noprof=1",
  flights: [
    {
      route: "부산김해 → 후쿠오카",
      date: "2026-08-02 (일)",
      dep: "13:05 부산김해공항",
      arr: "14:05 후쿠오카공항",
      code: "7C1453"
    },
    {
      route: "후쿠오카 → 부산김해",
      date: "2026-08-04 (화)",
      dep: "14:55 후쿠오카공항",
      arr: "16:00 부산김해공항",
      code: "7C1454"
    }
  ]
};

const ITEMS = [
  // ---------------- DAY 1 : 2026-08-02(일) ----------------
  { id: "d1-1", day: 1, time: "13:05", tag: "normal",
    title: "부산김해공항 출발 (7C1453)",
    desc: "부산 → 후쿠오카, 예정 도착 14:05",
    mapQuery: "김해국제공항" ,
    remark: "" },
  { id: "d1-2", day: 1, time: "14:05", tag: "normal",
    title: "후쿠오카 공항 도착",
    desc: "입국수속 & 하카타역 이동 (약 20분)",
    mapQuery: "후쿠오카 공항 국제선터미널" ,
    remark: "" },
  { id: "d1-3", day: 1, time: "15:00", tag: "normal",
    title: "하카타역 도착",
    desc: "짐 가볍게 두고 바로 첫 식사로 이동",
    mapQuery: "하카타역" ,
    remark: "" },
  { id: "d1-4", day: 1, time: "15:30", tag: "food",
    title: "키와미야 함바그 하카타점",
    desc: "첫 일본 식사! 직접 구워먹는 함바그 맛집, 하카타역 도보 4분 (예약 불가, 웨이팅 있을 수 있음)",
    mapQuery: "키와미야 함바그 하카타점" ,
    remark: "" },
  { id: "d1-5", day: 1, time: "16:40", tag: "normal",
    title: "호텔 체크인",
    desc: "프린스 스마트인 하카타",
    mapQuery: "프린스 스마트인 하카타" ,
    remark: "" },
  { id: "d1-6", day: 1, time: "17:30", tag: "food",
    title: "카페 · 신발 벗고 편안하게",
    desc: "일본 감성 가득한 다다미 카페에서 여유 타임",
    mapQuery: "하카타 카페" ,
    remark: "" },
  { id: "d1-7", day: 1, time: "18:30", tag: "shop",
    title: "캐널시티 하카타",
    desc: "분수쇼 & 쇼핑 & 산책",
    mapQuery: "캐널시티 하카타" ,
    remark: "" },
  { id: "d1-8", day: 1, time: "19:30", tag: "normal",
    title: "나카스 강변 산책",
    desc: "여름 축제(마쓰리) 분위기 구경 🎐 여행 기간엔 텐진·하카타 일대에서 야시장 분위기도 즐길 수 있어요",
    mapQuery: "나카스 강변 후쿠오카" ,
    remark: "" },
  { id: "d1-9", day: 1, time: "20:30", tag: "food",
    title: "저녁 - 배고프면 자유식",
    desc: "예약 없이 자유롭게: 편의점 간식 / 야타이(포장마차) / 라멘 / 우나쥬(장어덮밥) 중 그날 컨디션에 맞게",
    mapQuery: "나카스 야타이" ,
    remark: "" },

  // ---------------- DAY 2 : 2026-08-03(월) ----------------
  { id: "d2-1", day: 2, time: "09:00", tag: "normal",
    title: "호텔 출발",
    desc: "",
    mapQuery: "프린스 스마트인 하카타" ,
    remark: "" },
  { id: "d2-2", day: 2, time: "09:30", tag: "normal",
    title: "스미요시 신사",
    desc: "조용하고 아름다운 신사",
    mapQuery: "스미요시 신사 후쿠오카" ,
    remark: "" },
  { id: "d2-3", day: 2, time: "10:10", tag: "normal",
    title: "라쿠스이엔",
    desc: "일본 정원 산책 & 말차 타임",
    mapQuery: "라쿠스이엔 후쿠오카" ,
    remark: "" },
  { id: "d2-4", day: 2, time: "11:30", tag: "normal",
    title: "텐진 이동",
    desc: "지하철로 약 5분",
    mapQuery: "텐진역" ,
    remark: "" },
  { id: "d2-5", day: 2, time: "12:20", tag: "food",
    title: "점심 - 규마부시 무사시 텐진점",
    desc: "A5 흑모와규 규마부시 전문점, 니시테츠후쿠오카(텐진)역 도보 1분. 그대로 → 약미 곁들여 → 오차즈케 3단계로 즐기는 코스",
    mapQuery: "하카타규마부시 무사시 텐진점" ,
    remark: "" },
  { id: "d2-6", day: 2, time: "14:00", tag: "shop",
    title: "텐진 쇼핑 & 산책",
    desc: "PARCO, GU, LOFT, 텐진 지하상가 등",
    mapQuery: "텐진 지하상가" ,
    remark: "고구마스틱 1층" },
  { id: "d2-7", day: 2, time: "16:30", tag: "food",
    title: "블루보틀 커피 텐진점",
    desc: "케고신사 옆, 조용하고 감성적인 공간에서 커피 & 브런치 타임",
    mapQuery: "블루보틀 커피 후쿠오카 텐진점" ,
    remark: "" },
  { id: "d2-8", day: 2, time: "18:30", tag: "food",
    title: "저녁 - 원조 모츠나베 라쿠텐치",
    desc: "숙소 근처! 진한 국물 모츠나베",
    mapQuery: "원조 모츠나베 라쿠텐치 하카타역점" ,
    remark: "" },
  { id: "d2-9", day: 2, time: "20:00", tag: "normal",
    title: "호텔 복귀 & 휴식",
    desc: "",
    mapQuery: "프린스 스마트인 하카타" ,
    remark: "" },

  // ---------------- DAY 3 : 2026-08-04(화) ----------------
  { id: "d3-1", day: 3, time: "08:30", tag: "normal",
    title: "호텔 체크아웃 & 짐 보관",
    desc: "하카타역 짐 보관 이용 (유료)",
    mapQuery: "하카타역 코인로커" ,
    remark: "" },
  { id: "d3-2", day: 3, time: "09:00", tag: "food",
    title: "REC COFFEE 하카타마루이점",
    desc: "바리스타 챔피언 라떼 맛보기",
    mapQuery: "REC COFFEE 하카타마루이" ,
    remark: "" },
  { id: "d3-3", day: 3, time: "10:00", tag: "shop",
    title: "아뮤플라자 하카타 & 한큐백화점",
    desc: "기념품 쇼핑",
    mapQuery: "아뮤플라자 하카타" ,
    remark: "" },
  { id: "d3-4", day: 3, time: "12:00", tag: "food",
    title: "점심 - 스시사카바 사시스 KITTE하카타점",
    desc: "KITTE하카타 B1F, 하카타역 도보 1분 (예약 불가, 웨이팅 있을 수 있음)",
    mapQuery: "스시사카바 사시스 KITTE하카타점" ,
    remark: "" },
  { id: "d3-5", day: 3, time: "13:30", tag: "normal",
    title: "하카타역 → 공항 이동",
    desc: "약 10분",
    mapQuery: "후쿠오카 공항" ,
    remark: "" },
  { id: "d3-6", day: 3, time: "14:55", tag: "normal",
    title: "후쿠오카공항 출발 (7C1454)",
    desc: "예정 도착 16:00 김해공항",
    mapQuery: "후쿠오카 공항 국제선터미널" ,
    remark: "" },
];

// 체크리스트 탭 "참고정보" 섹션에 노출되는 항목 (탭하면 고정 카드 팝업이 열림)
// 여행 중 실제로 자주 확인하는 순서로 배치 (Visit Japan Web은 준비물 아래 고정 카드로 이동함)
const REFERENCE_ITEMS = [
  { id: "ref-japanese-phrases", title: "🗣️ 자주 쓰는 일본어" },
  { id: "ref-shopping-list", title: "🛒 쇼핑리스트" },
  { id: "ref-food-list", title: "🍜 꼭 먹어야 할 음식" },
  { id: "ref-shopping-stores", title: "🛍️ 쇼핑 추천 매장" },
  { id: "ref-airport-station", title: "✈️ 공항 ↔ 하카타 이동" },
];

// "자주쓰는 일본어" 카드에 노출되는 표현 목록
// category별로 묶어 표시함 (인사·기본 / 식당·카페 / 쇼핑 / 이동·기타)
const JAPANESE_PHRASES = [
  // 🙋 인사·기본
  { category: "🙋 인사·기본", ko: "안녕하세요", ja: "こんにちは", pron: "곤니치와" },
  { category: "🙋 인사·기본", ko: "감사합니다", ja: "ありがとうございます", pron: "아리가토 고자이마스" },
  { category: "🙋 인사·기본", ko: "실례합니다", ja: "すみません", pron: "스미마센" },
  { category: "🙋 인사·기본", ko: "괜찮습니다", ja: "大丈夫です", pron: "다이조부 데스" },
  { category: "🙋 인사·기본", ko: "천천히 말씀해주세요", ja: "ゆっくり話してください", pron: "윳쿠리 하나시테 쿠다사이" },
  { category: "🙋 인사·기본", ko: "사진 찍어도 되나요?", ja: "写真を撮ってもいいですか？", pron: "샤신오 톳테모 이이데스카" },

  // 🍜 식당·카페
  { category: "🍜 식당·카페", ko: "계산해주세요", ja: "お会計お願いします", pron: "오카이케이 오네가이시마스" },
  { category: "🍜 식당·카페", ko: "얼마예요?", ja: "いくらですか？", pron: "이쿠라 데스카" },
  { category: "🍜 식당·카페", ko: "추천해주세요", ja: "おすすめは何ですか？", pron: "오스스메와 난 데스카" },
  { category: "🍜 식당·카페", ko: "맛있어요", ja: "おいしいです", pron: "오이시이 데스" },
  { category: "🍜 식당·카페", ko: "물 주세요", ja: "お水お願いします", pron: "오미즈 오네가이시마스" },
  { category: "🍜 식당·카페", ko: "여기서 먹을게요", ja: "ここで食べます", pron: "코코데 타베마스" },
  { category: "🍜 식당·카페", ko: "포장해주세요", ja: "持ち帰りでお願いします", pron: "모치카에리데 오네가이시마스" },

  // 🛍️ 쇼핑
  { category: "🛍️ 쇼핑", ko: "카드 되나요?", ja: "カード使えますか？", pron: "카도 츠카에마스카" },
  { category: "🛍️ 쇼핑", ko: "봉투 주세요", ja: "袋お願いします", pron: "후쿠로 오네가이시마스" },
  { category: "🛍️ 쇼핑", ko: "영수증 주세요", ja: "レシートお願いします", pron: "레시토 오네가이시마스" },
  { category: "🛍️ 쇼핑", ko: "이걸로 주세요", ja: "これをお願いします", pron: "코레오 오네가이시마스" },
  { category: "🛍️ 쇼핑", ko: "현금만 되나요?", ja: "現金だけですか？", pron: "겐킨 다케 데스카" },
  { category: "🛍️ 쇼핑", ko: "이거 시식해도 되나요?", ja: "試食してもいいですか？", pron: "시쇼쿠시테모 이이데스카" },
  { category: "🛍️ 쇼핑", ko: "면세 가능한가요?", ja: "免税できますか？", pron: "멘제이 데키마스카" },
  { category: "🛍️ 쇼핑", ko: "세일 중인가요?", ja: "セール中ですか？", pron: "세루츄 데스카" },

  // 🚌 이동·기타
  { category: "🚌 이동·기타", ko: "화장실 어디예요?", ja: "トイレはどこですか？", pron: "토이레와 도코 데스카" },
  { category: "🚌 이동·기타", ko: "짐 맡길 수 있나요?", ja: "荷物を預けられますか？", pron: "니모츠오 아즈케라레마스카" },
  { category: "🚌 이동·기타", ko: "이거 어디 가는 버스예요?", ja: "これはどこ行きのバスですか？", pron: "코레와 도코유키노 바스데스카" },
];

// ---------------- 참고정보: 쇼핑 추천 매장 (표) ----------------
// 필드명은 다른 여행에서도 그대로 재사용 가능하도록 통일함: name/area/hours/recommend/mapQuery/image
// image는 지금은 비워두고, 나중에 매장 사진 URL을 채우면 표에 썸네일로 자동 표시됨(추후 확장용, 필수 아님)
// hours는 2026년 7월 기준 조사 값으로, 시설 사정에 따라 변경될 수 있어 방문 전 재확인 권장
const SHOPPING_STORES = [
  { name: "UNIQLO", area: "미나 텐진", hours: "10:00~20:00", recommend: "여성 의류, 에어리즘, 린넨셔츠", mapQuery: "유니클로 미나 텐진", image: null },
  { name: "GU", area: "미나 텐진", hours: "10:00~20:00", recommend: "여성 의류, 원피스, 신발", mapQuery: "GU 미나 텐진", image: null },
  { name: "MUJI", area: "JR 하카타시티", hours: "10:00~20:00", recommend: "생활용품, 의류, 화장품, 간식", mapQuery: "무인양품 JR 하카타시티", image: null },
  { name: "LOFT", area: "미나 텐진", hours: "10:00~20:00", recommend: "문구, 여행용품, 화장품", mapQuery: "로프트 미나 텐진", image: null },
  { name: "@cosme STORE", area: "텐진", hours: "10:00~20:30", recommend: "일본 인기 화장품", mapQuery: "코스메 스토어 텐진", image: null },
  { name: "PLAZA", area: "텐진", hours: "10:00~20:00", recommend: "화장품, 캐릭터 굿즈, 간식", mapQuery: "플라자 텐진", image: null },
  { name: "CASETiFY", area: "아뮤플라자 하카타", hours: "10:00~20:00", recommend: "휴대폰 케이스, 액세서리", mapQuery: "케이스티파이 아뮤플라자 하카타", image: null },
  { name: "Don Quijote", area: "텐진", hours: "24시간", recommend: "과자, 의약품, 화장품, 기념품", mapQuery: "돈키호테 텐진", image: null },
];

// ---------------- 참고정보: 쇼핑리스트 / 꼭 먹어야 할 음식 공통 데이터 구조 ----------------
// group: 그룹 제목(이모지 포함) / items: { title, desc(한줄 설명), mapQuery, image } 배열
// 이 구조는 쇼핑리스트·음식 카드가 공유하며, 다른 여행 데이터로도 그대로 재사용 가능함

// ---------------- 참고정보: 쇼핑리스트 (돈키호테 · 기념품만 - 편의점/텐진지하상가 간식류는 음식 카드로 이동) ----------------
const SHOPPING_LIST = [
  { group: "🛍️ 돈키호테", items: [
    { title: "곤약젤리", desc: "저칼로리 인기 젤리 간식", mapQuery: "돈키호테 텐진", image: null },
    { title: "자가리코", desc: "바삭한 스틱 감자칩 과자", mapQuery: "돈키호테 텐진", image: null },
    { title: "알포트 초콜릿", desc: "비스킷 + 초콜릿 스테디셀러 과자", mapQuery: "돈키호테 텐진", image: null },
    { title: "킷캣 일본 한정", desc: "일본에서만 만나는 한정판 킷캣", mapQuery: "돈키호테 텐진", image: null },
    { title: "휴족시간", desc: "여행 필수템, 다리 피로 완화 패치", mapQuery: "돈키호테 텐진", image: null },
    { title: "로이히츠보코 파스", desc: "일본 국민 파스, 어깨·다리 결림에", mapQuery: "돈키호테 텐진", image: null },
    { title: "캔메이크", desc: "가성비 좋은 일본 인기 화장품 브랜드", mapQuery: "돈키호테 텐진", image: null },
    { title: "세잔느", desc: "저렴하고 품질 좋은 베이스 메이크업", mapQuery: "돈키호테 텐진", image: null },
    { title: "멜라노CC", desc: "미백 비타민C 에센스, 여행 필수템", mapQuery: "돈키호테 텐진", image: null },
    { title: "비오레 선크림", desc: "가볍고 산뜻한 사용감의 인기 선크림", mapQuery: "돈키호테 텐진", image: null },
  ]},
  { group: "🎁 후쿠오카 기념품", items: [
    { title: "하카타 토리몬", desc: "후쿠오카 대표 기념품, 부드러운 카스텔라 만주", mapQuery: "하카타 토리몬 후쿠오카", image: null },
    { title: "멘베이", desc: "명란 맛 시즈닝을 뿌린 과자", mapQuery: "멘베이 후쿠오카", image: null },
    { title: "치쿠시모치", desc: "쫄깃한 인절미 스타일 화과자", mapQuery: "치쿠시모치 후쿠오카", image: null },
    { title: "명란 제품", desc: "후쿠오카 특산품, 명란젓 관련 상품", mapQuery: "명란 후쿠오카 선물", image: null },
    { title: "아마오우 딸기 과자", desc: "후쿠오카 명물 딸기맛 과자류", mapQuery: "아마오우 딸기 과자 후쿠오카", image: null },
  ]},
];

// ---------------- 가계부 (나만 보기 전용, Bella Travel 경유 진입 시에만 노출) ----------------
// 외부 가계부 앱(엑셀/CSV)에서 내보낸 원본 내역을 그대로 옮겨 적는 용도.
// splitWith: 나눠 낼 사람(들). 공동/개인 여부는 splitWith.length로 자동 판단함 (app.js 참고)
//   - splitWith 인원이 2명 이상 → 공동경비 (금액을 인원수로 나눈 값이 내 몫)
//   - splitWith 인원이 1명이고 그게 "나"(ME_NAME) → 개인경비 (전액 내 몫)
//   - splitWith 인원이 1명인데 내가 아니면 → 내 가계부에서 제외 (타인 단독 경비)
const ME_NAME = "동녘하늘노을";

const EXPENSES = [
  { day: "여행준비", item: "항공권 왕복-제주항공", category: "항공", amount: 640000, currency: "KRW", krwRate: 1, splitWith: ["동녘하늘노을"] },
  { day: "여행준비", item: "호텔 2박-여기어때 예약", category: "숙소", amount: 210000, currency: "KRW", krwRate: 1, splitWith: ["동녘하늘노을"] },
  { day: "여행준비", item: "스이카 충전", category: "교통", amount: 1000, currency: "JPY", krwRate: 9.4888, splitWith: ["동녘하늘노을"] },
  { day: "여행준비", item: "엄마 2기가 이심", category: "기타", amount: 3900, currency: "KRW", krwRate: 1, splitWith: ["동녘하늘노을"] },
  { day: "여행준비", item: "클룩 무제한 이심", category: "기타", amount: 7548, currency: "KRW", krwRate: 1, splitWith: ["동녘하늘노을"] },
  { day: "여행준비", item: "여행자보험2인 - 현대해상", category: "기타", amount: 5500, currency: "KRW", krwRate: 1, splitWith: ["동녘하늘노을"] },
];

// ---------------- 참고정보: 꼭 먹어야 할 음식 (간식은 구매처별로 분류) ----------------
const FOOD_LIST = [
  { group: "🍽️ 식사", items: [
    { title: "하카타 돈코츠 라멘", desc: "진한 돼지뼈 육수, 후쿠오카 대표 라멘", mapQuery: "하카타 돈코츠 라멘 맛집", image: null },
    { title: "모츠나베", desc: "곱창이 들어간 후쿠오카식 전골 요리", mapQuery: "모츠나베 맛집 후쿠오카", image: null },
    { title: "한입교자", desc: "한입 크기의 바삭한 만두", mapQuery: "한입교자 후쿠오카", image: null },
    { title: "야키토리", desc: "숯불에 구운 꼬치구이, 술안주로 인기", mapQuery: "야키토리 맛집 후쿠오카", image: null },
    { title: "장어덮밥", desc: "달콤짭짤한 소스의 장어 덮밥", mapQuery: "장어덮밥 맛집 후쿠오카", image: null },
    { title: "규카츠", desc: "겉은 바삭, 속은 레어로 즐기는 소고기 커틀릿", mapQuery: "규카츠 맛집 후쿠오카", image: null },
    { title: "회전초밥", desc: "신선한 규슈산 해산물 초밥", mapQuery: "회전초밥 후쿠오카", image: null },
    { title: "야타이 (포장마차)", desc: "나카스 강변의 후쿠오카 명물 포장마차", mapQuery: "나카스 야타이", image: null },
  ]},
  { group: "🍰 간식 · 세븐일레븐", items: [
    { title: "아이스 고구마", desc: "여름 한정 인기 간식, 시원하고 달콤", mapQuery: "세븐일레븐 하카타역", image: null },
    { title: "계란샌드", desc: "편의점 스테디셀러, 폭신한 계란 샌드위치", mapQuery: "세븐일레븐 하카타역", image: null },
    { title: "푸딩", desc: "부드러운 커스터드 푸딩", mapQuery: "세븐일레븐 하카타역", image: null },
    { title: "메론빵", desc: "겉은 바삭 속은 폭신한 인기 빵", mapQuery: "세븐일레븐 하카타역", image: null },
    { title: "프리미엄 커피", desc: "편의점 원두 커피, 가성비 좋음", mapQuery: "세븐일레븐 하카타역", image: null },
  ]},
  { group: "🍰 간식 · 텐진 지하상가", items: [
    { title: "이모야 킨지로 이모켄피", desc: "텐진 지하상가 인기 고구마 스틱, 갓 튀겨줌", mapQuery: "이모야 킨지로 텐진 지하상가", image: null },
    { title: "RINGO 애플파이", desc: "겉바속촉 즉석 구이 애플파이", mapQuery: "링고 애플파이 텐진", image: null },
    { title: "아마오우 딸기 디저트", desc: "후쿠오카 명물 딸기로 만든 디저트", mapQuery: "아마오우 딸기 디저트 텐진", image: null },
  ]},
  { group: "🍰 간식 · 그 외", items: [
    { title: "멘타이 프랑스빵", desc: "명란 버터를 바른 후쿠오카 명물 빵", mapQuery: "멘타이 프랑스빵 후쿠오카", image: null },
    { title: "말차 아이스크림", desc: "진한 말차 향의 아이스크림", mapQuery: "말차 아이스크림 후쿠오카", image: null },
  ]},
];
