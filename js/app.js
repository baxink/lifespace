/**
 * 主应用逻辑
 * 处理页面交互、渲染和数据操作
 */

// 全局状态
let currentFilter = 'all';
let currentQuery = '';
let currentItems = [];

// ============================================
// 初始化
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  if (page === 'index') {
    initIndexPage();
  } else if (page === 'add') {
    initAddPage();
  } else if (page === 'detail') {
    initDetailPage();
  }
});

// ============================================
// 主页逻辑
// ============================================

function initIndexPage() {
  renderFilterTags();
  loadAndRenderItems();

  // 搜索防抖
  const searchInput = document.getElementById('searchInput');
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentQuery = e.target.value;
      loadAndRenderItems();
    }, 300);
  });
}

function renderFilterTags() {
  const container = document.getElementById('filterTags');
  container.innerHTML = CATEGORIES.map(cat => `
    <button class="filter-tag ${cat.id === currentFilter ? 'active' : ''}"
            data-category="${cat.id}">
      ${cat.icon} ${cat.name}
    </button>
  `).join('');

  container.querySelectorAll('.filter-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.category;
      renderFilterTags();
      loadAndRenderItems();
    });
  });
}

function loadAndRenderItems() {
  currentItems = searchItems(currentQuery, currentFilter);
  renderItemGrid();
}

function renderItemGrid() {
  const container = document.getElementById('itemGrid');
  const emptyState = document.getElementById('emptyState');

  if (currentItems.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = currentItems.map(item => `
    <div class="item-card" onclick="goToDetail('${item.id}')">
      <div class="item-card-image">
        ${item.image
          ? `<img src="${item.image}" alt="${item.name}">`
          : CategoryIcons[item.category] || '📦'
        }
      </div>
      <div class="item-card-content">
        <div class="item-card-name">${escapeHtml(item.name)}</div>
        <div class="item-card-location">${escapeHtml(item.location || '未设置位置')}</div>
      </div>
    </div>
  `).join('');
}

// ============================================
// 添加页逻辑
// ============================================

let scanner = null;
let capturedQrCode = '';

function initAddPage() {
  // 自动启动扫码
  startScanning();

  // 手动输入按钮
  document.getElementById('manualInputBtn').addEventListener('click', () => {
    showManualInputModal();
  });
}

async function startScanning() {
  const statusEl = document.getElementById('scannerStatus');
  if (statusEl) statusEl.textContent = '正在加载扫描组件...';

  const hasPermission = await checkCameraPermission();
  if (!hasPermission) {
    showToast('请允许使用摄像头', 'error');
    if (statusEl) statusEl.textContent = '摄像头权限被拒绝';
    return;
  }

  try {
    if (statusEl) statusEl.textContent = '正在初始化扫描器...';

    scanner = await initScanner(
      'scannerViewport',
      (decodedText) => {
        capturedQrCode = decodedText;
        scannerStopped = true;
        if (statusEl) statusEl.textContent = '识别成功！';
        stopScanner();
        showItemForm(decodedText);
      },
      (error) => {
        // 扫描进行中的错误，忽略
      }
    );

    if (statusEl) statusEl.textContent = '扫描就绪，请对准条形码';
  } catch (e) {
    console.error('启动扫描失败:', e);
    showToast('扫描启动失败: ' + (e.message || e), 'error');
    if (statusEl) statusEl.textContent = '启动失败: ' + (e.message || '未知错误');
  }
}

let scannerStopped = false;

function showItemForm(qrCode) {
  document.getElementById('qrCodeDisplay').textContent = qrCode;
  document.getElementById('addForm').style.display = 'block';
  document.getElementById('scannerContainer').style.display = 'none';
  document.getElementById('manualInputBtn').style.display = 'none';
}

function showManualInputModal() {
  stopScanner(scanner);
  const modal = document.getElementById('manualInputModal');
  modal.style.display = 'flex';
}

function hideManualInputModal() {
  const modal = document.getElementById('manualInputModal');
  modal.style.display = 'none';
}

function submitManualCode() {
  const code = document.getElementById('manualCodeInput').value.trim();
  if (!code) {
    showToast('请输入编号', 'error');
    return;
  }
  hideManualInputModal();
  showItemForm(code);
}

// 图片预览
document.getElementById('imageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showToast('图片大小不能超过5MB', 'error');
    return;
  }

  try {
    const base64 = await imageToBase64(file);
    document.getElementById('imagePreview').src = base64;
    document.getElementById('imagePreview').style.display = 'block';
    document.querySelector('.image-upload').style.display = 'none';
  } catch (e) {
    showToast('图片处理失败', 'error');
  }
});

