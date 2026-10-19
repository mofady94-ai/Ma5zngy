// @ts-nocheck
let inventoryData = JSON.parse(localStorage.getItem('app_inventory_data')) || [];
let inventoryLogs = JSON.parse(localStorage.getItem('app_inventory_logs')) || [];
let currentImageBase64 = '';
let openModelsState = {}; 

// تفعيل الثيم المحفوظ
const savedTheme = localStorage.getItem('app_theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
const themeToggleBtn = document.getElementById('themeToggleBtn');
if (themeToggleBtn) {
  themeToggleBtn.innerText = savedTheme === 'dark' ? '☀️' : '🌙';
  themeToggleBtn.onclick = () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('app_theme', next);
    themeToggleBtn.innerText = next === 'dark' ? '☀️' : '🌙';
  };
}

const modelsList = document.getElementById('modelsList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');

const modelModal = document.getElementById('modelModal');
const partModal = document.getElementById('partModal');

document.getElementById('openAddModalBtn').onclick = () => {
  document.getElementById('editModelId').value = '';
  document.getElementById('modelModalTitle').innerText = 'إضافة موديل جهاز جديد';
  document.getElementById('modelForm').reset();
  document.getElementById('imagePreview').style.display = 'none';
  currentImageBase64 = '';
  modelModal.classList.add('active');
};

document.getElementById('closeModelModal').onclick = () => closeModal('modelModal');
document.getElementById('cancelModelBtn').onclick = () => closeModal('modelModal');
document.getElementById('closePartModal').onclick = () => closeModal('partModal');
document.getElementById('cancelPartBtn').onclick = () => closeModal('partModal');

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
  if (id === 'modelModal') {
    document.getElementById('modelForm').reset();
    document.getElementById('imagePreview').style.display = 'none';
    currentImageBase64 = '';
  }
}

// معاينة الصورة
document.getElementById('modelImage').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      currentImageBase64 = evt.target.result;
      const preview = document.getElementById('imagePreview');
      preview.innerHTML = `<img src="${currentImageBase64}">`;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
});

// حفظ أو تعديل الموديل
document.getElementById('modelForm').onsubmit = (e) => {
  e.preventDefault();
  const editId = document.getElementById('editModelId').value;
  const name = document.getElementById('modelName').value.trim();
  if (!name) return;

  if (editId) {
    const model = inventoryData.find(m => m.id === editId);
    if (model) {
      model.name = name;
      if (currentImageBase64) model.image = currentImageBase64;
      addLog(`تعديل بيانات الموديل: ${name}`);
    }
  } else {
    const newModel = {
      id: Date.now().toString(),
      name: name,
      image: currentImageBase64 || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M12 18h.01"/><path d="M7 6h10"/></svg>',
      parts: []
    };
    inventoryData.push(newModel);
    openModelsState[newModel.id] = true;
    addLog(`إضافة موديل جديد: ${name}`);
  }

  saveData();
  render();
  closeModal('modelModal');
};

// حفظ أو تعديل قطعة الغيار
document.getElementById('partForm').onsubmit = (e) => {
  e.preventDefault();
  const modelId = document.getElementById('targetModelId').value;
  const editPartId = document.getElementById('editPartId').value;
  const name = document.getElementById('partName').value.trim();
  const code = document.getElementById('partCode').value.trim();
  const qty = parseInt(document.getElementById('partQty').value) || 0;

  const model = inventoryData.find(m => m.id === modelId);
  if (model) {
    if (editPartId) {
      const part = model.parts.find(p => p.id === editPartId);
      if (part) {
        part.name = name;
        part.code = code;
        part.quantity = qty;
        addLog(`تعديل القطعة [${code}] ${name}`);
      }
    } else {
      model.parts.push({
        id: Date.now().toString(),
        name: name,
        code: code,
        quantity: qty
      });
      openModelsState[modelId] = true;
      addLog(`إضافة قطعة (${name} - ${code}) إلى ${model.name}`);
    }
    saveData();
    render();
    closeModal('partModal');
  }
};

