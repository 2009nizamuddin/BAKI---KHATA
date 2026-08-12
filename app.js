/* ==========================================================
   বাকির খাতা — App logic
   Data persists in the browser via localStorage.
   ========================================================== */

const STORAGE_KEY_SHOPS = 'bakikhata_shops';
const STORAGE_KEY_ENTRIES = 'bakikhata_entries';

let shops = [];
let entries = [];
let currentShopId = null;
let currentType = 'kinlam';

/* ---------- Storage helpers ---------- */
function loadData(){
  try{
    shops = JSON.parse(localStorage.getItem(STORAGE_KEY_SHOPS)) || [];
  }catch(e){ shops = []; }
  try{
    entries = JSON.parse(localStorage.getItem(STORAGE_KEY_ENTRIES)) || [];
  }catch(e){ entries = []; }
}
function saveShops(){
  localStorage.setItem(STORAGE_KEY_SHOPS, JSON.stringify(shops));
}
function saveEntries(){
  localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
}

/* ---------- Utilities ---------- */
function todayStr(){
  return new Date().toISOString().slice(0,10);
}
function fmt(n){
  return '৳' + Math.round(Number(n)).toLocaleString('en-IN');
}
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
function uid(prefix){
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
}
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> t.classList.remove('show'), 1900);
}

/* ---------- Derived data ---------- */
function shopBalance(shopId){
  return entries
    .filter(e => e.shopId === shopId)
    .reduce((sum, e) => sum + (e.type === 'kinlam' ? Number(e.amount) : -Number(e.amount)), 0);
}
function lastEntryLabel(shopId){
  const list = entries
    .filter(e => e.shopId === shopId)
    .sort((a,b) => b.date.localeCompare(a.date));
  if(!list.length) return 'কোনো এন্ট্রি নেই';
  const last = list[0];
  return (last.type === 'kinlam' ? 'শেষ নিয়েছেন: ' : 'শেষ দিয়েছেন: ') + last.date;
}

/* ---------- Rendering: Home ---------- */
function renderHome(){
  const totalDebt = shops.reduce((sum, s) => sum + Math.max(shopBalance(s.id), 0), 0);
  const totalEl = document.getElementById('totalDebt');
  totalEl.textContent = fmt(totalDebt);
  totalEl.classList.toggle('zero', totalDebt <= 0);

  document.getElementById('shopCountLabel').textContent = shops.length + ' দোকান';
  document.getElementById('entryCountLabel').textContent = entries.length + ' এন্ট্রি';

  const listEl = document.getElementById('shopList');
  listEl.innerHTML = '';

  if(shops.length === 0){
    document.getElementById('emptyState').classList.remove('hidden');
  }else{
    document.getElementById('emptyState').classList.add('hidden');
    shops
      .slice()
      .sort((a,b) => shopBalance(b.id) - shopBalance(a.id))
      .forEach(s => {
        const bal = shopBalance(s.id);
        const li = document.createElement('li');
        li.className = 'shop-card';
        li.tabIndex = 0;
        li.setAttribute('role','button');
        li.innerHTML = `
          <div class="shop-info">
            <div class="name">${escapeHtml(s.name)}</div>
            <div class="last">${lastEntryLabel(s.id)}</div>
          </div>
          <div class="shop-bal ${bal > 0 ? 'debt' : 'paid'}">
            ${fmt(Math.abs(bal))}
            ${bal < 0 ? '<span class="note">বেশি দেওয়া আছে</span>' : (bal===0 ? '<span class="note">পরিশোধ</span>' : '')}
          </div>
        `;
        li.addEventListener('click', () => openShop(s.id));
        li.addEventListener('keydown', (ev) => { if(ev.key==='Enter') openShop(s.id); });
        listEl.appendChild(li);
      });
  }
}

/* ---------- Rendering: Shop detail ---------- */
function renderShopDetail(){
  const shop = shops.find(s => s.id === currentShopId);
  if(!shop) { goHome(); return; }

  document.getElementById('shopTitle').textContent = shop.name;
  const list = entries.filter(e => e.shopId === currentShopId);
  document.getElementById('shopSub').textContent = list.length + ' টি এন্ট্রি';

  const bal = shopBalance(currentShopId);
  const balEl = document.getElementById('shopBalance');
  balEl.textContent = fmt(Math.abs(bal));
  balEl.classList.toggle('zero', bal <= 0);
  document.getElementById('shopBalLabel').textContent =
    bal < 0 ? 'বেশি দেওয়া আছে' : 'এই দোকানে বাকি';

  const sorted = list.slice().sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const listEl = document.getElementById('entryList');
  listEl.innerHTML = '';

  if(sorted.length === 0){
    document.getElementById('emptyEntry').classList.remove('hidden');
  }else{
    document.getElementById('emptyEntry').classList.add('hidden');
    sorted.forEach(e => {
      const li = document.createElement('li');
      li.className = 'entry-row';
      const label = e.item || (e.type === 'porishodh' ? 'পরিশোধ' : 'বাকি');
      li.innerHTML = `
        <div class="entry-left">
          <div class="item">${escapeHtml(label)}</div>
          <div class="date">${e.date}</div>
        </div>
        <div class="entry-right">
          <div class="entry-amt ${e.type === 'kinlam' ? 'debt' : 'paid'}">
            ${e.type === 'kinlam' ? '+' : '−'}${fmt(e.amount)}
          </div>
          <button class="del-x" data-id="${e.id}" aria-label="এন্ট্রি মুছুন">✕</button>
        </div>
      `;
      listEl.appendChild(li);
    });
    listEl.querySelectorAll('.del-x').forEach(btn => {
      btn.addEventListener('click', () => deleteEntry(btn.dataset.id));
    });
  }
}

