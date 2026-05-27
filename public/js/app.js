/* ═══════════════════════════════════════
   Ailo Notulen — App
═══════════════════════════════════════ */

const API = '';

let currentUser = null;
let token = localStorage.getItem('ailo_token') || null;
let sidebarOpen = true;
let resetTokenUrl = null;

// State: notulen form
let st = {
  currentId: null,
  agenda: [],
  actionItems: [],
  penerima: [],
  allNotulen: [],
  allContacts: [],
  allUsers: []
};

/* ─────────────────────────────────────
   BOOT
───────────────────────────────────── */
window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  resetTokenUrl = params.get('token');

  if (resetTokenUrl) {
    showScreen('screenReset');
    return;
  }
  if (token) {
    const ok = await fetchMe();
    if (ok) { bootApp(); return; }
  }
  showScreen('screenLogin');
});

async function fetchMe() {
  try {
    const r = await api('GET', '/api/auth/me');
    if (r.ok) { currentUser = r.user; return true; }
  } catch {}
  token = null; localStorage.removeItem('ailo_token');
  return false;
}

function bootApp() {
  document.getElementById('authWrap').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  renderUserInfo();
  renderNav();
  setToday();
  loadRiwayat();
  loadContacts();
  showPage('buat');
  handleResize();
  window.addEventListener('resize', handleResize);
}

/* ─────────────────────────────────────
   AUTH SCREENS
───────────────────────────────────── */
function showScreen(id) {
  document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function togglePw(inputId, eye) {
  const inp = document.getElementById(inputId);
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  eye.className = (isText ? 'ti ti-eye' : 'ti ti-eye-off') + ' inp-eye';
}

/* LOGIN */
async function doLogin() {
  const email = v('loginEmail'), pw = v('loginPw');
  setAuthErr('loginErr', '');
  if (!email || !pw) { setAuthErr('loginErr', 'Email dan password wajib diisi'); return; }
  setBtnLoad('loginBtn', true, 'Masuk...');
  try {
    const r = await api('POST', '/api/auth/login', { email, password: pw });
    if (!r.ok) { setAuthErr('loginErr', r.message); return; }
    token = r.token; localStorage.setItem('ailo_token', token);
    currentUser = r.user;
    bootApp();
  } catch (e) { setAuthErr('loginErr', 'Gagal terhubung ke server'); }
  finally { setBtnLoad('loginBtn', false, '<i class="ti ti-login"></i> Masuk'); }
}

/* REGISTER */
async function doRegister() {
  const nama = v('regNama'), email = v('regEmail'), pw = v('regPw'), pw2 = v('regPw2');
  setAuthErr('registerErr', ''); setAuthErr('registerOk', '', true);
  if (!nama || !email || !pw) { setAuthErr('registerErr', 'Semua field wajib diisi'); return; }
  if (pw.length < 6) { setAuthErr('registerErr', 'Password minimal 6 karakter'); return; }
  if (pw !== pw2) { setAuthErr('registerErr', 'Konfirmasi password tidak cocok'); return; }
  setBtnLoad('registerBtn', true, 'Mendaftar...');
  try {
    const r = await api('POST', '/api/auth/register', { nama, email, password: pw });
    if (!r.ok) { setAuthErr('registerErr', r.message); return; }
    setAuthErr('registerOk', r.message, true);
    document.getElementById('regNama').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPw').value = '';
    document.getElementById('regPw2').value = '';
    setTimeout(() => showScreen('screenLogin'), 2500);
  } catch { setAuthErr('registerErr', 'Gagal terhubung ke server'); }
  finally { setBtnLoad('registerBtn', false, '<i class="ti ti-user-plus"></i> Daftar'); }
}

/* FORGOT PASSWORD */
async function doForgot() {
  const email = v('forgotEmail');
  setAuthErr('forgotErr', ''); setAuthErr('forgotOk', '', true);
  if (!email) { setAuthErr('forgotErr', 'Email wajib diisi'); return; }
  setBtnLoad('forgotBtn', true, 'Mengirim...');
  try {
    const r = await api('POST', '/api/auth/forgot-password', { email });
    if (!r.ok) { setAuthErr('forgotErr', r.message); return; }
    setAuthErr('forgotOk', r.message, true);
    document.getElementById('forgotEmail').value = '';
  } catch { setAuthErr('forgotErr', 'Gagal terhubung ke server'); }
  finally { setBtnLoad('forgotBtn', false, '<i class="ti ti-send"></i> Kirim Link Reset'); }
}

/* RESET PASSWORD */
async function doResetPw() {
  const pw = v('resetPw'), pw2 = v('resetPw2');
  setAuthErr('resetErr', ''); setAuthErr('resetOk', '', true);
  if (!pw) { setAuthErr('resetErr', 'Password baru wajib diisi'); return; }
  if (pw.length < 6) { setAuthErr('resetErr', 'Password minimal 6 karakter'); return; }
  if (pw !== pw2) { setAuthErr('resetErr', 'Konfirmasi password tidak cocok'); return; }
  setBtnLoad('resetBtn', true, 'Menyimpan...');
  try {
    const r = await api('POST', '/api/auth/reset-password', { token: resetTokenUrl, password: pw });
    if (!r.ok) { setAuthErr('resetErr', r.message); return; }
    setAuthErr('resetOk', r.message + ' Halaman akan dialihkan...', true);
    setTimeout(() => {
      history.replaceState({}, '', '/');
      showScreen('screenLogin');
    }, 2500);
  } catch { setAuthErr('resetErr', 'Gagal terhubung ke server'); }
  finally { setBtnLoad('resetBtn', false, '<i class="ti ti-check"></i> Simpan Password Baru'); }
}

/* LOGOUT */
function confirmLogout() {
  showDialog({
    type: 'logout',
    icon: 'ti-logout',
    title: 'Keluar dari Akun?',
    message: 'Sesi Anda akan diakhiri dan Anda perlu login kembali untuk mengakses aplikasi.',
    actions: [
      { label: 'Batal', cls: 'dialog-btn-ghost' },
      { label: 'Ya, Keluar', cls: 'dialog-btn-danger', icon: 'ti-logout', onClick: doLogout }
    ]
  });
}

function doLogout() {
  token = null; currentUser = null;
  localStorage.removeItem('ailo_token');
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('authWrap').style.display = 'flex';
  // Reset form state
  Object.assign(st, { currentId:null, agenda:[], actionItems:[], penerima:[], allNotulen:[], allContacts:[], allUsers:[] });
  showScreen('screenLogin');
  closeDialog();
}

/* ─────────────────────────────────────
   NAV & PAGES
───────────────────────────────────── */
function renderNav() {
  const role = currentUser?.role;
  const nav = document.getElementById('sidebarNav');
  const items = [
    { page:'buat',     icon:'ti-file-text',  label:'Buat Notulen' },
    { page:'riwayat',  icon:'ti-history',    label:'Riwayat', badge:true },
    { page:'kontak',   icon:'ti-users',      label:'Kontak' },
  ];
  if (role === 'admin') items.push({ page:'pengguna', icon:'ti-shield-person', label:'Kelola Pengguna' });
  items.push({ page:'profil', icon:'ti-user-circle', label:'My Profile' });

  nav.innerHTML = '<div class="nav-label">Menu utama</div>' +
    items.map(it => `<div class="nav-item" data-page="${it.page}">
      <i class="ti ${it.icon}"></i> ${it.label}
      ${it.badge ? `<span class="nav-badge" id="badgeRiwayat">${st.allNotulen.length}</span>` : ''}
    </div>`).join('');

  nav.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => {
      showPage(el.dataset.page);
      if (window.innerWidth <= 680) closeMobileSidebar();
    });
  });
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('page' + cap(page));
  if (el) el.classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');

  const actions = document.getElementById('topbarActions');
  if (page === 'buat') {
    const canEdit = currentUser?.role !== 'executive';
    actions.innerHTML = canEdit
      ? `<button class="tbtn tbtn-ghost" onclick="resetForm()"><i class="ti ti-refresh"></i><span class="btn-text"> Baru</span></button>
         <button class="tbtn" onclick="simpanNotulen()"><i class="ti ti-device-floppy"></i><span class="btn-text"> Simpan</span></button>`
      : '';
    applyReadonlyMode(currentUser?.role === 'executive');
    document.getElementById('wizardBar').style.display = '';
  } else if (page === 'detail') {
    actions.innerHTML = '';
    document.getElementById('wizardBar').style.display = 'none';
  } else if (page === 'riwayat') {
    actions.innerHTML = `<button class="tbtn tbtn-primary" onclick="showPage('buat')"><i class="ti ti-plus"></i><span class="btn-text"> Buat Baru</span></button>`;
    document.getElementById('wizardBar').style.display = 'none';
    loadRiwayat();
  } else if (page === 'kontak') {
    actions.innerHTML = `<button class="tbtn tbtn-primary" onclick="openContactModal()"><i class="ti ti-user-plus"></i><span class="btn-text"> Tambah</span></button>`;
    document.getElementById('wizardBar').style.display = 'none';
    loadContacts();
  } else if (page === 'pengguna') {
    actions.innerHTML = `<button class="tbtn tbtn-primary" onclick="openUserModal()"><i class="ti ti-user-plus"></i><span class="btn-text"> Tambah</span></button>`;
    document.getElementById('wizardBar').style.display = 'none';
    loadUsers();
  } else if (page === 'profil') {
    actions.innerHTML = '';
    document.getElementById('wizardBar').style.display = 'none';
    loadProfilePage();
  } else {
    actions.innerHTML = '';
    document.getElementById('wizardBar').style.display = 'none';
  }
  updateTopbarMeta();
}