window.openAddPartModal = function(modelId, event) {
  if (event) event.stopPropagation();
  document.getElementById('targetModelId').value = modelId;
  document.getElementById('editPartId').value = '';
  document.getElementById('partModalTitle').innerText = 'إضافة قطعة غيار';
  document.getElementById('partForm').reset();

  let maxCodeNum = 0;
  inventoryData.forEach(m => {
    m.parts.forEach(p => {
      const num = parseInt(p.code.replace('#', ''));
      if (!isNaN(num) && num > maxCodeNum) maxCodeNum = num;
    });
  });
  document.getElementById('partCode').value = `#${maxCodeNum + 1}`;
  partModal.classList.add('active');
};

window.openEditModelModal = function(modelId, event) {
  if (event) event.stopPropagation();
  const model = inventoryData.find(m => m.id === modelId);
  if (model) {
    document.getElementById('editModelId').value = model.id;
    document.getElementById('modelName').value = model.name;
    document.getElementById('modelModalTitle').innerText = 'تعديل بيانات الموديل';
    currentImageBase64 = '';
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = `<img src="${model.image}">`;
    preview.style.display = 'block';
    modelModal.classList.add('active');
  }
};

window.openEditPartModal = function(modelId, partId, event) {
  if (event) event.stopPropagation();
  const model = inventoryData.find(m => m.id === modelId);
  if (model) {
    const part = model.parts.find(p => p.id === partId);
    if (part) {
      document.getElementById('targetModelId').value = modelId;
      document.getElementById('editPartId').value = part.id;
      document.getElementById('partModalTitle').innerText = 'تعديل قطعة الغيار';
      document.getElementById('partName').value = part.name;
      document.getElementById('partCode').value = part.code;
      document.getElementById('partQty').value = part.quantity;
      partModal.classList.add('active');
    }
  }
};

window.deletePart = function(modelId, partId, event) {
  if (event) event.stopPropagation();
  const model = inventoryData.find(m => m.id === modelId);
  if (model && confirm('هل أنت تأكد من حذف هذه القطعة؟')) {
    model.parts = model.parts.filter(p => p.id !== partId);
    saveData();
    render(searchInput.value.toLowerCase().trim());
  }
};

window.updateQty = function(modelId, partId, change, event) {
  if (event) event.stopPropagation();
  const model = inventoryData.find(m => m.id === modelId);
  if (model) {
    const part = model.parts.find(p => p.id === partId);
    if (part) {
      const oldQty = part.quantity;
      part.quantity = Math.max(0, part.quantity + change);
      const diff = part.quantity - oldQty;
      if (diff !== 0) {
        const actionText = diff > 0 ? `إضافة (+${diff})` : `سحب (${diff})`;
        addLog(`${actionText} للقطعة [${part.code}] ${part.name}`);
      }
      saveData();
      render(searchInput.value.toLowerCase().trim());
    }
  }
};

window.deleteModel = function(modelId, event) {
  if (event) event.stopPropagation();
  const model = inventoryData.find(m => m.id === modelId);
  if (confirm('هل أنت تأكد من حذف الموديل بالكامل؟')) {
    if (model) addLog(`حذف الموديل بالكامل: ${model.name}`);
    inventoryData = inventoryData.filter(m => m.id !== modelId);
    delete openModelsState[modelId];
    saveData();
    render(searchInput.value.toLowerCase().trim());
  }
};

window.toggleModelAccordion = function(modelId) {
  openModelsState[modelId] = !openModelsState[modelId];
  const card = document.getElementById(`model-card-${modelId}`);
  if (card) {
    if (openModelsState[modelId]) card.classList.add('open');
    else card.classList.remove('open');
  }
};

// إدارة السجل
function addLog(text) {
  const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  inventoryLogs.unshift(`${timeStr}: ${text}`);
  if (inventoryLogs.length > 30) inventoryLogs.pop();
  localStorage.setItem('app_inventory_logs', JSON.stringify(inventoryLogs));
  renderLogs();
}

window.toggleLogs = function() {
  const content = document.getElementById('logsContent');
  const icon = document.getElementById('logsToggleIcon');
  content.classList.toggle('open');
  icon.style.transform = content.classList.contains('open') ? 'rotate(180deg)' : 'rotate(0deg)';
};

