// 标签页切换
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // 移除所有活跃状态
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // 添加当前活跃状态
    tab.classList.add('active');
    const tabName = tab.getAttribute('data-tab');
    document.getElementById(tabName).classList.add('active');
    
    // 加载对应内容
    if (tabName === 'sources') loadSources();
    if (tabName === 'status') loadStatus();
  });
});

// 初始化
window.addEventListener('load', () => {
  loadSources();
  loadStatus();
});

// 加载视频源列表
async function loadSources() {
  try {
    const response = await fetch('/api/sources');
    const result = await response.json();
    
    if (result.success) {
      displaySources(result.data);
    } else {
      showError('加载失败: ' + result.error);
    }
  } catch (err) {
    showError('加载视频源失败: ' + err.message);
  }
}

// 显示视频源卡片
function displaySources(sources) {
  const container = document.getElementById('sourcesList');
  
  if (sources.length === 0) {
    container.innerHTML = '<p class="loading">暂无视频源，请添加一个</p>';
    return;
  }
  
  container.innerHTML = sources.map(source => `
    <div class="source-card">
      <h3>${escapeHtml(source.name)}</h3>
      <div class="url">${escapeHtml(source.url)}</div>
      
      <div>
        <span class="status ${source.enabled ? 'enabled' : 'disabled'}">
          ${source.enabled ? '✅ 已启用' : '⏸️ 已禁用'}
        </span>
        <span class="status ${source.lastStatus === 'success' ? 'success' : source.lastStatus === 'error' ? 'error' : 'disabled'}">
          ${source.lastStatus === 'success' ? '✅ 成功' : source.lastStatus === 'error' ? '❌ 失败' : '⏳ 待更新'}
        </span>
      </div>
      
      <div class="info">
        <span>📅 最后更新: ${source.lastUpdated ? new Date(source.lastUpdated).toLocaleString('zh-CN') : '未更新'}</span>
        ${source.errorMessage ? `<span style="color: #f56565;">❌ ${escapeHtml(source.errorMessage)}</span>` : ''}
      </div>
      
      <div class="actions">
        <button class="btn btn-primary btn-small" onclick="viewDetails(${source.id})">👁️ 详情</button>
        <button class="btn btn-success btn-small" onclick="updateSource(${source.id})">🔄 更新</button>
        <button class="btn btn-primary btn-small" onclick="toggleSource(${source.id})">${source.enabled ? '⏸️' : '▶️'}</button>
        <button class="btn btn-danger btn-small" onclick="deleteSource(${source.id})">🗑️ 删除</button>
      </div>
    </div>
  `).join('');
}

// 查看详情
async function viewDetails(id) {
  try {
    const [sourceResp, videoResp, historyResp] = await Promise.all([
      fetch(`/api/sources/${id}`),
      fetch(`/api/sources/${id}/videos?limit=5`),
      fetch(`/api/sources/${id}/history?limit=10`)
    ]);
    
    const source = await sourceResp.json();
    const videos = await videoResp.json();
    const history = await historyResp.json();
    
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    
    content.innerHTML = `
      <h2>${escapeHtml(source.data.name)}</h2>
      
      <h3>基本信息</h3>
      <table style="width: 100%; margin-bottom: 20px;">
        <tr><td><strong>URL:</strong></td><td>${escapeHtml(source.data.url)}</td></tr>
        <tr><td><strong>状态:</strong></td><td>${source.data.enabled ? '✅ 已启用' : '⏸️ 已禁用'}</td></tr>
        <tr><td><strong>更新间隔:</strong></td><td>${escapeHtml(source.data.updateInterval)}</td></tr>
        <tr><td><strong>创建时间:</strong></td><td>${new Date(source.data.createdAt).toLocaleString('zh-CN')}</td></tr>
      </table>
      
      <h3>最新视频 (前5个)</h3>
      ${videos.data.length > 0 ? `
        <ul style="margin-bottom: 20px;">
          ${videos.data.map(v => `<li>${escapeHtml(v.title || 'N/A')}</li>`).join('')}
        </ul>
      ` : '<p>暂无视频</p>'}
      
      <h3>更新历史 (最近10次)</h3>
      <table style="width: 100%;">
        <tr><th>时间</th><th>状态</th><th>视频数</th><th>耗时(ms)</th></tr>
        ${history.data.map(h => `
          <tr>
            <td>${new Date(h.timestamp).toLocaleString('zh-CN')}</td>
            <td>${h.status === 'success' ? '✅' : '❌'}</td>
            <td>${h.videoCount}</td>
            <td>${h.executionTime}</td>
          </tr>
        `).join('')}
      </table>
    `;
    
    modal.classList.add('show');
  } catch (err) {
    showError('加载详情失败: ' + err.message);
  }
}

