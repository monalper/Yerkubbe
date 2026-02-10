# Yerkubbe (React + Vite + Supabase)

Wikipedia benzeri (TOC, başlık anchor’ları, kaynaklar/[1] atıflar, iç link kontrolü) ama sana özel makale sitesi.

## Kurulum

```bash
npm install
cp .env.example .env
npm run dev
```

`.env` içine:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_SITE_URL=https://site-domainin.com
```

SEO için build sonrası sitemap üretmek istersen:

```bash
npm run build:seo
```

## Supabase kurulumu

1) Supabase projesi oluştur.
2) SQL Editor’da `supabase/schema.sql` dosyasını çalıştır.
3) Auth → Email/Password açık olsun.
4) Storage:
   - Dashboard → Storage → Create bucket: `media` (Public: ON)
   - Policy’leri ekleme:
     - Eğer SQL Editor izin veriyorsa `supabase/storage-policies.sql` çalıştır.
     - Eğer “must be owner of table objects” alırsan Dashboard → Storage → Policies ekranından aynı policy’leri UI ile ekle.
4) İlk admin kullanıcı:
   - Auth’ta kullanıcı oluştur (veya uygulamadan sign-in yap).
   - SQL Editor:
     ```sql
     update public.profiles set role = 'admin' where id = '<USER_UUID>';
     ```

## Route’lar

- Public:
  - `/` Anasayfa
  - `/text/:slug` Makale detay
  - `/search?q=` Arama
- Admin:
  - `/admin/login` Admin giriş
  - `/admin/articles` Makale yönetimi
  - `/admin/articles/new` Yeni makale
  - `/admin/articles/:id/edit` Düzenle

## Dosya yapısı (özet)

```
src/
  app/
    App.tsx
    router.tsx
  features/
    articles/
      queries.ts
      types.ts
    editor/
      ArticleEditor.tsx
      editor.module.css
      tiptap.module.css
    reader/
      ArticleRenderer.tsx
      docUtils.ts
      reader.module.css
    shared/
      tiptap/
        AnchoredHeading.ts
        BrokenInternalLinks.ts
        Citation.tsx
        Figure.tsx
        Math.tsx
        WikiLink.ts
        nodes.module.css
        text.ts
  lib/
    auth/
      AuthProvider.tsx
      RequireAdmin.tsx
    supabaseClient.ts
  pages/
    admin/
      AdminLoginPage.tsx
      AdminArticlesPage.tsx
      AdminArticleNewPage.tsx
      AdminArticleEditPage.tsx
    public/
      HomePage.tsx
      ArticlePage.tsx
      SearchPage.tsx
  ui/
    layout/
    nav/
    primitives/
supabase/
  schema.sql
```

## Editör notları

- H1 içerikte yok (makale başlığı ayrı); içerik başlıkları H2–H6.
- İç link: `/text/<slug>` formatı.
- Atıf/kaynak: sağ panelde kaynak oluştur → “Bu kaynağı metne ekle” ile [1], [2]…
- Görsel: yükleyince `figure` eklenir; caption + kaynak + lisans alanları zorunlu.
- Kırık iç linkler editörde işaretlenir; detay sayfasında da uyarı gösterir.
