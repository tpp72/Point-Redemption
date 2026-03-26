/* ═══════════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════════ */

const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.style.display = 'none';

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        errorMsg.textContent = '❌ ' + data.message;
        errorMsg.style.display = 'block';
        return;
      }
      localStorage.setItem('userRole', data.role);
      localStorage.setItem('username', data.username);
      window.location.href = '/';
    } catch (err) {
      errorMsg.textContent = '❌ เกิดข้อผิดพลาด กรุณาลองใหม่';
      errorMsg.style.display = 'block';
    }
  });
}

/* ═══════════════════════════════════════════════
   INDEX PAGE — STATE
   ═══════════════════════════════════════════════ */

let currentUser = null;
let allRewards  = [];
let editingId   = null;

/* ═══════════════════════════════════════════════
   INDEX PAGE — INIT & DATA LOADING
   ═══════════════════════════════════════════════ */

async function init() {
  const res = await fetch('/api/me');
  if (!res.ok) { window.location.href = '/login.html'; return; }
  currentUser = await res.json();

  const role = localStorage.getItem('userRole') || currentUser.role;
  document.getElementById('welcomeMsg').textContent =
    `ยินดีต้อนรับคุณ ${currentUser.username} (สิทธิ์: ${role === 'admin' ? 'Admin' : 'Member'})`;

  if (role === 'member') {
    const badge = document.getElementById('pointsBadge');
    badge.style.display = 'block';
    badge.textContent = `⭐ ${currentUser.points} คะแนน`;
  }
  if (role === 'admin') {
    document.getElementById('adminToolbar').style.display = 'block';
  }

  const vmRes = await fetch('/api/viewmode');
  const { viewMode } = await vmRes.json();
  updateToggleUI(viewMode);

  await loadRewards();
}

async function loadRewards() {
  const res = await fetch('/api/rewards');
  if (!res.ok) return;
  allRewards = await res.json();

  const role = localStorage.getItem('userRole') || currentUser.role;

  const newRewards     = allRewards.slice(0, Math.ceil(allRewards.length / 2));
  const popularRewards = [...allRewards].sort((a, b) => b.pointRequired - a.pointRequired);

  document.getElementById('newBadge').textContent     = newRewards.length;
  document.getElementById('popularBadge').textContent = popularRewards.length;

  renderGrid('newRewardsGrid',     newRewards,     role);
  renderGrid('popularRewardsGrid', popularRewards, role);

  if (role === 'member' && currentUser) {
    document.getElementById('pointsBadge').textContent = `⭐ ${currentUser.points} คะแนน`;
  }
}

/* ═══════════════════════════════════════════════
   INDEX PAGE — RENDER
   ═══════════════════════════════════════════════ */

function renderGrid(gridId, rewards, role) {
  const grid = document.getElementById(gridId);
  if (rewards.length === 0) {
    grid.innerHTML = '<div class="empty"><span class="empty-icon">📭</span><p>ไม่มีของรางวัล</p></div>';
    return;
  }
  grid.innerHTML = rewards.map((r) => {
    const stockCls  = r.stock === 0 ? 'out' : r.stock <= 3 ? 'low' : '';
    const stockText = r.stock === 0 ? '❌ หมดสต็อก' : r.stock <= 3
      ? `⚠️ เหลือ ${r.stock} ชิ้น`
      : `✅ เหลือ ${r.stock} ชิ้น`;
    const canRedeem = role === 'member' && r.stock > 0 && currentUser.points >= r.pointRequired;

    const imgHtml = r.image
      ? `<img src="${r.image}" class="card-img" alt="${r.title}" />`
      : `<div class="card-img-placeholder">🎁</div>`;

    let actions = '';
    if (role === 'member') {
      const label = r.stock === 0 ? 'หมดสต็อก'
        : currentUser.points < r.pointRequired ? 'คะแนนไม่พอ'
        : '🎁 แลกของรางวัล';
      actions = `<button class="btn-redeem" onclick="redeem('${r._id}')" ${!canRedeem ? 'disabled' : ''}>${label}</button>`;
    } else {
      actions = `
        <button class="btn-edit-stock" onclick="openStockModal('${r._id}', ${r.stock}, '${r.image || ''}')">✏️ แก้ไข</button>
        <button class="btn-delete" onclick="deleteReward('${r._id}')">🗑️ ลบ</button>
      `;
    }

    return `
      <div class="reward-card" id="card-${r._id}">
        ${imgHtml}
        <div class="reward-title">${r.title}</div>
        <div class="reward-points">⭐ ${r.pointRequired} คะแนน</div>
        <div class="reward-stock ${stockCls}">${stockText}</div>
        <div class="card-actions">${actions}</div>
      </div>`;
  }).join('');
}

/* ═══════════════════════════════════════════════
   INDEX PAGE — ADMIN ACTIONS
   ═══════════════════════════════════════════════ */

function previewNewImage(input) {
  const preview = document.getElementById('newImagePreview');
  const label   = document.getElementById('newImageLabel');
  if (input.files && input.files[0]) {
    preview.src = URL.createObjectURL(input.files[0]);
    preview.style.display = 'block';
    label.textContent = '✅ ' + input.files[0].name;
  }
}