function applyReadonlyMode(readonly) {
  document.getElementById('readonlyBanner').style.display = readonly ? 'flex' : 'none';
  const inputs = document.querySelectorAll('#pageBuat .finput, #pageBuat .ftextarea, #pageBuat .fselect, #pageBuat .agenda-input');
  inputs.forEach(el => { el.disabled = readonly; el.style.opacity = readonly ? '.7' : ''; });
  ['addAgendaBtn','addActionBtn','addRecipientBtn','sendSection'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = readonly ? 'none' : '';
  });
}

/* ─────────────────────────────────────
   USER INFO
───────────────────────────────────── */
function renderUserInfo() {
  const u = currentUser;
  if (!u) return;
  const initials = u.nama.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('userAv').textContent = initials;
  document.getElementById('userDisplayName').textContent = u.nama;
  const badge = document.getElementById('userRoleBadge');
  badge.textContent = roleLabel(u.role);
  badge.className = 'user-role-badge role-' + u.role;
}

function roleLabel(r) { return { admin:'Admin', executive:'Executive', user:'User' }[r] || r; }

/* ─────────────────────────────────────
   TOPBAR META
───────────────────────────────────── */
function setToday() {
  document.getElementById('fTanggal').value = new Date().toISOString().split('T')[0];
}

function updateTopbarMeta() {
  const d = document.getElementById('fTanggal')?.value;
  if (!d) return;
  const fmt = new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  document.getElementById('topbarMeta').textContent = fmt + ' · ' + (st.currentId ? 'Tersimpan' : 'Draft baru');
}

/* ─────────────────────────────────────
   SIDEBAR
───────────────────────────────────── */
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  document.getElementById('sidebar').classList.toggle('hidden', !sidebarOpen);
  document.getElementById('toggleIcon').className = sidebarOpen ? 'ti ti-layout-sidebar' : 'ti ti-layout-sidebar-right';
  if (window.innerWidth <= 680) {
    document.getElementById('sidebarOverlay').classList.toggle('show', sidebarOpen);
  }
}
function closeMobileSidebar() {
  document.getElementById('sidebar').classList.add('hidden');
  document.getElementById('sidebarOverlay').classList.remove('show');
  sidebarOpen = false;
}
function toggleMobilePanel() {
  const panel = document.getElementById('rightPanel');
  const overlay = document.getElementById('panelOverlay');
  if (window.innerWidth > 680) { kirimNotulen(); return; }
  const isOpen = panel.classList.contains('mobile-open');
  panel.classList.toggle('mobile-open', !isOpen);
  overlay.classList.toggle('show', !isOpen);
}
function closeMobilePanel() {
  document.getElementById('rightPanel').classList.remove('mobile-open');
  document.getElementById('panelOverlay').classList.remove('show');
}
function handleResize() {
  if (window.innerWidth > 680) closeMobilePanel();
  if (window.innerWidth <= 680 && sidebarOpen) closeMobileSidebar();
}

