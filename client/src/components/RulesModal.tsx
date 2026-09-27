import React from 'react';
import { X, Crown, Eye, Radio, ArrowLeftRight, Award, Zap, Layers, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none"
      onClick={onClose}
    >
      <div
        className="bg-[#16271e] border border-[#3b5d47]/80 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative text-[#e6f4ea]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#1e3326] hover:bg-[#284433] text-[#d1fae5] border border-[#355740]/60 transition cursor-pointer shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-6 h-6 text-amber-300" />
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 font-['Comfortaa',sans-serif]">
            🌿 REY — Oyun Kuralları & Rehber
          </h2>
        </div>
        <p className="text-xs text-[#9db6a5] mb-6">
          2 Kişilik Hızlı Zihin ve Kart Oyunu • 32 Kart • 3 Tur • 3 El (Parti)
        </p>

        {/* Core Objective */}
        <div className="bg-[#24170d]/70 border border-[#b45309]/50 rounded-2xl p-4 mb-4 shadow-sm">
          <h4 className="font-bold text-amber-200 text-sm flex items-center gap-1.5 mb-1">
            <Award className="w-4 h-4 text-amber-400" /> Temel Amaç ve Parti Sistemi
          </h4>
          <p className="text-xs text-[#d5e4da] leading-relaxed">
            Rey, 2 kişilik hızlı bir zihin/kart oyunudur. Oyuncuların amacı, destede bulunan <strong>32 kartı</strong> göz önünde bulundurarak <strong>3 Tur</strong> içerisinde ellerinde bulunan kartların toplamlarını azaltmaktır.
            <br className="my-1" />
            Rey, 3 oyunluk <strong>"Partiler"</strong> ile oynanır. 3 ardı ardına oynanan el bir partiye eşdeğerdir. Oyun içerisindeki davranışlarınız ve elleri kazanmanız size skor kazandırır, Parti sonunda skoru daha yüksek olan oyuncu Partiyi kazanır!
          </p>
        </div>

        {/* Starting Hand */}
        <div className="bg-[#112218]/80 border border-[#2b4737]/60 rounded-2xl p-4 mb-4 text-xs shadow-sm">
          <h4 className="font-bold text-[#e6f4ea] text-sm flex items-center gap-1.5 mb-1.5">
            <Layers className="w-4 h-4 text-cyan-300" /> Başlangıç Dağıtımı (4 Kart)
          </h4>
          <p className="text-[#a7bfae] leading-relaxed">
            Oyun, oyunculara 4 adet kart dağıtılması ile başlar. Bu kartların <strong>ikisini oyuncular kendileri seçerek ezberler (başlangıçta 12 saniye süre verilir)</strong>, diğer ikisini ise oyun içinde özel güçlerle keşfetmeleri gerekir.
          </p>
        </div>

        {/* Turn Flow & Pair Discard */}
        <div className="mb-4">
          <h3 className="font-bold text-[#e6f4ea] text-sm mb-2.5">Sıranızda Yapabileceğiniz Hamleler:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-[#112218]/80 border border-[#2b4737]/60 shadow-sm">
              <span className="font-bold text-amber-300 block mb-1">1. Kart Çekme & Değiştirme</span>
              Desteden veya ortadaki atılmış karttan bir kart çekin. Elinizdeki bir kartla yer değiştirin veya çekilen kartı doğrudan ortaya atın.
            </div>
            <div className="p-3 rounded-xl bg-[#24170d]/70 border border-[#b45309]/50 shadow-sm">
              <span className="font-bold text-[#fde68a] block mb-1">2. Çiftleme, Üçleme & Dörtleme</span>
              Elinizdeki aynı kartları birleştirip atarak elinizi hafifletebilirsiniz:
              <ul className="mt-1 space-y-0.5 text-[11px] list-disc list-inside text-[#d5e4da]">
                <li><strong>Çiftleme (2 Kart):</strong> 2 kart atılır, desteden 1 kart çekilir (El: 3 kart, <strong>+20 Skor</strong>).</li>
                <li><strong>Üst Üste Çift:</strong> Arka arkaya atılan başarılı ikinci çift ayrıca <strong>+20 Skor</strong> kazandırır.</li>
                <li><strong>Üçleme / Dörtleme:</strong> Eş kartları azaltır fakat ayrıca skor kazandırmaz.</li>
              </ul>
              <span className="text-[10px] text-amber-200 font-semibold block mt-1">Partinin 3. elinde bütün skor ödülleri ve cezaları 3 ile çarpılır.</span>
            </div>
          </div>
        </div>

        {/* 3 Ways to Win a Hand */}
        <div className="bg-gradient-to-r from-[#18261b] via-[#213828] to-[#18261b] border border-[#386249]/60 rounded-2xl p-4 mb-4 text-xs shadow-sm">
          <h4 className="font-bold text-amber-200 text-sm flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> Eli Kazanmanın 3 Yolu:
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 text-[#d5e4da]">
            <li>
              <strong>3 Turun Ardından En Düşük Ele Sahip Olmak:</strong> İki oyuncu da 3'er hamle yaptıktan sonra kartlar açılır, toplamı düşük olan eli kazanır.
            </li>
            <li>
              <strong>"Rey" Tuşuna Basmak:</strong> Elinizde karşıdaki oyuncudan daha az puan bulunduğunu düşünürseniz "Rey" tuşuna basabilirsiniz. Sıranız sonlanır, rakibiniz son hamlesini yapar. Çağrıyı düşük elle kazanmak <strong>+60 skor</strong>, yüksek elle bitirmek <strong>-10 skor</strong> getirir. Normal düşük el galibiyeti <strong>+40 skor</strong> kazandırır.
            </li>
            <li>
              <strong>Kamikaze:</strong> Elinizde tam olarak <strong>12, 12, 13, 13</strong> varsa "Kamikaze" tuşuna basarak partiyi anında kazanabilirsiniz. Rakibiniz <strong>-20 skor</strong> alır. Kamikaze şansını kullanmadan eli bitirmek de <strong>-20 skor</strong> getirir.
            </li>
          </ol>
        </div>

        {/* 32 Card Deck Distribution & Standard Abilities */}
        <div className="bg-[#112218]/80 border border-[#2b4737]/60 rounded-2xl p-4 mb-4 text-xs shadow-sm">
          <h4 className="font-bold text-[#e6f4ea] text-sm flex items-center gap-1.5 mb-2">
            <Layers className="w-4 h-4 text-amber-400" /> 32 Kartlık Deste Dağılımı ve Kart Güçleri:
          </h4>
          <p className="text-[#a7bfae] leading-relaxed mb-2">
            Desteden çekilen 11 ve 12 değerli kartlar doğrudan ortaya atıldığında Takas gücü aktif edilebilir:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-[#0e1c14] border border-[#233f2d]">
              <strong className="text-slate-200">Kartlar 0 - 10 (22 Kart):</strong> Her birinden 2'şer adet; standart sayı kartları, özel gücü yoktur.
            </div>
            <div className="p-2 rounded-lg bg-[#2f1721]/80 border border-rose-500/40 text-rose-200">
              <strong className="text-rose-300">Kartlar 11 (2 Adet) & 12 (4 Adet):</strong> <strong>Takas (Swap)</strong> — Bakmadan rakibinle 1 kart takas edebilirsin.
            </div>
            <div className="p-2 rounded-lg bg-[#2d1217]/80 border border-amber-500/50 sm:col-span-2 text-amber-200">
              <strong className="text-amber-300">Kartlar 13 (4 Adet) & 12 (4 Adet) — Kamikaze:</strong> 13 kartlarının standart gücü yoktur. Elinizde <strong>12, 12, 13, 13</strong> topladığınızda maçı anında kazandırırlar!
            </div>
          </div>
        </div>

        {/* Tur 2 Special Powers */}
        <div className="mb-2">
          <h3 className="font-bold text-[#e6f4ea] text-sm flex items-center gap-1.5 mb-2.5">
            <Zap className="w-4 h-4 text-amber-400" /> 2. Turda Özel Güç Seçimi:
          </h3>
          <p className="text-xs text-[#9db6a5] mb-3">
            Oyunun 2. turunda üç güç slotunda beliren seçeneklerden birini seçersiniz. Bazı slotlar boş kalabilir. Röntgen ve Casusluk üç seviyeye sahiptir:
          </p>

          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#24172f]/80 border border-purple-500/40 text-purple-200">
              <Eye className="w-5 h-5 text-purple-300 shrink-0 mt-0.5" />
              <div>
                <strong className="text-purple-300 block">1. Röntgen (Peek)</strong>
                Kendi kartlarınızın birini (Seviye 1), ikisini (Seviye 2) veya bütün elinizle sıradaki deste kartını (Seviye 3) görmenizi sağlar.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0f282e]/80 border border-cyan-500/40 text-cyan-200">
              <Radio className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
              <div>
                <strong className="text-cyan-300 block">2. Casusluk (Spy)</strong>
                Rakibinizin kartlarından birini (Seviye 1), ikisini (Seviye 2) veya hepsini (Seviye 3) 3 saniyeliğine görmenizi sağlar.
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-[#2f1721]/80 border border-rose-500/40 text-rose-200">
              <ArrowLeftRight className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300 block">3. El Değiştirme (Swap)</strong>
                Rakibiniz ile ellerinizi takas eder! Tüm kartlar kapalı şekilde masa üzerinde yer değiştirir.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