/* ---------- Navigation ---------- */
function openShop(shopId){
  currentShopId = shopId;
  document.getElementById('homeView').classList.add('hidden');
  document.getElementById('shopView').classList.remove('hidden');
  renderShopDetail();
  window.scrollTo(0,0);
}
function goHome(){
  currentShopId = null;
  document.getElementById('shopView').classList.add('hidden');
  document.getElementById('homeView').classList.remove('hidden');
  renderHome();
  window.scrollTo(0,0);
}

/* ---------- Delete actions ---------- */
function deleteEntry(id){
  entries = entries.filter(e => e.id !== id);
  saveEntries();
  renderShopDetail();
  showToast('এন্ট্রি মুছে ফেলা হয়েছে');
}
function deleteCurrentShop(){
  const shop = shops.find(s => s.id === currentShopId);
  if(!shop) return;
  const ok = confirm(`"${shop.name}" দোকান ও এর সব এন্ট্রি মুছে ফেলতে চান?`);
  if(!ok) return;
  shops = shops.filter(s => s.id !== currentShopId);
  entries = entries.filter(e => e.shopId !== currentShopId);
  saveShops();
  saveEntries();
  showToast('দোকান মুছে ফেলা হয়েছে');
  goHome();
}

/* ---------- Sheets (add shop / add entry) ---------- */
function openSheet(id){
  document.getElementById(id).classList.add('show');
}
function closeSheet(id){
  document.getElementById(id).classList.remove('show');
}
function openAddSheet(){
  if(currentShopId){
    document.getElementById('entryForm').reset();
    document.getElementById('entryDate').value = todayStr();
    setType('kinlam');
    openSheet('entryOverlay');
    setTimeout(()=> document.getElementById('entryItem').focus(), 200);
  }else{
    document.getElementById('shopForm').reset();
    openSheet('shopOverlay');
    setTimeout(()=> document.getElementById('newShopName').focus(), 200);
  }
}
function setType(t){
  currentType = t;
  document.getElementById('typeDebtBtn').classList.toggle('active', t === 'kinlam');
  document.getElementById('typePaidBtn').classList.toggle('active', t === 'porishodh');
  document.getElementById('itemLabel').textContent = t === 'kinlam' ? 'কী নিলেন' : 'বিবরণ (ঐচ্ছিক)';
  document.getElementById('entryItem').placeholder = t === 'kinlam' ? 'যেমন: চাল, ডাল, তেল' : 'যেমন: নগদ পরিশোধ';
}

/* ---------- Form submissions ---------- */
function handleShopSubmit(ev){
  ev.preventDefault();
  const name = document.getElementById('newShopName').value.trim();
  if(!name){ showToast('দোকানের নাম লিখুন'); return; }
  shops.push({ id: uid('shop'), name, createdAt: todayStr() });
  saveShops();
  closeSheet('shopOverlay');
  renderHome();
  showToast('দোকান যোগ হয়েছে');
}
function handleEntrySubmit(ev){
  ev.preventDefault();
  const amount = parseFloat(document.getElementById('entryAmount').value);
  const date = document.getElementById('entryDate').value || todayStr();
  const item = document.getElementById('entryItem').value.trim();
  if(!amount || amount <= 0){ showToast('সঠিক টাকার পরিমাণ লিখুন'); return; }
  entries.push({ id: uid('e'), shopId: currentShopId, date, item, amount, type: currentType });
  saveEntries();
  closeSheet('entryOverlay');
  renderShopDetail();
  renderHome();
  showToast('এন্ট্রি যোগ হয়েছে');
}

/* ---------- Backup export ---------- */
function exportBackup(){
  const data = { shops, entries, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'baki-khata-backup-' + todayStr() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('ব্যাকআপ ডাউনলোড হয়েছে');
}

/* ---------- Event wiring ---------- */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  renderHome();

  document.getElementById('fabBtn').addEventListener('click', openAddSheet);
  document.getElementById('backBtn').addEventListener('click', goHome);
  document.getElementById('deleteShopBtn').addEventListener('click', deleteCurrentShop);
  document.getElementById('exportBtn').addEventListener('click', exportBackup);

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeSheet(btn.dataset.close));
  });
  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', (ev) => { if(ev.target === ov) ov.classList.remove('show'); });
  });

  document.getElementById('shopForm').addEventListener('submit', handleShopSubmit);
  document.getElementById('entryForm').addEventListener('submit', handleEntrySubmit);

  document.getElementById('typeDebtBtn').addEventListener('click', () => setType('kinlam'));
  document.getElementById('typePaidBtn').addEventListener('click', () => setType('porishodh'));

  document.addEventListener('keydown', (ev) => {
    if(ev.key === 'Escape'){
      document.querySelectorAll('.overlay.show').forEach(ov => ov.classList.remove('show'));
    }
  });
});