/* ─────────────────────────────────────
   AGENDA
───────────────────────────────────── */
function renderAgenda() {
  const list = document.getElementById('agendaList');
  list.innerHTML = '';
  st.agenda.forEach((txt, i) => {
    const row = document.createElement('div');
    row.className = 'agenda-row';
    row.innerHTML = `<div class="agenda-num">${i+1}</div>
      <input class="agenda-input" value="${esc(txt)}" placeholder="Agenda ${i+1}..." oninput="st.agenda[${i}]=this.value"/>
      <i class="ti ti-x agenda-del" onclick="removeAgenda(${i})"></i>`;
    list.appendChild(row);
  });
}
function addAgenda() { st.agenda.push(''); renderAgenda(); document.querySelectorAll('.agenda-input')[st.agenda.length-1]?.focus(); }
function removeAgenda(i) { st.agenda.splice(i,1); renderAgenda(); }

/* ─────────────────────────────────────
   ACTION ITEMS
───────────────────────────────────── */
function renderActions() {
  const tbody = document.getElementById('actionBody');
  tbody.innerHTML = '';
  st.actionItems.forEach((item, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="finput" value="${esc(item.tugas)}" placeholder="Tugas..." oninput="st.actionItems[${i}].tugas=this.value"/></td>
      <td><input class="finput" value="${esc(item.pic)}" placeholder="PIC" style="width:100px;" oninput="st.actionItems[${i}].pic=this.value"/></td>
      <td><input class="finput" type="date" value="${item.tenggat||''}" oninput="st.actionItems[${i}].tenggat=this.value"/></td>
      <td><select class="fselect" onchange="st.actionItems[${i}].status=this.value">
        <option value="open" ${item.status==='open'?'selected':''}>Buka</option>
        <option value="done" ${item.status==='done'?'selected':''}>Selesai</option>
      </select></td>
      <td><button class="del-btn" onclick="removeAction(${i})"><i class="ti ti-x"></i></button></td>`;
    tbody.appendChild(tr);
  });
  const done = st.actionItems.filter(a=>a.status==='done').length;
  document.getElementById('actionMeta').textContent = `${st.actionItems.length} item${done?' · '+done+' selesai':''}`;
}
function addAction() { st.actionItems.push({ tugas:'', pic:'', tenggat:'', status:'open' }); renderActions(); }
function removeAction(i) { st.actionItems.splice(i,1); renderActions(); }

/* ─────────────────────────────────────
   RECIPIENTS
───────────────────────────────────── */
function renderRecipients() {
  const list = document.getElementById('recipientList');
  list.innerHTML = '';
  st.penerima.forEach((r, i) => {
    const ini = r.nama.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const div = document.createElement('div');
    div.className = 'ritem';
    div.innerHTML = `<div class="rav">${ini}</div>
      <div class="rinfo"><div class="rname">${esc(r.nama)}</div><div class="remail">${esc(r.email)}</div></div>
      <i class="ti ti-x rremove" onclick="removeRecipient(${i})"></i>`;
    list.appendChild(div);
  });
  const n = st.penerima.length;
  document.getElementById('rcount').textContent = n;
  document.getElementById('sendBtnText').textContent = `Kirim ke ${n} penerima`;
  document.getElementById('epTo').textContent = `Kepada: ${n} penerima`;
  updateEmailPreview();
}
function removeRecipient(i) { st.penerima.splice(i,1); renderRecipients(); }
function updateEmailPreview() {
  const judul = document.getElementById('fJudul')?.value || '—';
  const pemimpin = document.getElementById('fPemimpin')?.value || '—';
  document.getElementById('epSubject').textContent = `📋 Notulen — ${judul}`;
  document.getElementById('epPengirim').textContent = pemimpin;
}

/* ─────────────────────────────────────
   ADD RECIPIENT MODAL
───────────────────────────────────── */
function openAddRecipient() {
  document.getElementById('searchContactModal').value = '';
  document.getElementById('newRcpNama').value = '';
  document.getElementById('newRcpEmail').value = '';
  renderContactResults(st.allContacts);
  openModal('modalRecipient');
}
function searchContactsModal() {
  const q = document.getElementById('searchContactModal').value.toLowerCase();
  renderContactResults(st.allContacts.filter(c => c.nama.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)));
}
function renderContactResults(contacts) {
  const el = document.getElementById('contactResults');
  if (!contacts.length) { el.innerHTML = '<div style="text-align:center;padding:14px;font-size:12px;color:var(--text-3);">Tidak ada kontak</div>'; return; }
  el.innerHTML = contacts.map(c => {
    const ini = c.nama.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const added = st.penerima.some(r=>r.email===c.email);
    return `<div class="contact-result-item" style="opacity:${added?.5:1}" onclick="${added?'':`addPenerimaFromContact('${c._id}')`}">
      <div class="contact-result-av">${ini}</div>
      <div style="flex:1;min-width:0;"><div class="rname">${esc(c.nama)}</div><div class="remail">${esc(c.email)}</div></div>
      <i class="ti ${added?'ti-check':'ti-plus'}" style="color:${added?'var(--teal-500)':'var(--text-3)'};font-size:14px;"></i>
    </div>`;
  }).join('');
}
function addPenerimaFromContact(id) {
  const c = st.allContacts.find(x=>x._id===id);
  if (!c) return;
  addPenerima(c.nama, c.email);
  closeModal('modalRecipient');
}
function addRecipientManual() {
  const nama = v('newRcpNama'), email = v('newRcpEmail');
  if (!nama || !email) { showToast('Nama dan email wajib diisi','error'); return; }
  if (!isEmail(email)) { showToast('Format email tidak valid','error'); return; }
  addPenerima(nama, email);
  closeModal('modalRecipient');
}
function addPenerima(nama, email) {
  if (st.penerima.some(r=>r.email===email)) { showToast('Email sudah ada di daftar','error'); return; }
  st.penerima.push({ nama, email });
  renderRecipients();
}

/* ─────────────────────────────────────
   SAVE NOTULEN
───────────────────────────────────── */
async function simpanNotulen() {
  const judul = v('fJudul'), tanggal = v('fTanggal');
  if (!judul) { showToast('Judul rapat wajib diisi','error'); document.getElementById('fJudul').focus(); return; }
  if (!tanggal) { showToast('Tanggal wajib diisi','error'); return; }
  const payload = {
    judul, tanggal,
    waktuMulai: v('fWaktuMulai'), waktuSelesai: v('fWaktuSelesai'),
    lokasi: v('fLokasi'), pemimpinRapat: v('fPemimpin'),
    notulis: v('fNotulis'), divisi: v('fDivisi'),
    peserta: v('fPeserta'),
    agenda: st.agenda.filter(a=>a.trim()),
    keputusan: v('fKeputusan'), catatan: v('fCatatan'),
    actionItems: st.actionItems, penerima: st.penerima
  };
  try {
    const r = st.currentId
      ? await api('PUT', `/api/notulen/${st.currentId}`, payload)
      : await api('POST', '/api/notulen', payload);
    if (!r.ok) throw new Error(r.message);
    st.currentId = r.data._id;
    showToast('Notulen berhasil disimpan');
    updateTopbarMeta();
    loadRiwayat();
  } catch (e) { showToast('Gagal menyimpan: '+e.message,'error'); }
}

/* ─────────────────────────────────────
   SEND NOTULEN
───────────────────────────────────── */
async function kirimNotulen() {
  if (st.penerima.length === 0) { showToast('Tambahkan penerima terlebih dahulu','error'); return; }
  await simpanNotulen();
  if (!st.currentId) return;

  const btn = document.getElementById('sendBtn');
  btn.disabled = true;
  document.getElementById('sendBtnText').textContent = 'Mengirim...';
  try {
    const r = await api('POST', `/api/notulen/${st.currentId}/send`, { ccPemimpin: document.getElementById('chkCc').checked });
    if (!r.ok) throw new Error(r.message);
    showDialog({ type:'success', icon:'ti-circle-check', title:'Berhasil Dikirim!', message: r.message || `Notulen berhasil dikirim ke ${st.penerima.length} penerima.`,
      actions:[{ label:'Oke', cls:'dialog-btn-primary', icon:'ti-check', onClick:closeDialog }] });
    loadRiwayat();
  } catch (e) {
    showDialog({ type:'error', icon:'ti-circle-x', title:'Pengiriman Gagal', message: e.message,
      actions:[{ label:'Tutup', cls:'dialog-btn-ghost', onClick:closeDialog }] });
  } finally {
    btn.disabled = false;
    renderRecipients();
  }
}

/* ─────────────────────────────────────
   RIWAYAT
───────────────────────────────────── */
async function loadRiwayat() {
  try {
    const r = await api('GET', '/api/notulen');
    st.allNotulen = r.data || [];
    const badge = document.getElementById('badgeRiwayat');
    if (badge) badge.textContent = st.allNotulen.length;
    renderRiwayat(st.allNotulen);
  } catch {}
}
function renderRiwayat(list) {
  const el = document.getElementById('riwayatList');
  if (!list.length) { el.innerHTML = `<div class="empty-state"><i class="ti ti-file-text"></i><p>Belum ada notulen tersimpan</p></div>`; return; }
  const canEdit = currentUser?.role !== 'executive';
  el.innerHTML = list.map(n => {
    const tgl = new Date(n.tanggal).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
    const badge = n.status==='sent'
      ? '<span class="status-badge badge-sent"><i class="ti ti-circle-check"></i> Terkirim</span>'
      : '<span class="status-badge badge-draft"><i class="ti ti-file"></i> Draft</span>';
    const author = n.createdBy?.nama ? `<span><i class="ti ti-user" style="font-size:11px;"></i> ${esc(n.createdBy.nama)}</span>` : '';
    return `<div class="riwayat-card" onclick="openDetail('${n._id}')">
      <div class="riwayat-card-title">${esc(n.judul)}</div>
      <div class="riwayat-card-meta">
        <span><i class="ti ti-calendar" style="font-size:12px;"></i> ${tgl}</span>
        <span><i class="ti ti-users" style="font-size:12px;"></i> ${n.penerima?.length||0} penerima</span>
        ${author}
      </div>
      <div class="riwayat-card-footer">
        ${badge}
        <div class="riwayat-card-actions" onclick="event.stopPropagation()">
          ${canEdit ? `<div class="icon-btn" title="Edit" onclick="editNotulen('${n._id}')"><i class="ti ti-pencil" style="font-size:14px;"></i></div>` : ''}
          ${canEdit ? `<div class="icon-btn danger" title="Hapus" onclick="confirmDeleteNotulen('${n._id}','${esc(n.judul)}')"><i class="ti ti-trash" style="font-size:14px;"></i></div>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}
function filterRiwayat() {
  const q = document.getElementById('searchRiwayat').value.toLowerCase();
  renderRiwayat(st.allNotulen.filter(n=>n.judul.toLowerCase().includes(q)));
}

/* ─────────────────────────────────────
   DETAIL VIEW (read-only)
───────────────────────────────────── */
async function openDetail(id) {
  try {
    const r = await api('GET', `/api/notulen/${id}`);
    if (!r.ok) throw new Error(r.message);
    renderDetail(r.data);
    showPage('detail');
  } catch (e) { showToast('Gagal membuka: '+e.message,'error'); }
}

function renderDetail(n) {
  const canEdit = currentUser?.role !== 'executive';
  const isSent = n.status === 'sent';
  const fmtDate = (d, opts) => new Date(d).toLocaleDateString('id-ID', opts);
  const fmtDt  = d => new Date(d).toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const scMap  = { done:['#3B6D11','#EAF3DE','Selesai'], open:['#854F0B','#FAEEDA','Terbuka'] };

  /* ── INFO TABLE ── */
  const infoRows = [
    n.tanggal      ? ['Tanggal',  fmtDate(n.tanggal,{weekday:'long',year:'numeric',month:'long',day:'numeric'})] : null,
    n.waktuMulai   ? ['Waktu',    [n.waktuMulai, n.waktuSelesai].filter(Boolean).join(' – ') + ' WIB'] : null,
    n.lokasi       ? ['Lokasi',   esc(n.lokasi)]       : null,
    n.pemimpinRapat? ['Pemimpin', esc(n.pemimpinRapat)]: null,
    n.notulis      ? ['Notulis',  esc(n.notulis)]      : null,
    n.divisi       ? ['Divisi',   esc(n.divisi)]       : null,
  ].filter(Boolean).map(([k,v])=>
    `<tr><td class="dinf-k">${k}</td><td class="dinf-v">${v}</td></tr>`
  ).join('');

  /* ── PESERTA ── */
  const pesertaHtml = (n.peserta||'').trim()
    ? `<div class="dsec"><p class="dsec-h"><i class="ti ti-users"></i>Peserta Rapat</p>
        <div class="dchips">${n.peserta.split(',').filter(p=>p.trim()).map(p=>`<span class="dchip">${esc(p.trim())}</span>`).join('')}</div></div>` : '';

  /* ── AGENDA ── */
  const agendaItems = (n.agenda||[]).filter(a=>a.trim());
  const agendaHtml = agendaItems.length
    ? `<div class="dsec"><p class="dsec-h"><i class="ti ti-list-check"></i>Agenda Pembahasan</p>
        <div class="dagenda-list">${agendaItems.map((a,i)=>`<div class="dagenda-row"><span class="dagenda-n">${i+1}</span><span>${esc(a)}</span></div>`).join('')}</div></div>` : '';

  /* ── KEPUTUSAN + CATATAN ── */
  const keputusanHtml = (n.keputusan||'').trim()
    ? `<div class="dsec"><p class="dsec-h"><i class="ti ti-bulb"></i>Keputusan yang Disepakati</p>
        <div class="dblock">${esc(n.keputusan).replace(/\n/g,'<br>')}</div></div>` : '';
  const catatanHtml = (n.catatan||'').trim()
    ? `<div class="dsec"><p class="dsec-h"><i class="ti ti-notes"></i>Catatan Tambahan</p>
        <div class="dblock dblock-muted">${esc(n.catatan).replace(/\n/g,'<br>')}</div></div>` : '';

  const bodySections = [pesertaHtml, agendaHtml, keputusanHtml, catatanHtml].filter(Boolean).join('<hr class="dsep">');

  /* ── TINDAK LANJUT ── */
  const actionHtml = (n.actionItems||[]).length ? (() => {
    const rows = n.actionItems.map(a => {
      const d = a.tenggat ? fmtDate(a.tenggat,{day:'numeric',month:'short',year:'numeric'}) : '—';
      const [sc,sb,sl] = scMap[a.status]||scMap.open;
      return `<tr><td>${esc(a.tugas)}</td><td class="dtd-pic">${esc(a.pic)}</td><td>${d}</td>
        <td><span class="dbadge" style="background:${sb};color:${sc}">${sl}</span></td></tr>`;
    }).join('');
    return `<div class="dcard"><div class="dcard-h"><i class="ti ti-checkbox"></i>Tindak Lanjut<span class="dcard-ct">${n.actionItems.length} item</span></div>
      <div class="dtable-wrap"><table class="dtable">
        <thead><tr><th>Tugas</th><th>PIC</th><th>Tenggat</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div></div>`;
  })() : '';

  /* ── PENERIMA ── */
  const penerimaHtml = (n.penerima||[]).length ? (() => {
    const items = n.penerima.map(p=>
      `<div class="drecip"><div class="drecip-av">${esc(p.nama).charAt(0).toUpperCase()}</div>
        <div><div class="drecip-name">${esc(p.nama)}</div><div class="drecip-email">${esc(p.email)}</div></div></div>`
    ).join('');
    return `<div class="dcard"><div class="dcard-h"><i class="ti ti-send"></i>Penerima Email<span class="dcard-ct">${n.penerima.length} orang</span></div>
      <div class="drecip-list">${items}</div></div>`;
  })() : '';

  /* ── LOG ── */
  const logHtml = (n.log||[]).length ? (() => {
    const rows = [...n.log].reverse().map(l =>
      `<div class="dlog-row"><div class="dlog-dot"></div><div>
        <div class="dlog-aksi">${esc(l.aksi)}</div>
        <div class="dlog-meta">${esc(l.oleh?.nama||'—')} · ${fmtDt(l.waktu)}</div>
      </div></div>`
    ).join('');
    return `<div class="dcard"><div class="dcard-h"><i class="ti ti-history"></i>Log Aktivitas</div>
      <div class="dlog-wrap">${rows}</div></div>`;
  })() : '';

  /* ── RENDER ── */
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-topbar">
      <button class="tbtn" onclick="showPage('riwayat')"><i class="ti ti-arrow-left"></i><span class="btn-text"> Riwayat</span></button>
      <div style="display:flex;gap:8px">
        ${canEdit ? `<button class="tbtn" onclick="editNotulen('${n._id}')"><i class="ti ti-pencil"></i><span class="btn-text"> Edit</span></button>` : ''}
        ${canEdit && !isSent ? `<button class="tbtn tbtn-primary" onclick="openDetailSend('${n._id}')"><i class="ti ti-send"></i><span class="btn-text"> Kirim</span></button>` : ''}
        ${canEdit ? `<button class="tbtn tbtn-danger" title="Hapus" onclick="confirmDeleteNotulen('${n._id}','${esc(n.judul)}')"><i class="ti ti-trash"></i></button>` : ''}
      </div>
    </div>

    <div class="dcard dmain-card">
      <div class="dmain-top">
        ${isSent ? '<span class="dstatus-sent"><i class="ti ti-circle-check"></i> Terkirim</span>' : '<span class="dstatus-draft"><i class="ti ti-file"></i> Draft</span>'}
        ${n.sentAt ? `<span class="dstatus-time">Dikirim ${fmtDt(n.sentAt)}</span>` : ''}
      </div>
      <h1 class="dmain-title">${esc(n.judul)}</h1>
      <table class="dinf-table"><tbody>${infoRows}</tbody></table>
      ${bodySections ? `<hr class="dsep">${bodySections}` : ''}
    </div>

    ${actionHtml}
    ${penerimaHtml}
    ${logHtml}
  `;
}

async function openDetailSend(id) {
  try {
    const r = await api('POST', `/api/notulen/${id}/send`, { ccPemimpin: false });
    if (!r.ok) throw new Error(r.message);
    showDialog({ type:'success', icon:'ti-circle-check', title:'Berhasil Dikirim!', message: r.message,
      actions:[{ label:'Oke', cls:'dialog-btn-primary', icon:'ti-check', onClick:() => { closeDialog(); openDetail(id); } }] });
    loadRiwayat();
  } catch(e) {
    showDialog({ type:'error', icon:'ti-circle-x', title:'Pengiriman Gagal', message: e.message,
      actions:[{ label:'Tutup', cls:'dialog-btn-ghost', onClick:closeDialog }] });
  }
}

async function editNotulen(id) {
  try {
    const r = await api('GET', `/api/notulen/${id}`);
    if (!r.ok) throw new Error(r.message);
    const n = r.data;
    st.currentId = n._id;
    sv('fJudul', n.judul||''); sv('fTanggal', n.tanggal ? n.tanggal.split('T')[0] : '');
    sv('fWaktuMulai', n.waktuMulai||''); sv('fWaktuSelesai', n.waktuSelesai||'');
    sv('fLokasi', n.lokasi||''); sv('fPemimpin', n.pemimpinRapat||'');
    sv('fNotulis', n.notulis||''); sv('fDivisi', n.divisi||'');
    sv('fPeserta', n.peserta||''); sv('fKeputusan', n.keputusan||''); sv('fCatatan', n.catatan||'');
    st.agenda = n.agenda || [];
    st.actionItems = (n.actionItems||[]).map(a => ({ ...a, tenggat: a.tenggat ? a.tenggat.split('T')[0] : '' }));
    st.penerima = n.penerima || [];
    renderAgenda(); renderActions(); renderRecipients(); updateEmailPreview(); updateTopbarMeta();
    showPage('buat'); wizardGoTo(1);
  } catch (e) { showToast('Gagal memuat: '+e.message,'error'); }
}

function loadNotulen(id) { openDetail(id); }
function confirmDeleteNotulen(id, judul) {
  showDialog({ type:'warning', icon:'ti-trash', title:'Hapus Notulen?',
    message: `Notulen <strong>"${esc(judul)}"</strong> akan dihapus permanen dan tidak dapat dipulihkan.`,
    actions:[
      { label:'Batal', cls:'dialog-btn-ghost' },
      { label:'Hapus', cls:'dialog-btn-danger', icon:'ti-trash', onClick: () => deleteNotulen(id) }
    ]
  });
}
async function deleteNotulen(id) {
  closeDialog();
  try {
    await api('DELETE', `/api/notulen/${id}`);
    if (st.currentId === id) resetForm();
    showPage('riwayat');
    showToast('Notulen dihapus');
  } catch { showToast('Gagal menghapus','error'); }
}
function resetForm() {
  st.currentId = null; st.agenda = []; st.actionItems = []; st.penerima = [];
  ['fJudul','fLokasi','fPemimpin','fNotulis','fDivisi','fPeserta','fKeputusan','fCatatan','fWaktuMulai','fWaktuSelesai'].forEach(id => sv(id,''));
  setToday(); renderAgenda(); renderActions(); renderRecipients(); updateEmailPreview(); updateTopbarMeta();
  wizardGoTo(1);
}

/* ─────────────────────────────────────
   WIZARD NAVIGATION
───────────────────────────────────── */
let _wizardStep = 1;
function wizardGoTo(step) {
  _wizardStep = step;
  for (let i = 1; i <= 3; i++) {
    const panel = document.getElementById('wpanel' + i);
    const dot   = document.getElementById('wstep' + i);
    const line  = document.getElementById('wline' + i);
    if (panel) panel.style.display = i === step ? '' : 'none';
    if (dot) {
      dot.classList.toggle('active', i === step);
      dot.classList.toggle('done',   i < step);
    }
    if (line) line.classList.toggle('done', i < step);
  }
  document.getElementById('formScroll')?.scrollTo({ top: 0, behavior: 'smooth' });
}
function wizardNext() {
  if (_wizardStep === 1) {
    if (!v('fJudul').trim()) { showToast('Judul rapat wajib diisi','error'); document.getElementById('fJudul').focus(); return; }
    if (!v('fTanggal'))       { showToast('Tanggal wajib diisi','error'); return; }
  }
  if (_wizardStep < 3) wizardGoTo(_wizardStep + 1);
}
function wizardPrev() {
  if (_wizardStep > 1) wizardGoTo(_wizardStep - 1);
}

/* ─────────────────────────────────────
   CONTACTS
───────────────────────────────────── */
async function loadContacts() {
  try {
    const r = await api('GET', '/api/contacts');
    st.allContacts = r.data || [];
    renderKontak(st.allContacts);
  } catch {}
}
function renderKontak(list) {
  const el = document.getElementById('kontakList');
  if (!list?.length) { el.innerHTML = `<div class="empty-state"><i class="ti ti-users"></i><p>Belum ada kontak</p></div>`; return; }
  const canAdmin = currentUser?.role === 'admin';
  el.innerHTML = list.map(c => {
    const ini = c.nama.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    return `<div class="kontak-card">
      <div class="kontak-av">${ini}</div>
      <div class="kontak-info">
        <div class="kontak-nama">${esc(c.nama)}</div>
        <div class="kontak-email">${esc(c.email)}</div>
        ${c.jabatan||c.divisi ? `<div class="kontak-sub">${esc(c.jabatan||'')}${c.jabatan&&c.divisi?' · ':''}${esc(c.divisi||'')}</div>` : ''}
      </div>
      <div class="kontak-actions">
        <div class="icon-btn" onclick="openContactModal('${c._id}')"><i class="ti ti-edit" style="font-size:14px;"></i></div>
        ${canAdmin ? `<div class="icon-btn danger" onclick="confirmDeleteContact('${c._id}','${esc(c.nama)}')"><i class="ti ti-trash" style="font-size:14px;"></i></div>` : ''}
      </div>
    </div>`;
  }).join('');
}
function filterKontak() {
  const q = document.getElementById('searchKontak').value.toLowerCase();
  renderKontak(st.allContacts.filter(c=>c.nama.toLowerCase().includes(q)||c.email.toLowerCase().includes(q)));
}
function openContactModal(id) {
  const c = id ? st.allContacts.find(x=>x._id===id) : null;
  document.getElementById('modalContactTitle').textContent = c ? 'Edit Kontak' : 'Tambah Kontak';
  document.getElementById('editContactId').value = id || '';
  sv('cNama', c?.nama||''); sv('cEmail', c?.email||''); sv('cJabatan', c?.jabatan||''); sv('cDivisiField', c?.divisi||'');
  openModal('modalContact');
}
async function saveContact() {
  const id = v('editContactId');
  const payload = { nama:v('cNama'), email:v('cEmail'), jabatan:v('cJabatan'), divisi:v('cDivisiField') };
  if (!payload.nama || !payload.email) { showToast('Nama dan email wajib diisi','error'); return; }
  if (!isEmail(payload.email)) { showToast('Format email tidak valid','error'); return; }
  try {
    const r = id ? await api('PUT',`/api/contacts/${id}`,payload) : await api('POST','/api/contacts',payload);
    if (!r.ok) throw new Error(r.message);
    closeModal('modalContact');
    showToast(id?'Kontak diperbarui':'Kontak ditambahkan');
    loadContacts();
  } catch (e) { showToast('Gagal: '+e.message,'error'); }
}
function confirmDeleteContact(id, nama) {
  showDialog({ type:'warning', icon:'ti-trash', title:'Hapus Kontak?',
    message: `Kontak <strong>"${esc(nama)}"</strong> akan dihapus permanen.`,
    actions:[
      { label:'Batal', cls:'dialog-btn-ghost' },
      { label:'Hapus', cls:'dialog-btn-danger', icon:'ti-trash', onClick: () => deleteContact(id) }
    ]
  });
}
async function deleteContact(id) {
  closeDialog();
  try { await api('DELETE',`/api/contacts/${id}`); showToast('Kontak dihapus'); loadContacts(); }
  catch { showToast('Gagal menghapus','error'); }
}

/* ─────────────────────────────────────
   USERS (admin)
───────────────────────────────────── */
async function loadUsers() {
  try {
    const r = await api('GET','/api/auth/users');
    st.allUsers = r.data || [];
    renderUsers(st.allUsers);
  } catch {}
}
function renderUsers(list) {
  const body = document.getElementById('penggunaBody');
  if (!list.length) { body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-3);">Belum ada pengguna</td></tr>`; return; }
  body.innerHTML = list.map(u => {
    const ini = u.nama.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const ll = u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}) : '—';
    const isMe = u._id === currentUser?._id;
    return `<tr>
      <td><div class="pengguna-name-wrap"><div class="pengguna-av">${ini}</div><span>${esc(u.nama)}${isMe?' <span style="font-size:10px;color:var(--teal-500);">(Saya)</span>':''}</span></div></td>
      <td style="color:var(--text-2);">${esc(u.email)}</td>
      <td><span class="user-role-badge role-${u.role}">${roleLabel(u.role)}</span></td>
      <td style="color:var(--text-2);">${esc(u.jabatan||'')}${u.jabatan&&u.divisi?' · ':''}${esc(u.divisi||'')}</td>
      <td><span class="aktif-dot ${u.aktif?'dot-on':'dot-off'}"></span> ${u.aktif?'Aktif':'Nonaktif'}</td>
      <td style="font-size:12px;color:var(--text-3);">${ll}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <div class="icon-btn" onclick="openUserModal('${u._id}')"><i class="ti ti-edit" style="font-size:14px;"></i></div>
          ${!isMe?`<div class="icon-btn danger" onclick="confirmDeleteUser('${u._id}','${esc(u.nama)}')"><i class="ti ti-trash" style="font-size:14px;"></i></div>`:''}
        </div>
      </td>
    </tr>`;
  }).join('');
}
function openUserModal(id) {
  const u = id ? st.allUsers.find(x=>x._id===id) : null;
  document.getElementById('modalUserTitle').textContent = u ? 'Edit Pengguna' : 'Tambah Pengguna';
  document.getElementById('editUserId').value = id || '';
  sv('uNama', u?.nama||''); sv('uEmail', u?.email||''); sv('uJabatan', u?.jabatan||''); sv('uDivisi', u?.divisi||'');
  document.getElementById('uRole').value = u?.role || 'user';
  document.getElementById('uAktif').checked = u ? u.aktif : true;
  sv('uPassword', '');
  document.getElementById('uPwLabel').textContent = u ? 'Password baru (kosongkan jika tidak diubah)' : 'Password *';
  openModal('modalUser');
}
async function saveUser() {
  const id = v('editUserId');
  const payload = { nama:v('uNama'), email:v('uEmail'), role:document.getElementById('uRole').value, jabatan:v('uJabatan'), divisi:v('uDivisi'), aktif:document.getElementById('uAktif').checked };
  const pw = v('uPassword');
  if (!id && !pw) { showToast('Password wajib diisi untuk pengguna baru','error'); return; }
  if (pw) payload.password = pw;
  if (!payload.nama || !payload.email) { showToast('Nama dan email wajib diisi','error'); return; }
  try {
    const r = id ? await api('PUT',`/api/auth/users/${id}`,payload) : await api('POST','/api/auth/users',payload);
    if (!r.ok) throw new Error(r.message);
    closeModal('modalUser');
    showToast(id?'Pengguna diperbarui':'Pengguna ditambahkan');
    loadUsers();
  } catch (e) { showToast('Gagal: '+e.message,'error'); }
}
function confirmDeleteUser(id, nama) {
  showDialog({ type:'warning', icon:'ti-trash', title:'Hapus Pengguna?',
    message:`Akun <strong>"${esc(nama)}"</strong> akan dihapus secara permanen.`,
    actions:[
      { label:'Batal', cls:'dialog-btn-ghost' },
      { label:'Hapus', cls:'dialog-btn-danger', icon:'ti-trash', onClick:()=>deleteUser(id) }
    ]
  });
}
async function deleteUser(id) {
  closeDialog();
  try { await api('DELETE',`/api/auth/users/${id}`); showToast('Pengguna dihapus'); loadUsers(); }
  catch { showToast('Gagal menghapus','error'); }
}

/* ─────────────────────────────────────
   MY PROFILE PAGE
───────────────────────────────────── */
function loadProfilePage() {
  const u = currentUser;
  if (!u) return;
  const ini = u.nama.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('profileAvBig').textContent = ini;
  document.getElementById('profileHeroName').textContent = u.nama;
  document.getElementById('profileHeroMeta').textContent = [u.jabatan, u.divisi].filter(Boolean).join(' · ') || u.email;
  const hb = document.getElementById('profileHeroBadge');
  hb.innerHTML = `<span class="user-role-badge role-${u.role}" style="font-size:11px;">${roleLabel(u.role)}</span>`;

  sv('pNama', u.nama||''); sv('pJabatan', u.jabatan||''); sv('pDivisi', u.divisi||''); sv('pBio', u.bio||'');
  document.getElementById('emailSaatIni').textContent = u.email;
  sv('emailBaru',''); sv('emailPw',''); sv('pwLama',''); sv('pwBaru',''); sv('pwKonfirmasi','');
}

function toggleSettingsSection(id) {
  const body = document.getElementById(id);
  const isOpen = body.classList.contains('open');
  // Close all
  ['sectionEmail','sectionPw'].forEach(s => {
    document.getElementById(s).classList.remove('open');
    document.getElementById('chevron' + s.replace('section','')).classList.remove('open');
  });
  if (!isOpen) {
    body.classList.add('open');
    document.getElementById('chevron' + id.replace('section','')).classList.add('open');
  }
}

async function simpanProfil() {
  const payload = { nama:v('pNama'), jabatan:v('pJabatan'), divisi:v('pDivisi'), bio:v('pBio') };
  if (!payload.nama) { showToast('Nama tidak boleh kosong','error'); return; }
  try {
    const r = await api('PUT','/api/auth/profile',payload);
    if (!r.ok) throw new Error(r.message);
    currentUser = r.user;
    renderUserInfo();
    loadProfilePage();
    showToast('Profil berhasil disimpan');
  } catch (e) { showToast('Gagal: '+e.message,'error'); }
}

async function ubahEmail() {
  const emailBaru = v('emailBaru'), pw = v('emailPw');
  if (!emailBaru || !pw) { showToast('Email baru dan password wajib diisi','error'); return; }
  if (!isEmail(emailBaru)) { showToast('Format email tidak valid','error'); return; }
  try {
    const r = await api('PUT','/api/auth/email',{ emailBaru, password:pw });
    if (!r.ok) throw new Error(r.message);
    currentUser = r.user;
    token = r.token; localStorage.setItem('ailo_token', token);
    renderUserInfo(); loadProfilePage();
    showDialog({ type:'success', icon:'ti-circle-check', title:'Email Diperbarui',
      message:'Email akun Anda berhasil diperbarui.',
      actions:[{ label:'Oke', cls:'dialog-btn-primary', icon:'ti-check', onClick:closeDialog }] });
  } catch (e) { showToast('Gagal: '+e.message,'error'); }
}

async function ubahPassword() {
  const lama = v('pwLama'), baru = v('pwBaru'), konfirmasi = v('pwKonfirmasi');
  if (!lama || !baru) { showToast('Semua field password wajib diisi','error'); return; }
  if (baru.length < 6) { showToast('Password baru minimal 6 karakter','error'); return; }
  if (baru !== konfirmasi) { showToast('Konfirmasi password tidak cocok','error'); return; }
  try {
    const r = await api('PUT','/api/auth/password',{ passwordLama:lama, passwordBaru:baru });
    if (!r.ok) throw new Error(r.message);
    sv('pwLama',''); sv('pwBaru',''); sv('pwKonfirmasi','');
    showDialog({ type:'success', icon:'ti-circle-check', title:'Password Diperbarui',
      message:'Password akun Anda berhasil diubah.',
      actions:[{ label:'Oke', cls:'dialog-btn-primary', icon:'ti-check', onClick:closeDialog }] });
  } catch (e) { showToast('Gagal: '+e.message,'error'); }
}

/* ─────────────────────────────────────
   CUSTOM DIALOG
   showDialog({ type, icon, title, message, actions:[{label,cls,icon?,onClick?}] })
───────────────────────────────────── */
function showDialog({ type='info', icon='ti-info-circle', title, message, actions=[] }) {
  document.getElementById('dialogIconWrap').className = 'dialog-icon-wrap ' + type;
  document.getElementById('dialogIcon').className = 'ti ' + icon;
  document.getElementById('dialogTitle').textContent = title;
  document.getElementById('dialogMessage').innerHTML = message;
  const actEl = document.getElementById('dialogActions');
  actEl.innerHTML = actions.map((a, i) =>
    `<button class="dialog-btn ${a.cls}" onclick="dialogAction(${i})">${a.icon?`<i class="ti ${a.icon}"></i>`:''}${a.label}</button>`
  ).join('');
  // Store callbacks
  actEl._actions = actions;
  document.getElementById('dialogOverlay').classList.add('open');
}
function dialogAction(i) {
  const actEl = document.getElementById('dialogActions');
  const action = actEl._actions?.[i];
  if (action?.onClick) action.onClick();
  else closeDialog();
}
function closeDialog() {
  document.getElementById('dialogOverlay').classList.remove('open');
}
// Close dialog on overlay click
document.getElementById('dialogOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('dialogOverlay')) closeDialog();
});

