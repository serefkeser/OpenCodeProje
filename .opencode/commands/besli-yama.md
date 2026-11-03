---
description: Besli yama prosedurunu uygular ($ARGUMENTS neyi yamalayacagini anlatir) - claude-code-best-practice Command deseniyle projeye uyarlanmistir
---

Kullanicinin istegi: $ARGUMENTS

Bu komut OTONOM projesinin standart **besli yama** prosedurunu yatur. Sira atlanmaz; her
adim kanit zorunludur; sessiz fallback ve "nedeni gizli FAILED" yasaktir.

## Sira

1. **OZET yorumu**: `web/src/App.tsx` ustune yeni `// v1.XX ÖZET: ...` yorum bloğu ekle
   (ne degisti, niye, kanit).
2. **Sürüm yukseltme**: ayni dosyada `APP_VERSION` major/minor/hotfix degerini artir ve
   `web/index.html` icerisindeki `<title>OTONOM 1.XX</title>` basligini guncelle.
3. **FIX_CHECKLIST**: `FIX_CHECKLIST` sabitine yeni girdi ekle (version, key, metin).
4. **Build kaniti**: `web/` dizininde `npx vite build` calistir — 0 hata olmali; hata
   varsa kok nedene inip duzelt, sonra tekrar.
5. **Dokumantasyon**: `CHANGELOG.md` ve `tasks/todo.md` (DEVAM HATTI) girdisi ekle;
   `package.json` version ve `README.md` surum referansini guncelle.
6. **Commit + push**: commit mesajinda Turkce karakter KULLANMA; sonra push et ve push
   kanitini goster.

## Kurallar

- Minimal patch: sadece istegle ilgili fonksiyona dokun; gereksiz refactor yok.
- Kapsam disina cikma; kapsam degismesi gerekirse dur ve yeniden planla.
- Basarili bitince "ne degisti / etkilenen fonksiyonlar / yan etkiler / 3 test maddesi"
  ozetini kullaniciya ver.
