/**
 * Pingyuan Source Manager - Cloudflare Workers Edition
 * 视频源管理系统 - 定时检查更新API
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 处理
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 路由处理
      if (path === '/api/sources' && request.method === 'GET') {
        return handleGetSources(env, corsHeaders);
      }
      if (path === '/api/sources' && request.method === 'POST') {
        return handleCreateSource(request, env, corsHeaders);
      }
      if (path.match(/^\/api\/sources\/\d+$/) && request.method === 'GET') {
        const id = path.split('/')[3];
        return handleGetSource(id, env, corsHeaders);
      }
      if (path.match(/^\/api\/sources\/\d+$/) && request.method === 'PUT') {
        const id = path.split('/')[3];
        return handleUpdateSource(id, request, env, corsHeaders);
      }
      if (path.match(/^\/api\/sources\/\d+$/) && request.method === 'DELETE') {
        const id = path.split('/')[3];
        return handleDeleteSource(id, env, corsHeaders);
      }
      if (path.match(/^\/api\/sources\/\d+\/update$/) && request.method === 'POST') {
        const id = path.split('/')[3];
        return handleManualUpdate(id, env, corsHeaders);
      }
      if (path === '/api/status' && request.method === 'GET') {
        return handleStatus(env, corsHeaders);
      }
      if (path === '/' || path === '/index.html') {
        return handleWebUI(corsHeaders);
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },

  async scheduled(event, env, ctx) {
    // 定时任务处理 - 检查并更新所有启用的视频源
    console.log('开始定时更新任务');
    
    try {
      const sources = await getAllSourcesFromKV(env);
      
      for (const source of sources) {
        if (source.enabled) {
          await updateSourceData(source, env);
        }
      }
      
      console.log('定时更新任务完成');
    } catch (error) {
      console.error('定时任务出错:', error);
    }
  },
};

/**
 * 获取所有视频源
 */