function renderLogs() {
  const logsList = document.getElementById('logsList');
  if (!logsList) return;
  if (inventoryLogs.length === 0) {
    logsList.innerHTML = '<p class="no-logs">لا توجد حركات مسجلة حتى الآن</p>';
  } else {
    logsList.innerHTML = inventoryLogs.map(log => `<div class="log-item">• ${log}</div>`).join('');
  }
}

// تقرير PDF المطابق لدفتر الجرد
const exportBtn = document.getElementById('exportBtn');
if (exportBtn) {
  exportBtn.onclick = () => {
    if (inventoryData.length === 0) {
      alert("لا توجد بيانات بالمخزن لطباعة التقرير!");
      return;
    }
    const todayStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    let tableRowsHTML = '';

    inventoryData.forEach(model => {
      const partsCount = model.parts.length;
      if (partsCount === 0) {
        tableRowsHTML += `<tr><td style="padding: 8px; border: 1px solid #000; font-weight: bold; text-align: center;">${model.name}</td><td style="padding: 8px; border: 1px solid #000; text-align: center;" colspan="4">لا توجد قطع مضافة</td></tr>`;
      } else {
        model.parts.forEach((part, index) => {
          const isLowStock = part.quantity <= 2;
          const statusText = isLowStock ? 'رصيد منخفض' : 'متوفر';
          const statusColor = isLowStock ? '#dc2626' : '#16a34a';

          tableRowsHTML += `<tr>`;
          if (index === 0) {
            tableRowsHTML += `<td rowspan="${partsCount}" style="padding: 8px; border: 1px solid #000; font-weight: bold; vertical-align: middle; text-align: center; background-color: #f8fafc;">${model.name}</td>`;
          }
          tableRowsHTML += `
            <td style="padding: 6px; border: 1px solid #000; font-weight: bold; text-align: center;">${part.code}</td>
            <td style="padding: 6px; border: 1px solid #000;">${part.name}</td>
            <td style="padding: 6px; border: 1px solid #000; text-align: center; font-weight: bold;">${part.quantity}</td>
            <td style="padding: 6px; border: 1px solid #000; text-align: center; font-weight: bold; color: ${statusColor};">${statusText}</td>
          </tr>`;
        });
      }
    });

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تقرير جرد المخزون - ${todayStr}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 20px; color: #000; direction: rtl; background: #fff; }
          .top-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th { border: 2px solid #000; padding: 8px; background-color: #e2e8f0; text-align: center; font-size: 0.95rem; }
          td { border: 1px solid #000; font-size: 0.9rem; }
          @media print { body { padding: 0; } @page { margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="top-header">
          <h2>📋 تقرير جرد مخزن قطع الغيار</h2>
          <div>تاريخ التقرير: ${todayStr}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">اسم الجهاز</th>
              <th style="width: 15%;">الكود</th>
              <th style="width: 35%;">اسم قطعة الغيار</th>
              <th style="width: 12%;">الكمية</th>
              <th style="width: 13%;">الحالة</th>
            </tr>
          </thead>
          <tbody>${tableRowsHTML}</tbody>
        </table>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
    addLog("تم طباعة وتصدير تقرير المخزون PDF بنجاح");
  };
}

const importFile = document.getElementById('importFile');
if (importFile) {
  importFile.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const imported = JSON.parse(evt.target.result);
          if (Array.isArray(imported)) {
            inventoryData = imported;
            saveData();
            render();
            addLog("تم استعادة البيانات بنجاح");
            alert("تم استعادة بيانات المخزن بنجاح!");
          } else { alert("ملف غير صالح!"); }
        } catch (err) { alert("حدث خطأ أثناء قراءة الملف!"); }
      };
      reader.readAsText(file);
    }
  });
}

function saveData() {
  localStorage.setItem('app_inventory_data', JSON.stringify(inventoryData));
}

if (searchInput) {
  searchInput.oninput = (e) => {
    const query = e.target.value.toLowerCase().trim();
    clearSearchBtn.style.display = query ? 'block' : 'none';
    render(query);
  };
}

if (clearSearchBtn) {
  clearSearchBtn.onclick = () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    render();
  };
}

