async function loadJSON(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return await res.json();
}

function unique(arr) { return Array.from(new Set(arr)); }

function buildIndexByKey(arr, key = 'EnumValue') {
  const map = new Map();
  for (const item of arr) map.set(item[key], item);
  return map;
}
function buildIndexByNumber(arr, key = 'Index') {
  const map = new Map();
  for (const item of arr) map.set(Number(item[key]), item);
  return map;
}

async function init() {
  const [weapons, attachments, indexmap] = await Promise.all([
    loadJSON('./data/weapons.json'),
    loadJSON('./data/attachments.json'),
    loadJSON('./data/indexmap.json'),
  ]);

  // 索引（どちらも作る：Indexベース / Keyベース）
  const attByIndex = buildIndexByNumber(attachments, 'Index');
  const attByKey   = buildIndexByKey(attachments, 'AttachmentKey');

  // UI要素
  const sel = document.getElementById('weaponSelect');
  const cat = document.getElementById('catFilter');
  const kw  = document.getElementById('kw');
  const tbody = document.getElementById('tbody');
  const meta = document.getElementById('meta');

  // 武器プルダウン
  weapons.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.WeaponKey;
    opt.textContent = w.NameJP || w.WeaponKey;
    sel.appendChild(opt);
  });

  // カテゴリ選択（attachmentsから収集）
  const cats = unique(attachments.map(a => a.Category).filter(Boolean)).sort();
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    cat.appendChild(opt);
  });

  function render() {
    const key = sel.value;
    const mapEntry = indexmap.find(m => m.WeaponKey === key);
    if (!mapEntry) { tbody.innerHTML = ''; meta.textContent = '該当なし'; return; }

    // ① Index配列 → ② Key配列（将来のため両対応）
    let items = [];
    if (Array.isArray(mapEntry.AttachmentIndexes) && mapEntry.AttachmentIndexes.length) {
      items = mapEntry.AttachmentIndexes
        .map(i => attByIndex.get(Number(i)))
        .filter(Boolean);
    } else if (Array.isArray(mapEntry.AttachmentKeys) && mapEntry.AttachmentKeys.length) {
      items = mapEntry.AttachmentKeys
        .map(k => attByKey.get(String(k)))
        .filter(Boolean);
    }

    // フィルタ（カテゴリ・キーワード）
    const catVal = cat.value.trim().toLowerCase();
    const q = kw.value.trim().toLowerCase();

    const filtered = items.filter(a => {
      const okCat = !catVal || String(a.Category).toLowerCase() === catVal;
      const text = `${a.NameJP || ''} ${a.NameEN || ''} ${a.AttachmentKey}`.toLowerCase();
      const okKw = !q || text.includes(q);
      return okCat && okKw;
    });

    tbody.innerHTML = '';
    filtered.forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.NameJP || a.NameEN || a.AttachmentKey}</td>
        <td>${a.Category || ''}</td>
        <td>${a.Cost === 0 ? '調査中' : a.Cost ?? ''}</td>
        <td>${a.AttachmentKey}</td>
      `;
      tbody.appendChild(tr);
    });

    meta.textContent = `総数: ${items.length} / 表示: ${filtered.length}`;
  }

  sel.addEventListener('change', render);
  cat.addEventListener('change', render);
  kw.addEventListener('input', render);

  // 初期描画
  if (weapons.length) sel.value = weapons[0].WeaponKey;
  render();
}

init().catch(err => {
  console.error(err);
  alert('初期化に失敗しました。Consoleを確認してください。');
});