// 手动更新
async function updateSource(id) {
  try {
    const response = await fetch(`/api/sources/${id}/update`, { method: 'POST' });
    const result = await response.json();
    
    if (result.success) {
      showSuccess(`更新完成！获取 ${result.data.videoCount} 条视频`);
      loadSources();
    } else {
      showError('更新失败: ' + result.error);
    }
  } catch (err) {
    showError('更新失败: ' + err.message);
  }
}

// 删除视频源
async function deleteSource(id) {
  if (!confirm('确定要删除此视频源吗？')) return;
  
  try {
    const response = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
    const result = await response.json();
    
    if (result.success) {
      showSuccess('视频源已删除');
      loadSources();
    } else {
      showError('删除失败: ' + result.error);
    }
  } catch (err) {
    showError('删除失败: ' + err.message);
  }
}

// 切换启用/禁用
async function toggleSource(id) {
  try {
    const response = await fetch(`/api/sources/${id}/toggle`, { method: 'POST' });
    const result = await response.json();
    
    if (result.success) {
      showSuccess(result.message);
      loadSources();
    } else {
      showError('操作失败: ' + result.error);
    }
  } catch (err) {
    showError('操作失败: ' + err.message);
  }
}

// 加载系统状态
async function loadStatus() {
  try {
    const response = await fetch('/api/status');
    const result = await response.json();
    
    if (result.success) {
      const data = result.data;
      document.getElementById('statusInfo').innerHTML = `
        <div class="status-card">
          <div class="label">📺 总视频源数</div>
          <div class="value">${data.totalSources}</div>
        </div>
        <div class="status-card">
          <div class="label">🎬 总视频数</div>
          <div class="value">${data.totalVideos}</div>
        </div>
        <div class="status-card">
          <div class="label">⚙️ 活跃任务</div>
          <div class="value">${data.activeJobs}</div>
        </div>
        <div class="status-card">
          <div class="label">🕐 系统时间</div>
          <div class="value" style="font-size: 1em;">${new Date(data.timestamp).toLocaleString('zh-CN')}</div>
        </div>
      `;
    }
  } catch (err) {
    console.error('加载状态失败:', err);
  }
}

// 表单提交
document.getElementById('addSourceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = {
    name: document.getElementById('name').value,
    url: document.getElementById('url').value,
    updateInterval: document.getElementById('updateInterval').value || '0 */6 * * *',
    enabled: document.getElementById('enabled').checked
  };
  
  try {
    const response = await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('视频源已创建！');
      document.getElementById('addSourceForm').reset();
      loadSources();
    } else {
      showError('创建失败: ' + result.error);
    }
  } catch (err) {
    showError('创建失败: ' + err.message);
  }
});

// 模态框
function closeModal() {
  document.getElementById('detailModal').classList.remove('show');
}

window.addEventListener('click', (e) => {
  const modal = document.getElementById('detailModal');
  if (e.target === modal) modal.classList.remove('show');
});

// 通知函数
function showSuccess(msg) {
  alert('✅ ' + msg);
}

function showError(msg) {
  alert('❌ ' + msg);
}

// HTML转义
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