// 提交表单
document.getElementById('itemForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('nameInput').value.trim();
  const location = document.getElementById('locationInput').value.trim();
  const category = document.getElementById('categorySelect').value;
  const imageInput = document.getElementById('imageInput');
  const imageFile = imageInput.files[0];

  if (!name) {
    showToast('请输入物品名称', 'error');
    return;
  }

  // 显示加载状态
  const submitBtn = document.getElementById('submitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = '保存中...';

  try {
    let imageBase64 = null;
    if (imageFile) {
      imageBase64 = await imageToBase64(imageFile);
    }

    const item = {
      id: capturedQrCode,
      name,
      location,
      category,
      image: imageBase64
    };

    const result = saveItem(item);

    if (result.success) {
      showToast('保存成功', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } else {
      showToast(result.error || '保存失败', 'error');
    }
  } catch (e) {
    showToast('保存失败', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '保存';
  }
});

// ============================================
// 详情页逻辑
// ============================================

function initDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');

  if (!itemId) {
    window.location.href = 'index.html';
    return;
  }

  const item = getItemById(itemId);

  if (!item) {
    document.getElementById('notFound').style.display = 'block';
    document.getElementById('itemDetail').style.display = 'none';
    return;
  }

  renderItemDetail(item);
}

function renderItemDetail(item) {
  document.getElementById('detailImage').innerHTML = item.image
    ? `<img src="${item.image}" alt="${item.name}">`
    : CategoryIcons[item.category] || '📦';

  document.getElementById('detailName').textContent = item.name;
  document.getElementById('detailLocation').textContent = item.location || '未设置位置';

  const date = new Date(item.updatedAt);
  document.getElementById('detailMeta').textContent =
    `更新时间: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

  // 编辑按钮
  document.getElementById('editBtn').onclick = () => {
    window.location.href = `edit.html?id=${item.id}`;
  };

  // 删除按钮
  document.getElementById('deleteBtn').onclick = () => {
    showDeleteConfirm(item);
  };
}

function showDeleteConfirm(item) {
  const modal = document.getElementById('deleteModal');
  modal.style.display = 'flex';

  document.getElementById('confirmDeleteBtn').onclick = () => {
    const result = deleteItem(item.id);
    if (result.success) {
      showToast('删除成功', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } else {
      showToast(result.error || '删除失败', 'error');
    }
  };

  document.getElementById('cancelDeleteBtn').onclick = () => {
    modal.style.display = 'none';
  };
}

// ============================================
// 编辑页逻辑
// ============================================

function initEditPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');

  if (!itemId) {
    window.location.href = 'index.html';
    return;
  }

  const item = getItemById(itemId);

  if (!item) {
    window.location.href = 'index.html';
    return;
  }

  // 填充表单
  document.getElementById('qrCodeDisplay').textContent = item.id;
  document.getElementById('nameInput').value = item.name;
  document.getElementById('locationInput').value = item.location || '';
  document.getElementById('categorySelect').value = item.category || 'others';

  if (item.image) {
    document.getElementById('imagePreview').src = item.image;
    document.getElementById('imagePreview').style.display = 'block';
    document.querySelector('.image-upload').style.display = 'none';
  }

  // 提交表单
  document.getElementById('itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('nameInput').value.trim();
    const location = document.getElementById('locationInput').value.trim();
    const category = document.getElementById('categorySelect').value;
    const imageInput = document.getElementById('imageInput');

    if (!name) {
      showToast('请输入物品名称', 'error');
      return;
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '保存中...';

    try {
      let imageBase64 = item.image; // 保留原有图片

      if (imageInput.files[0]) {
        imageBase64 = await imageToBase64(imageInput.files[0]);
      }

      const updatedItem = {
        id: item.id,
        name,
        location,
        category,
        image: imageBase64
      };

      const result = saveItem(updatedItem);

      if (result.success) {
        showToast('保存成功', 'success');
        setTimeout(() => {
          window.location.href = `item.html?id=${item.id}`;
        }, 1000);
      } else {
        showToast(result.error || '保存失败', 'error');
      }
    } catch (e) {
      showToast('保存失败', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '保存';
    }
  });
}

// ============================================
// 工具函数
// ============================================

function goToDetail(itemId) {
  window.location.href = `item.html?id=${encodeURIComponent(itemId)}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = '') {
  // 移除已存在的toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// 页面加载时初始化编辑页
if (document.body.dataset.page === 'edit') {
  document.addEventListener('DOMContentLoaded', initEditPage);
}