function previewEditImage(input) {
  const preview = document.getElementById('editImagePreview');
  const label   = document.getElementById('editImageLabel');
  if (input.files && input.files[0]) {
    preview.src = URL.createObjectURL(input.files[0]);
    preview.style.display = 'block';
    label.textContent = '✅ ' + input.files[0].name;
  }
}

async function addReward() {
  const title         = document.getElementById('newTitle').value.trim();
  const pointRequired = parseInt(document.getElementById('newPoints').value);
  const stock         = parseInt(document.getElementById('newStock').value);
  const imageFile     = document.getElementById('newImage').files[0];

  if (!title || isNaN(pointRequired) || isNaN(stock)) {
    showToast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error'); return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('pointRequired', pointRequired);
  formData.append('stock', stock);
  if (imageFile) formData.append('image', imageFile);

  const res = await fetch('/api/rewards', { method: 'POST', body: formData });
  if (res.ok) {
    document.getElementById('newTitle').value  = '';
    document.getElementById('newPoints').value = '';
    document.getElementById('newStock').value  = '';
    document.getElementById('newImage').value  = '';
    document.getElementById('newImagePreview').style.display = 'none';
    document.getElementById('newImageLabel').textContent = '🖼️ เลือกรูป';
    showToast('✅ เพิ่มของรางวัลสำเร็จ', 'success');
    await loadRewards();
  } else {
    const d = await res.json();
    showToast(d.message || 'เกิดข้อผิดพลาด', 'error');
  }
}

async function deleteReward(id) {
  if (!confirm('ต้องการลบของรางวัลนี้?')) return;
  const res = await fetch(`/api/rewards/${id}`, { method: 'DELETE' });
  if (res.ok) { showToast('🗑️ ลบสำเร็จ', 'success'); await loadRewards(); }
}

/* ═══════════════════════════════════════════════
   INDEX PAGE — MODAL (EDIT STOCK + IMAGE)
   ═══════════════════════════════════════════════ */

function openStockModal(id, currentStock, currentImage) {
  editingId = id;
  document.getElementById('stockInput').value        = currentStock;
  document.getElementById('editImage').value         = '';
  document.getElementById('editImageLabel').textContent = '🖼️ เลือกรูปใหม่';

  const preview = document.getElementById('editImagePreview');
  if (currentImage) {
    preview.src = currentImage;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
    preview.src = '';
  }

  document.getElementById('stockModal').classList.add('open');
}

function closeModal() {
  document.getElementById('stockModal').classList.remove('open');
  editingId = null;
}

async function confirmStock() {
  const stock     = parseInt(document.getElementById('stockInput').value);
  const imageFile = document.getElementById('editImage').files[0];

  if (isNaN(stock) || stock < 0) { showToast('กรอกจำนวนที่ถูกต้อง', 'error'); return; }

  // อัปเดต stock
  const stockRes = await fetch(`/api/rewards/${editingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stock })
  });
  if (!stockRes.ok) { showToast('อัปเดตสต็อกไม่สำเร็จ', 'error'); return; }

  // อัปเดตรูปถ้ามีการเลือกรูปใหม่
  if (imageFile) {
    const formData = new FormData();
    formData.append('image', imageFile);
    const imgRes = await fetch(`/api/rewards/${editingId}/image`, {
      method: 'PUT',
      body: formData
    });
    if (!imgRes.ok) { showToast('อัปเดตรูปไม่สำเร็จ', 'error'); return; }
  }

  showToast('✅ บันทึกสำเร็จ', 'success');
  closeModal();
  await loadRewards();
}

/* ═══════════════════════════════════════════════
   INDEX PAGE — MEMBER ACTIONS
   ═══════════════════════════════════════════════ */

async function redeem(rewardId) {
  if (!confirm('ยืนยันการแลกของรางวัลนี้?')) return;
  const res = await fetch('/api/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rewardId })
  });
  const data = await res.json();
  if (res.ok) {
    currentUser.points = data.remainingPoints;
    showToast('🎉 ' + data.message, 'success');
    await loadRewards();
  } else {
    showToast('❌ ' + data.message, 'error');
  }
}

/* ═══════════════════════════════════════════════
   INDEX PAGE — VIEW MODE (COOKIE)
   ═══════════════════════════════════════════════ */

async function setViewMode(mode) {
  await fetch('/api/viewmode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ viewMode: mode })
  });
  updateToggleUI(mode);
  await loadRewards();
}

function updateToggleUI(mode) {
  document.getElementById('btnAll').classList.toggle('active',    mode === 'all');
  document.getElementById('btnRecent').classList.toggle('active', mode === 'recent');
}

/* ═══════════════════════════════════════════════
   SHARED — LOGOUT & TOAST
   ═══════════════════════════════════════════════ */

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  localStorage.removeItem('userRole');
  localStorage.removeItem('username');
  window.location.href = '/login.html';
}

function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3200);
}

/* ═══════════════════════════════════════════════
   BOOTSTRAP
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const stockModal = document.getElementById('stockModal');
  if (stockModal) {
    stockModal.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    init();
  }
});
