// Buffer kaldırma — tek geçiş satır kesme + string değiştirme (anchor doğrulamalı).
// Kural: her cut için start ve end satır prefix'i doğrulanır; uymazsa abort (dosya yazılmaz).
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'web/src/App.tsx';
const src = readFileSync(path, 'utf8');
const lines = src.split('\n');

const t = i => String(lines[i - 1] ?? '').trim();
// [start, end, startPrefix, endPrefix|null]  — endPrefix null ise satır sayısı kesmiyor, sadece end `};`/`})}` tipinde değilse uyar
const cuts = [
  // --- canlı izleme / performance posting kalıntıları
  [16777, 16781, '<footer className="grid shrink-0 grid-cols-2', '</footer>'],
  [16725, 16727, '<div className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5"><div className="text-[8px] text-slate-500">YAYINLANDI', 'TEKRAR / LİMİT'],
  [16687, 16687, '{liveMonitorPendingTasks.length + liveMonitorRetryTasks.length} bekliyor', 'bekliyor</span>'],
  [16077, 16118, "{activeTab === 'posting' && (() => {", '})()}'],
  [16074, 16074, "<button onClick={() => { setActiveTab('posting');", '</button>'],
  [15913, 15914, 'const line = `', "/(buffer|gönderim|gonderim|kuyruk|scheduler|yayın|yayin|paylaş|paylas|instagram"],
  [15911, 15911, 'const liveMonitorNextRetry =', 'Infinity);'],
  [15873, 15875, 'const performanceCompletedDeliveries =', 'performanceAverageDeliveryMs;'],
  [15861, 15867, 'const liveMonitorVideos = postingDashboard.videos', 'const liveMonitorLastPosted ='],
  // --- 07:00 koşucu buffer alanları
  [15785, 15785, 'bufferScheduled: batch.bufferScheduled || [],', 'bufferScheduled: batch.bufferScheduled || [],'],
  [15708, 15708, 'bufferOk: batch.bufferScheduled.some(', 'bufferOk: batch.bufferScheduled.some('],
  [15703, 15703, 'bufferMs,', 'bufferMs,'],
  [15692, 15695, 'const bufferMs =', ': 0;'],
  [15644, 15645, 'let bufferStartedAt = 0;', 'let bufferFinishedAt = 0;'],
  [15549, 15550, 'bufferAutoIntervalMinutesRef.current = 0;', "SafeStorage.setItem(BUFFER_AUTO_INTERVAL_KEY, '0');"],
  [15541, 15547, 'bufferAutoIntervalMinutesRef.current = 0;', "SafeStorage.setItem(BUFFER_AUTO_NEXT_DUE_KEY, '0');"],
  [15529, 15530, 'bufferScheduled: [],', 'bufferFailed: [],'],
  [15482, 15482, 'bufferScheduled: batch.bufferScheduled || [],', 'bufferScheduled: batch.bufferScheduled || [],'],
  // --- veya MP4 finalize onPrepared blok
  [12114, 12123, 'onPrepared: shouldQueuePosting ? async (mediaUrl, fileName) => {', '} : undefined }'],
  // --- scheduler + share akışı ana kütle
  [11669, 11967, 'const runPostingSchedulerTick = async () => {', '};'],
  [11531, 11565, 'const enqueueMediaForPosting = async (', '};'],
  // --- paylaşım akışı
  [11011, 11530, 'const shareToBufferAPI = async (text, mediaUrl = null, shareOptions = {}) => {', 'Üretim tarafı yalnız videoyu/metadata'],
  // --- cloud/bridge
  [10838, 11010, 'const uploadMediaToCloud = async (blobOrUrl, fileName = ', 'localhost/BAT/CORS yok'],
  [10779, 10837, 'const bufferExtensionUploadMedia = async (blob, fileName, uploadOptions', ''],
  [10767, 10778, 'const reserveNextBufferAutoSlot = () => {', ''],
  [10713, 10759, 'const bufferGraphQLViaExtension = async (query, variables = {}) => {', ''],
  [10682, 10712, 'const probeBufferMediaHost = async (requireDurable = true)', ''],
  [10645, 10681, 'const probeBufferExtension = async () => {', ''],
  [10639, 10644, 'const bufferContextFailure = data => {', ''],
  [10563, 10638, '// Bulut yükleme (Buffer için)', ''],
  // --- otomatik buffer anahtarları + paylaşım panel durumları
  [10441, 10476, '// v1.37 Buffer Chrome Extension bridge', ''],
  [10385, 10440, 'const postingSchedulerRef = useRef({', ''],
  [10378, 10383, "const [connectedPlatforms, setConnectedPlatforms] = useState", 'const [postingSchedulerState, setPostingSchedulerState]'],
  // --- review flow tarzı
  [10271, 10290, 'const playReviewedVideo = async () => {', '}, []);'],
  [10170, 10178, 'const reviewedShareRef = useRef(null);', "const autoReviewActive = ['preparing', 'review', 'countdown'].includes(autoReview.phase);"],
  // --- posting kuyruğu modülü
  [2835, 2923, '// v1.130: Kuyruk metaverisi ile MP4 Blob', '};'],
  [2599, 2601, "const STORE_POST_VIDEOS = 'posting_videos';", "const STORE_POST_TASKS = 'posting_tasks';"],
  // --- BufferBudget
  [3114, 3205, '// === v1.107 BUFFER İSTEK BÜTÇESİ ===', '};'],
  // --- createReviewedBufferFlow
  [1689, 1813, '// v1.104: yalnız bu oturumda üretilen video;', '};'],
  // --- helpers
  [81, 128, 'const bufferSocialService = value => {', 'const bufferDuration = ms =>'],
  [133, 133, 'const AUTO_BUFFER_SHARING_ENABLED = false;', 'const AUTO_BUFFER_SHARING_ENABLED = false;'],
  // --- kalan ama modifiye edilecek: 16559-16573 autoReview paneli, 16579-16632 paylaşım paneli
  [16579, 16632, "{bufferShareReport.status !== 'idle' && (", ')}'],
  [16576, 16576, 'shareToSelectedPlatforms', '</button>'],
  [16559, 16573, "config.outputType !== 'image' && autoReview.phase !== 'idle'", ')}'],
  [16537, 16537, "reviewFlowRef.current.block(autoReview.id,", "reviewFlowRef.current.block(autoReview.id,"],
  [16527, 16527, 'reviewFlowRef.current.ended(autoReview.id);', 'reviewFlowRef.current.ended(autoReview.id);'],
  [16519, 16519, 'reviewFlowRef.current.playing(autoReview.id);', 'reviewFlowRef.current.playing(autoReview.id);'],
  [16396, 16396, 'cancelReviewedShare', 'İPTAL ET — TÜM SÜRECİ DURDUR</button>'],
  [16394, 16394, 'entry.report?.results?.map', 'Onay bekliyor'],
  [355, 356, '// v1.37 Buffer API anahtarı artık TSX/localStorage içinde tutulmaz.', 'storage.local alanındadır.'],
  [465, 468, '/Buffer gönderim denemeleri tamamlandı/i.test(text)) {', '}'],
  [473, 477, '// Başlık bilgisini video kuyruğa yazıldığı', '}'],
  [446, 447, "{ id: 'cloudinary', label: 'Medya yükleme', start: /Video\\/Medya", "{ id: 'buffer', label: 'Buffer gönderim isteği',"],
];