/* ─────────────────────────────────────
   MODAL HELPERS
───────────────────────────────────── */
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

/* ─────────────────────────────────────
   TOAST
───────────────────────────────────── */
let _toastTimer;
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  const icon = document.getElementById('toastIcon');
  document.getElementById('toastMsg').textContent = msg;
  icon.className = { success:'ti ti-check', error:'ti ti-alert-circle', info:'ti ti-info-circle' }[type] || 'ti ti-check';
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3400);
}

/* ─────────────────────────────────────
   API HELPER
───────────────────────────────────── */
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type':'application/json' } };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (res.status === 401) {
    token = null; localStorage.removeItem('ailo_token');
    document.getElementById('appShell').style.display = 'none';
    document.getElementById('authWrap').style.display = 'flex';
    showScreen('screenLogin');
  }
  return data;
}

/* ─────────────────────────────────────
   UTILS
───────────────────────────────────── */
function v(id) { return (document.getElementById(id)?.value||'').trim(); }
function sv(id, val) { const el = document.getElementById(id); if(el) el.value = val; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function isEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function setAuthErr(id, msg, isOk=false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? 'flex' : 'none';
  el.className = 'auth-alert ' + (isOk ? 'auth-alert-success' : 'auth-alert-error');
}
function setBtnLoad(id, loading, html) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? `<span style="display:inline-flex;align-items:center;gap:8px;"><span style="width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;display:inline-block;"></span>${html.replace(/<[^>]+>/g,'')}</span>` : html;
}

// Spinner keyframes
const style = document.createElement('style');
style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
document.head.appendChild(style);

// Live preview sync
['fJudul','fPemimpin'].forEach(id => document.getElementById(id)?.addEventListener('input', updateEmailPreview));
document.getElementById('fTanggal')?.addEventListener('input', updateTopbarMeta);