async function handleGetSources(env, corsHeaders) {
  try {
    const sources = await getAllSourcesFromKV(env);
    return new Response(JSON.stringify({
      success: true,
      data: sources,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

/**
 * 创建新的视频源
 */
async function handleCreateSource(request, env, corsHeaders) {
  try {
    const data = await request.json();
    
    if (!data.name || !data.url) {
      return new Response(JSON.stringify({ error: '名称和URL为必填项' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const sources = await getAllSourcesFromKV(env);
    const newId = Math.max(...sources.map(s => s.id), 0) + 1;
    
    const newSource = {
      id: newId,
      name: data.name,
      url: data.url,
      enabled: data.enabled !== false,
      updateInterval: data.updateInterval || '0 */6 * * *',
      lastUpdated: null,
      createdAt: new Date().toISOString(),
    };

    sources.push(newSource);
    await env.SOURCES_KV.put('sources', JSON.stringify(sources));

    return new Response(JSON.stringify({
      success: true,
      data: newSource,
    }), {
      status: 201,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

/**
 * 获取单个视频源
 */
async function handleGetSource(id, env, corsHeaders) {
  try {
    const sources = await getAllSourcesFromKV(env);
    const source = sources.find(s => s.id === parseInt(id));

    if (!source) {
      return new Response(JSON.stringify({ error: '视频源不存在' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: source,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

/**
 * 更新视频源
 */
async function handleUpdateSource(id, request, env, corsHeaders) {
  try {
    const data = await request.json();
    const sources = await getAllSourcesFromKV(env);
    const sourceIndex = sources.findIndex(s => s.id === parseInt(id));

    if (sourceIndex === -1) {
      return new Response(JSON.stringify({ error: '视频源不存在' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const updatedSource = {
      ...sources[sourceIndex],
      ...data,
      id: parseInt(id), // 防止修改 ID
      createdAt: sources[sourceIndex].createdAt, // 防止修改创建时间
    };

    sources[sourceIndex] = updatedSource;
    await env.SOURCES_KV.put('sources', JSON.stringify(sources));

    return new Response(JSON.stringify({
      success: true,
      data: updatedSource,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

/**
 * 删除视频源
 */
async function handleDeleteSource(id, env, corsHeaders) {
  try {
    const sources = await getAllSourcesFromKV(env);
    const filteredSources = sources.filter(s => s.id !== parseInt(id));

    if (filteredSources.length === sources.length) {
      return new Response(JSON.stringify({ error: '视频源不存在' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    await env.SOURCES_KV.put('sources', JSON.stringify(filteredSources));

    return new Response(JSON.stringify({
      success: true,
      message: '删除成功',
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

/**
 * 手动触发更新
 */
async function handleManualUpdate(id, env, corsHeaders) {
  try {
    const sources = await getAllSourcesFromKV(env);
    const source = sources.find(s => s.id === parseInt(id));

    if (!source) {
      return new Response(JSON.stringify({ error: '视频源不存在' }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    await updateSourceData(source, env);
    source.lastUpdated = new Date().toISOString();
    
    const sourceIndex = sources.findIndex(s => s.id === parseInt(id));
    sources[sourceIndex] = source;
    await env.SOURCES_KV.put('sources', JSON.stringify(sources));

    return new Response(JSON.stringify({
      success: true,
      message: '更新成功',
      data: source,
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

/**
 * 获取系统状态
 */
async function handleStatus(env, corsHeaders) {
  try {
    const sources = await getAllSourcesFromKV(env);
    const enabledCount = sources.filter(s => s.enabled).length;

    return new Response(JSON.stringify({
      success: true,
      data: {
        status: 'running',
        totalSources: sources.length,
        enabledSources: enabledCount,
        environment: 'Cloudflare Workers',
        timestamp: new Date().toISOString(),
      },
    }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

/**
 * 获取所有源（从 KV 存储）
 */
async function getAllSourcesFromKV(env) {
  try {
    const data = await env.SOURCES_KV.get('sources');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('读取 KV 存储出错:', error);
    return [];
  }
}

/**
 * 更新视频源数据
 */
async function updateSourceData(source, env) {
  try {
    console.log(`正在更新源: ${source.name}`);
    
    const response = await fetch(source.url, {
      method: 'GET',
      timeout: 10000,
    });

    if (!response.ok) {
      throw new Error(`API 返回状态码: ${response.status}`);
    }

    const data = await response.json();
    
    // 保存更新历史
    const history = await env.SOURCES_KV.get(`history_${source.id}`);
    const histories = history ? JSON.parse(history) : [];
    
    histories.push({
      timestamp: new Date().toISOString(),
      status: 'success',
      itemCount: Array.isArray(data) ? data.length : 1,
    });

    // 只保留最近 100 条历史记录
    if (histories.length > 100) {
      histories.shift();
    }

    await env.SOURCES_KV.put(`history_${source.id}`, JSON.stringify(histories));
    await env.SOURCES_KV.put(`data_${source.id}`, JSON.stringify(data));

    console.log(`源 ${source.name} 更新成功`);
    return true;
  } catch (error) {
    console.error(`源 ${source.name} 更新失败:`, error);
    
    // 记录失败历史
    const history = await env.SOURCES_KV.get(`history_${source.id}`);
    const histories = history ? JSON.parse(history) : [];
    
    histories.push({
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: error.message,
    });

    if (histories.length > 100) {
      histories.shift();
    }

    await env.SOURCES_KV.put(`history_${source.id}`, JSON.stringify(histories));
    return false;
  }
}

/**
 * Web 管理界面
 */
function handleWebUI(corsHeaders) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>品源管理系统 - Cloudflare Workers</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
    h1 { font-size: 28px; margin-bottom: 10px; }
    .subtitle { opacity: 0.9; font-size: 14px; }
    .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section h2 { font-size: 18px; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 5px; font-weight: 500; }
    input, textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: inherit; }
    button { background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; }
    button:hover { background: #5568d3; }
    .sources-list { display: grid; gap: 15px; }
    .source-card { border: 1px solid #ddd; padding: 15px; border-radius: 6px; background: #fafafa; }
    .source-card h3 { color: #667eea; margin-bottom: 10px; }
    .source-card p { font-size: 13px; color: #666; margin-bottom: 5px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 3px; font-size: 12px; margin-right: 5px; }
    .badge.enabled { background: #d4edda; color: #155724; }
    .badge.disabled { background: #f8d7da; color: #721c24; }
    .actions { margin-top: 10px; display: flex; gap: 10px; }
    .actions button { flex: 1; padding: 8px; font-size: 12px; }
    .status { padding: 15px; background: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px; }
    .error { background: #ffebee; border-left-color: #f44336; }
    .success { background: #e8f5e9; border-left-color: #4caf50; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🎬 品源管理系统</h1>
      <p class="subtitle">Cloudflare Workers Edition - 定时检查更新API</p>
    </header>

    <div class="section">
      <h2>系统状态</h2>
      <div id="status" class="status">加载中...</div>
    </div>

    <div class="section">
      <h2>添加新视频源</h2>
      <div class="form-group">
        <label>名称</label>
        <input type="text" id="sourceName" placeholder="例: 主要视频源">
      </div>
      <div class="form-group">
        <label>API URL</label>
        <input type="url" id="sourceUrl" placeholder="https://api.example.com/videos">
      </div>
      <div class="form-group">
        <label>更新间隔 (Cron 表达式)</label>
        <input type="text" id="sourceInterval" placeholder="0 */6 * * *" value="0 */6 * * *">
      </div>
      <button onclick="addSource()">添加视频源</button>
    </div>

    <div class="section">
      <h2>视频源列表</h2>
      <div id="sourcesList" class="sources-list">加载中...</div>
    </div>
  </div>

  <script>
    async function loadSources() {
      try {
        const response = await fetch('/api/sources');
        const result = await response.json();
        
        if (result.success) {
          const html = result.data.map(source => \`
            <div class="source-card">
              <h3>\${source.name}</h3>
              <p><strong>URL:</strong> \${source.url}</p>
              <p><strong>创建时间:</strong> \${new Date(source.createdAt).toLocaleString('zh-CN')}</p>
              <p><strong>最后更新:</strong> \${source.lastUpdated ? new Date(source.lastUpdated).toLocaleString('zh-CN') : '未更新'}</p>
              <div>
                <span class="badge \${source.enabled ? 'enabled' : 'disabled'}">
                  \${source.enabled ? '✓ 已启用' : '✗ 已禁用'}
                </span>
              </div>
              <div class="actions">
                <button onclick="updateSource(\${source.id})">更新</button>
                <button onclick="toggleSource(\${source.id}, \${!source.enabled})">
                  \${source.enabled ? '禁用' : '启用'}
                </button>
                <button onclick="deleteSource(\${source.id})" style="background:#f44336;">删除</button>
              </div>
            </div>
          \`).join('');
          
          document.getElementById('sourcesList').innerHTML = html || '<p>暂无视频源</p>';
        }
      } catch (error) {
        console.error('加载失败:', error);
        document.getElementById('sourcesList').innerHTML = '<div class="status error">加载失败: ' + error.message + '</div>';
      }
    }

    async function loadStatus() {
      try {
        const response = await fetch('/api/status');
        const result = await response.json();
        
        if (result.success) {
          document.getElementById('status').innerHTML = \`
            <strong>状态:</strong> \${result.data.status}<br>
            <strong>总视频源:</strong> \${result.data.totalSources}<br>
            <strong>启用的视频源:</strong> \${result.data.enabledSources}<br>
            <strong>更新时间:</strong> \${new Date(result.data.timestamp).toLocaleString('zh-CN')}
          \`;
        }
      } catch (error) {
        document.getElementById('status').innerHTML = '<div class="status error">状态加载失败</div>';
      }
    }

    async function addSource() {
      const name = document.getElementById('sourceName').value;
      const url = document.getElementById('sourceUrl').value;
      const interval = document.getElementById('sourceInterval').value;

      if (!name || !url) {
        alert('请填写所有必填项');
        return;
      }

      try {
        const response = await fetch('/api/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, url, updateInterval: interval, enabled: true })
        });

        if (response.ok) {
          alert('添加成功');
          document.getElementById('sourceName').value = '';
          document.getElementById('sourceUrl').value = '';
          loadSources();
        } else {
          alert('添加失败');
        }
      } catch (error) {
        alert('请求失败: ' + error.message);
      }
    }

    async function updateSource(id) {
      try {
        const response = await fetch(\`/api/sources/\${id}/update\`, { method: 'POST' });
        if (response.ok) {
          alert('更新成功');
          loadSources();
        } else {
          alert('更新失败');
        }
      } catch (error) {
        alert('请求失败: ' + error.message);
      }
    }

    async function toggleSource(id, enabled) {
      try {
        const response = await fetch(\`/api/sources/\${id}\`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled })
        });

        if (response.ok) {
          loadSources();
        } else {
          alert('操作失败');
        }
      } catch (error) {
        alert('请求失败: ' + error.message);
      }
    }

    async function deleteSource(id) {
      if (!confirm('确定要删除此视频源吗？')) return;

      try {
        const response = await fetch(\`/api/sources/\${id}\`, { method: 'DELETE' });
        if (response.ok) {
          alert('删除成功');
          loadSources();
        } else {
          alert('删除失败');
        }
      } catch (error) {
        alert('请求失败: ' + error.message);
      }
    }

    // 页面加载时获取数据
    loadStatus();
    loadSources();
    setInterval(loadStatus, 30000); // 每30秒刷新状态
    setInterval(loadSources, 30000); // 每30秒刷新列表
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