const guardCancels = [12796, 12870, 12963, 12972, 14919, 15125, 15269, 15367, 15408];
for (const n of guardCancels) cuts.push([n, n, 'reviewFlowRef.current.cancel(', 'reviewFlowRef.current.cancel(']);

// 1) Anchor doğrula (start prefix içerir mi; end prefix içerir mi)
const problems = [];
for (const [s, e, sp, ep] of cuts) {
  const a = t(s), b = t(e);
  if (!a.includes(sp)) problems.push(`START ${s}: beklenen "${sp}" — bulunan: ${a.slice(0, 90)}`);
  if (ep && !b.includes(ep)) problems.push(`END ${e}: beklenen "${ep}" — bulunan: ${b.slice(0, 90)}`);
}
if (problems.length) {
  console.error('ANCHOR HATASI — dosya değiştirilmedi:\n' + problems.join('\n'));
  process.exit(1);
}

// 2) Kes (büyükten küçüğe)
const sorted = [...cuts].sort((x, y) => y[0] - x[0] || y[1] - x[1]);
for (const [s, e] of sorted) {
  lines.splice(s - 1, e - s + 1);
}

// 3) String düzeltmeleri (kesme sonrası)
let out = lines.join('\n');
const replaces = [
  // cancelReviewedShare: flow iptali kaldır
  [
    `    const reviewCancelled = reviewFlowRef.current.cancel('Kalan gazete sırası iptal edildi. MP4 kaydı korunuyor; otomatik Buffer paylaşımı kapalı.');\n    if (queueCancelled || previewCancelled || reviewCancelled) {`,
    `    if (queueCancelled || previewCancelled) {`
  ],
  // dispose'dan reviewFlowRef çıkar
  [
    `useEffect(() => () => { gazeteQueueRef.current.cancel(); reviewFlowRef.current.dispose(); }, []);`,
    `useEffect(() => () => { gazeteQueueRef.current.cancel(); }, []);`
  ],
  // AssetManagerService _openDB: STORE_POST şemaları kaldır
  [
    ` if (!db.objectStoreNames.contains(STORE_POST_VIDEOS)) db.createObjectStore(STORE_POST_VIDEOS, { keyPath: 'id' }); if (!db.objectStoreNames.contains(STORE_POST_MEDIA)) db.createObjectStore(STORE_POST_MEDIA, { keyPath: 'id' }); if (!db.objectStoreNames.contains(STORE_POST_TASKS)) db.createObjectStore(STORE_POST_TASKS, { keyPath: 'id' });`,
    ``
  ],
  // performanceRuns: bufferMs alanı
  [`productionMs: null, bufferMs: null, sourceCount: null`, `productionMs: null, sourceCount: null`],
  // logEndRef efekti: autoReviewActive kaldır
  [`if (!logEndRef.current || autoReviewActive) return;`, `if (!logEndRef.current) return;`],
  [`}, [sysLogs, uiState.isProcessing, autoReviewActive]);`, `}, [sysLogs, uiState.isProcessing]);`],
  // YENİ HABER butonu: ilgili koşul/çağrı
  [`disabled={finalMp4Busy || autoReview.phase === 'sharing' || bufferShareReport.status === 'sharing'}`, `disabled={finalMp4Busy}`],
  [`onClick={async () => { cancelReviewedShare(); setUiState`, `onClick={async () => { setUiState`],
  // 07:00 log metinleri
  [` | otomatik Buffer paylaşımı=kapalı`, ``],
  [` | otomatik_Buffer=kapalı`, ``],
  // performance run satırında Buffer süresi span'ı
  [`<span className="text-indigo-200">Başlangıç → Buffer: {livePerfDuration(run.bufferMs)}</span>`, ``],
  // autoSave çağrı yorumları
  [`// v1.154: üretim hiçbir koşulda otomatik Buffer kuyruğuna teslim etmez. MP4 yerel olarak hazırlanır/indirilir.\n`, ``],
  // canlı izleme yorumu
  [`// Floating live monitor data is derived from the same live log stream and durable queue dashboard.\n`, ``],
];
for (const [oldStr, newStr] of replaces) {
  if (!out.includes(oldStr)) { console.error('REPLACE BULUNAMADI: ' + oldStr.slice(0, 80)); process.exit(1); }
  out = out.split(oldStr).join(newStr);
}

writeFileSync(path, out);
console.log('OK — kesilen blok: ' + cuts.length + ', yerine yazılan: ' + replaces.length);