function render(query = '') {
  modelsList.innerHTML = '';
  let totalModels = inventoryData.length;
  let totalParts = 0;
  let totalQty = 0;
  let lowStockCount = 0;

  let filtered = inventoryData.map(m => {
    let partsMatch = m.parts.filter(p => 
      p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query)
    );
    let modelMatch = m.name.toLowerCase().includes(query);
    if (modelMatch || partsMatch.length > 0) {
      return { ...m, parts: query ? (modelMatch ? m.parts : partsMatch) : m.parts };
    }
    return null;
  }).filter(Boolean);

  inventoryData.forEach(m => {
    m.parts.forEach(p => {
      totalParts++;
      totalQty += p.quantity;
      if (p.quantity <= 2) lowStockCount++;
    });
  });

  // تحديث القيم في كروت الإحصائيات المصغرة
  document.getElementById('statModels').innerText = totalModels;
  document.getElementById('statParts').innerText = totalParts;
  document.getElementById('statQty').innerText = totalQty;
  const lowStockEl = document.getElementById('statLowStock');
  lowStockEl.innerText = lowStockCount;
  const alertCard = document.getElementById('statAlertCard');
  if (lowStockCount > 0) {
    alertCard.style.borderColor = '#f87171';
    alertCard.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
  } else {
    alertCard.style.borderColor = 'var(--border-color)';
    alertCard.style.backgroundColor = 'var(--card-bg)';
  }

  document.getElementById('globalStats').innerText = `${totalModels} موديل | ${totalQty} قطعة`;

  if (inventoryData.length === 0) {
    emptyState.style.display = 'block';
    modelsList.style.display = 'none';
  } else {
    emptyState.style.display = 'none';
    modelsList.style.display = 'flex';
  }

  filtered.forEach(model => {
    const isOpen = query ? true : !!openModelsState[model.id];
    const card = document.createElement('div');
    card.className = `model-card ${isOpen ? 'open' : ''}`;
    card.id = `model-card-${model.id}`;

    let partsHTML = model.parts.map(p => {
      const isLowStock = p.quantity <= 2;
      const qtyClass = isLowStock ? 'qty-badge low-stock-badge' : 'qty-badge';
      return `
        <div class="part-item">
          <div class="part-meta">
            <span class="part-code">${p.code}</span>
            <span class="part-name-text">${p.name}</span>
            ${isLowStock ? '<small style="color:#dc2626; font-size:0.65rem;">⚠️ رصيد منخفض</small>' : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="counter-controls" onclick="event.stopPropagation()">
              <button class="btn-counter btn-minus" onclick="window.updateQty('${model.id}', '${p.id}', -1, event)">-</button>
              <span class="${qtyClass}">${p.quantity}</span>
              <button class="btn-counter btn-plus" onclick="window.updateQty('${model.id}', '${p.id}', 1, event)">+</button>
            </div>
            <button class="icon-btn" onclick="window.openEditPartModal('${model.id}', '${p.id}', event)" title="تعديل القطعة">✏️</button>
            <button class="icon-btn" onclick="window.deletePart('${model.id}', '${p.id}', event)" title="حذف القطعة" style="color: #dc2626;">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    card.innerHTML = `
      <div class="model-header" onclick="window.toggleModelAccordion('${model.id}')">
        <div class="model-info">
          <img src="${model.image}" class="model-img" alt="موديل">
          <div>
            <div class="model-title">${model.name}</div>
            <small style="color: #64748b; font-size: 0.75rem;">${model.parts.length} قطع غيار</small>
          </div>
        </div>
        <div class="model-actions-wrapper" onclick="event.stopPropagation()">
          <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="window.openAddPartModal('${model.id}', event)">➕ قطعه</button>
          <button class="icon-btn" onclick="window.openEditModelModal('${model.id}', event)" title="تعديل الموديل">✏️</button>
          <button class="icon-btn" onclick="window.deleteModel('${model.id}', event)" title="حذف الموديل" style="color: #dc2626;">🗑️</button>
          <span class="accordion-icon">▼</span>
        </div>
      </div>
      <div class="parts-list">
        ${partsHTML || '<p style="color:#94a3b8; font-size:0.78rem; text-align:center; padding: 6px 0;">لا توجد قطع مضافة لهذا الموديل</p>'}
      </div>
    `;

    modelsList.appendChild(card);
  });

  renderLogs();
}

render();
