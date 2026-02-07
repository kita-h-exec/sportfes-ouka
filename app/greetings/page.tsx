import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "挨拶 | うんどう会",
  description: "浜松北高等学校 校長・運営委員長の挨拶",
};

export default function GreetingsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-fuchsia-50/40 to-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* soft shapes */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,theme(colors.fuchsia.300)_0%,transparent_60%)] opacity-40" />
        <div className="pointer-events-none absolute -bottom-16 right-10 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,theme(colors.sky.300)_0%,transparent_60%)] opacity-30" />
        <div
          className="absolute inset-0 opacity-10"
          aria-hidden
          style={{
            backgroundImage: "url(/splash-background.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <h1 className="text-center text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-sky-600 sm:text-5xl">
            挨拶
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            北高生の想いが咲き誇る「うんどう会」に寄せて。
          </p>
          <div className="pointer-events-none relative mx-auto mt-8 max-w-3xl">
            <span className="absolute inset-x-0 -top-6 mx-auto text-7xl font-black tracking-widest text-slate-900/5 select-none">謳花</span>
          </div>
        </div>
      </section>

      {/* Greetings */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-10 md:gap-12">
          {/* Principal */}
          <article className="relative rounded-3xl bg-gradient-to-br from-fuchsia-300/40 to-sky-300/40 p-[1px] shadow-sm">
            <div className="rounded-[calc(theme(borderRadius.3xl)-1px)] bg-white/90 p-8 md:p-10 backdrop-blur-sm">
              <header className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  浜松北高等学校　校長　飯田寛志
                </h2>
                <p className="mt-1 text-sm text-slate-500">スローガン「謳花」に寄せて</p>
              </header>
              <div className="space-y-5 text-[17px] leading-8 text-slate-800">
                <p>
                  スローガン「謳花」のもと、北高三大行事の最後を飾る「うんどう会」がいよいよその幕を開けます。北高生の青春が、熱い想いとともに桜のように一斉に咲き誇る瞬間を心から楽しみにしています。
                </p>
                <p>
                  勝ち負けに一喜一憂するだけでなく、互いに励まし合いながら粘り強く取り組む姿こそが、真の輝きです。一人ひとりの努力が仲間との絆を深め、やがて北高の誇りへとつながっていく－そんな感動の瞬間が、今日きっと生まれることでしょう。
                </p>
                <p>
                  若さあふれる力を信じ、仲間とともに心を通わせながらこの日を紡ぎ、かけがえのない成果を築いてくれることを期待しています。
                </p>
              </div>
            </div>
          </article>

          {/* Chairperson */}
          <article className="relative rounded-3xl bg-gradient-to-br from-sky-300/40 to-fuchsia-300/40 p-[1px] shadow-sm">
            <div className="rounded-[calc(theme(borderRadius.3xl)-1px)] bg-white/90 p-8 md:p-10 backdrop-blur-sm">
              <header className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                  令和7年度うんどう会運営委員長　大野凌央
                </h2>
                <p className="mt-1 text-sm text-slate-500">北高生の青春を「謳花」する日</p>
              </header>
              <div className="space-y-5 text-[17px] leading-8 text-slate-800">
                <p>
                  近年、気候変動や社会情勢の影響で、多くの行事が縮小を余儀なくされる中、こうして今年もうんどう会を開催できることを心から嬉しく思います。
                </p>
                <p>
                  形こそ例年とは異なりますが、北高生の熱い想いは一切揺らぎません。
                  それぞれのブロックが築き上げてきた努力の軌跡が、ここに集います。
                </p>
                <p>
                  青春を「謳花」し、全力で駆け抜ける北高生の姿を、どうぞご覧ください！
                </p>
              </div>
            </div>
          </article>

          <hr className="mx-auto mt-2 h-px w-2/3 border-none bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

        </div>
      </section>
    </main>
  );
}
