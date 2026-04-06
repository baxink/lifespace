/**
 * LocalStorage 数据存储模块
 * 负责物品数据的增删改查
 */

const STORAGE_KEY = 'lifespace_items';

// 默认分类
const CATEGORIES = [
  { id: 'all', name: '全部', icon: '📦' },
  { id: 'electronics', name: '电器', icon: '📱' },
  { id: 'documents', name: '文件', icon: '📄' },
  { id: 'tools', name: '工具', icon: '🔧' },
  { id: 'others', name: '其他', icon: '📦' }
];

const CategoryIcons = {
  electronics: '📱',
  documents: '📄',
  tools: '🔧',
  others: '📦'
};

/**
 * 获取所有物品
 */
function getAllItems() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('读取数据失败:', e);
    return [];
  }
}

/**
 * 根据ID获取物品
 */
function getItemById(id) {
  const items = getAllItems();
  return items.find(item => item.id === id) || null;
}

/**
 * 保存物品（新增或更新）
 */
function saveItem(item) {
  const items = getAllItems();
  const now = Date.now();

  if (!item.id) {
    // 新增
    item.id = generateId();
    item.createdAt = now;
  }
  item.updatedAt = now;

  const existingIndex = items.findIndex(i => i.id === item.id);
  if (existingIndex >= 0) {
    items[existingIndex] = { ...items[existingIndex], ...item };
  } else {
    items.unshift(item); // 新物品放在最前面
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return { success: true, item };
  } catch (e) {
    console.error('保存数据失败:', e);
    return { success: false, error: '存储空间不足' };
  }
}

/**
 * 删除物品
 */
function deleteItem(id) {
  const items = getAllItems();
  const filtered = items.filter(item => item.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return { success: true };
  } catch (e) {
    console.error('删除数据失败:', e);
    return { success: false, error: '删除失败' };
  }
}

/**
 * 搜索物品
 */
function searchItems(query, category = 'all') {
  const items = getAllItems();
  const q = query.toLowerCase().trim();

  return items.filter(item => {
    const matchCategory = category === 'all' || item.category === category;
    if (!q) return matchCategory;

    const matchQuery =
      item.name.toLowerCase().includes(q) ||
      (item.location && item.location.toLowerCase().includes(q));

    return matchCategory && matchQuery;
  });
}

/**
 * 生成唯一ID
 */
function generateId() {
  return 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 将图片转换为Base64
 */
function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 导出数据（JSON格式）
 */
function exportData() {
  const items = getAllItems();
  return JSON.stringify(items, null, 2);
}

/**
 * 导入数据
 */
function importData(jsonStr) {
  try {
    const items = JSON.parse(jsonStr);
    if (Array.isArray(items)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return { success: true, count: items.length };
    }
    return { success: false, error: '数据格式无效' };
  } catch (e) {
    return { success: false, error: 'JSON解析失败' };
  }
}

/**
 * 清空所有数据
 */
function clearAllData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return { success: true };
  } catch (e) {
    return { success: false, error: '清空失败' };
  }
}
