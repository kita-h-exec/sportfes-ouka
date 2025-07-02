import Link from "next/link";

// 残り日数カウンターコンポーネント（ガワ）
const CountdownTimer = () => {
  // ▼▼▼ Directus連携ポイント or 固定値 ▼▼▼
  // イベント開催日時をここに設定します。
  // Directusから取得しても良いですし、固定でもOKです。
  const eventDate = "2024-10-26T09:00:00"; 

  // 本来はここで現在時刻との差を計算するロジックが入ります。
  // 今回はガワなのでダミーの値を表示します。
  return (
    <div className="bg-white/70 backdrop-blur-sm p-6 rounded-lg shadow-lg text-center">
      <h2 className="text-xl font-bold mb-2">イベント開催まで</h2>
      <div className="text-4xl md:text-6xl font-mono font-bold text-indigo-600">
        <span className="tabular-nums">123</span>日 
        <span className="tabular-nums">08</span>:
        <span className="tabular-nums">45</span>:
        <span className="tabular-nums">32</span>
      </div>
    </div>
  );
};

// 予定表示コンポーネント（ガワ）
const SchedulePreview = () => {
  // ▼▼▼ Directus連携ポイント ▼▼▼
  // ここでDirectusから「現在の予定」「次の予定」を取得します。
  const currentSchedule = { // ダミーデータ
    time: "10:00 - 11:00",
    title: "開会式",
    location: "体育館",
  };
  const nextSchedule = { // ダミーデータ
    time: "11:00 - 12:00",
    title: "吹奏楽部 演奏",
    location: "ステージ",
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-12">
      <h2 className="text-2xl font-bold text-center mb-4">現在の予定</h2>
      <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500 mb-4">
        <p className="text-sm text-gray-500">{currentSchedule.time} @ {currentSchedule.location}</p>
        <p className="font-bold text-lg">{currentSchedule.title}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 opacity-70">
        <p className="text-sm text-gray-500">{nextSchedule.time} @ {nextSchedule.location}</p>
        <p className="font-bold text-lg">{nextSchedule.title}</p>
      </div>
      <p className="text-center mt-4 text-indigo-600 hover:underline">
        <Link href="/schedule">全ての予定を見る →</Link>
      </p>
    </div>
  );
};


export default function HomePage() {
  // スプラッシュスクリーンはCSSやJSで複雑になるため、今回は省略しています。
  // 必要であれば、別途コンポーネントとして作成します。

  return (
    <div>
      {/* 1. メインビジュアルエリア */}
      <div className="relative h-[60vh] bg-gray-400 flex items-center justify-center">
        {/* 背景画像はCSSの `background-image` で設定するのがおすすめ */}
        <img src="https://via.placeholder.com/1200x800" alt="イベントテーマ画像" className="absolute top-0 left-0 w-full h-full object-cover -z-10" />
        <div className="absolute top-0 left-0 w-full h-full bg-black/30 -z-10"></div>
        
        <CountdownTimer />
      </div>

      {/* 2. コンテンツエリア */}
      <div className="container mx-auto px-4 py-12">
        <SchedulePreview />
        
        {/* 目次ページへのリンク */}
        <div className="text-center mt-16">
          <Link href="/contents" className="bg-indigo-600 text-white font-bold py-3 px-8 rounded-full text-lg hover:bg-indigo-700 transition-colors">
            コンテンツ一覧
          </Link>
        </div>
      </div>
      
      {/* 3. 来場者への案内ボタン（右下固定） */}
      <Link href="/visitors-guide" className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 transition-transform hover:scale-110">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      </Link>
    </div>
  );
}