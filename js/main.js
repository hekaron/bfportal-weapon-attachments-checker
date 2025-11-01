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
  const [weapons, attachments, weaponMap] = await Promise.all([
    loadJSON('./data/weapons.json'),
    loadJSON('./data/attachments.json'),
    loadJSON('./data/weapon_attachment_map.json')
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
    const list = weaponMap.filter(m => m.WeaponKey === key && m.IsEquippable);
    const defaultList = list
      .filter(m => m.Default)
      .map(m => attByKey.get(m.AttachmentKey)?.NameJP || m.AttachmentKey);

    // update default UI
    if (window.updateDefaultAttachments) {
      window.updateDefaultAttachments(defaultList);
    }

    const catVal = cat.value.trim().toLowerCase();
    const q = kw.value.trim().toLowerCase();

    const rows = list
      .map(m => {
        const a = attByKey.get(m.AttachmentKey);
        return a ? { ...a, Cost: m.Cost, Default: m.Default } : null;
      })
      .filter(Boolean)
      .filter(a => {
        const okCat = !catVal || a.Category.toLowerCase() === catVal;
        const text = `${a.NameJP} ${a.AttachmentKey}`.toLowerCase();
        const okKw = !q || text.includes(q);
        return okCat && okKw;
      });

    tbody.innerHTML = '';
    rows.forEach(a => {
      const tr = document.createElement('tr');
      const cat = (a.Category || 'Other').replace(/\s+/g, '');
      tr.classList.add(`cat-${cat}`);
      tr.innerHTML = `
        <td>${a.NameJP || a.AttachmentKey}${a.Default ? ' ⭐' : ''}</td>
        <td>${a.Category || ''}</td>
        <td>${a.Cost === 0 ? '調査中' : a.Cost ?? ''}</td>
        <td>${a.AttachmentKey}</td>
      `;
      tbody.appendChild(tr);
    });

    meta.textContent = `装備可能: ${rows.length}件`;
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
