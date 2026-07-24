/**
 * App — L4 Presentation のルート（EP-14 骨格）。
 *
 * 現時点では基盤検証のための静かなプレースホルダ。
 * ゲームプレイ（タイトル・部屋・猫）は Sprint 2 以降。
 *
 * トーン方針（Pillar 6 / 憲章§9.6）に従い、派手な要素を持たない。
 */
export function App() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        color: '#4a4a4a',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <p aria-label="準備中">…</p>
    </main>
  );
}
