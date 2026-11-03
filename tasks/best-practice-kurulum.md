# claude-code-best-practice — proje kurulum kaydı (v1.207)

**Tarih:** 3 Kasım 2026
**Kaynak repo:** https://github.com/shanraisshan/claude-code-best-practice
**Klon edilen commit:** `af996886c3aefc93919494fe1933aa48a6dffb8e` (shallow clone, MIT)
**Yer:** `vendor/claude-code-best-practice/` (referans kütüphane; `.git` söküldü, düz dosya olarak commit edilir)
**Kapsam onayı:** kullanıcı "C — Tam uyarlama" seçti (kapsam sorusu ile soruldu, madde madde dokunma listesi sunuldu).

## Neden ve ne kuruldu

Repo Claude Code'a yönelik bir best-practice koleksiyonudur. Somut kurulabilir parçaları:
örnek orchestration seti (Command → Agent → Skill) +shaled iş akış desenleri +
teknik ipuçları. Bu projede (OpenCode ortamı) seçili parçalar OpenCode formatına
çevrildi; repo'nun Claude Code'a özgü kısımları (hooks/sesler, presentation-agent'lar,
MCP ayarları, CLAUDE.md) bilinçli olarak alınmadı — projemizin eşdeğerleri zaten var
(global AGENTS.md OmniRule + ~200 skill; KISS/YAGNI).

| Repo dosyası | Projeye eklenen | Format notu |
|---|---|---|
| `.claude/commands/weather-orchestrator.md` | `.opencode/commands/weather-orchestrator.md` | AskUserQuestion→question, Agent→subagent, Skill→skill aracına çevrildi; fail-closed kelimeleri aynen korundu |
| `.claude/agents/weather-agent.md` | `.opencode/agents/weather-agent.md` | allowedTools→permission (edit/bash/webfetch/websearch: deny); hooks+memory Claude'a özgü → düşürüldü |
| `.claude/skills/weather-fetcher/SKILL.md` | `.claude/skills/weather-fetcher/SKILL.md` | AYNEN kopya — OpenCode `.claude/skills/*/SKILL.md` konumunu resmi olarak okur |
| `.claude/skills/weather-svg-creator/*` | `.claude/skills/weather-svg-creator/` | AYNEN kopya (SKILL.md + reference.md + examples.md) |
| `.claude/commands/time-command.md` | `.opencode/commands/time-command.md` | subtask: true + agent: time-agent frontmatter'ı eklendi |
| `.claude/agents/time-agent.md` | `.opencode/agents/time-agent.md` | bash izni tek komuta daraltıldı (`TZ='Asia/Karachi'*`); diğerleri deny |
| `.claude/skills/time-skill/SKILL.md` | `.claude/skills/time-skill/SKILL.md` | AYNEN kopya |
| — (bizim desen) | `.opencode/commands/besli-yama.md` | Repo Command deseni, bizim beşli yama prosedürüne uygulandı |

## Kanıtlar

1. **Instalasyon kanımı (canlı):** kurulumdan hemen sonra OpenCode oturum güncellemesi
   üç skill'i AKTİF skill kadrosunda gösterdi: `time-skill`, `weather-fetcher`,
   `weather-svg-creator`. Yani `.claude/skills/` konumu gerçekten yüklendi (varsayım değil, sistem teyiti).
2. Build kanımı: `npx vite build` ✓ (bkz. CHANGELOG v1.207).
3. Komutlar `/weather-orchestrator`, `/time-command`, `/besli-yama` bir sonraki
   oturum açılışında `/` menüsünde görünmeli (OpenCode komut listesi oturum başında yenilenir).

## Kullanım

- `/weather-orchestrator` — örnek orchestration koşusu (Dubai sıcaklığı → SVG kart → `orchestration-workflow/output.md`)
- `/time-command` — PKT saati (subagent üzerinden)
- `/besli-yama <konu>` — projenin standart beşli yama prosedürü komutu
- Referans: `vendor/claude-code-best-practice/README.md` (Research → Plan → Execute → Review → Ship deseni; 83 ipucu; iş akış kataloğu)

## Güncelleme

Repo düz dosya olarak vendor'da. Yenilemek için: klonun yeni commit'ini alıp
`vendor/` içeriğini eşitleyin (eski `.git` söküldü; yeniden `git clone --depth 1`
+ `.git` silme + commit).
