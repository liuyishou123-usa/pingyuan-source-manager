const db = require('../db');
const apiClient = require('../utils/api-client');
const logger = require('../utils/logger');
const scheduler = require('../scheduler');

// 获取所有视频源
const getAllSources = async () => {
  return await db.all('SELECT * FROM sources ORDER BY createdAt DESC');
};

// 获取单个视频源
const getSource = async (id) => {
  return await db.get('SELECT * FROM sources WHERE id = ?', [id]);
};

// 创建视频源
const createSource = async (data) => {
  const { name, url, enabled = true, updateInterval = '0 */6 * * *' } = data;
  
  if (!name || !url) {
    throw new Error('名称和 URL 不能为空');
  }
  
  const result = await db.run(
    'INSERT INTO sources (name, url, enabled, updateInterval) VALUES (?, ?, ?, ?)',
    [name, url, enabled ? 1 : 0, updateInterval]
  );
  
  const newSource = await getSource(result.id);
  
  // 如果启用，立即排程
  if (enabled) {
    scheduler.scheduleSource(newSource);
  }
  
  logger.info(`✅ 创建视频源: ${name}`);
  return newSource;
};

// 更新视频源
const updateSource = async (id, data = null) => {
  const source = await getSource(id);
  if (!source) {
    throw new Error('视频源不存在');
  }
  
  // 如果有更新数据（来自 API 更新）
  if (data) {
    const { name, url, enabled, updateInterval } = data;
    await db.run(
      'UPDATE sources SET name = ?, url = ?, enabled = ?, updateInterval = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [name || source.name, url || source.url, enabled !== undefined ? enabled : source.enabled, updateInterval || source.updateInterval, id]
    );
    logger.info(`✅ 更新视频源配置: ${id}`);
  }
  
  // 从 API 获取数据
  const startTime = Date.now();
  let videoCount = 0;
  let status = 'success';
  let errorMessage = null;
  
  try {
    logger.info(`🔄 开始更新视频源: ${source.name} (${source.url})`);
    
    const apiData = await apiClient.fetch(source.url);
    
    // 将 API 返回的数据存储为视频
    // 这里假设 API 返回数组，可根据实际情况调整
    const videos = Array.isArray(apiData) ? apiData : apiData.data || [];
    
    for (const video of videos) {
      await db.run(
        `INSERT OR REPLACE INTO videos 
         (sourceId, videoId, title, url, thumbnail, description, rawData, createdAt, updatedAt) 
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          id,
          video.id || video.videoId,
          video.title || video.name,
          video.url || video.link,
          video.thumbnail || video.cover,
          video.description || video.desc,
          JSON.stringify(video)
        ]
      );
      videoCount++;
    }
    
    // 更新最后更新时间
    await db.run(
      'UPDATE sources SET lastUpdated = CURRENT_TIMESTAMP, lastStatus = ?, errorMessage = NULL WHERE id = ?',
      ['success', id]
    );
    
    logger.info(`✅ 视频源更新完成: ${source.name} - 获取 ${videoCount} 条视频`);
    
  } catch (err) {
    status = 'error';
    errorMessage = err.message;
    await db.run(
      'UPDATE sources SET lastStatus = ?, errorMessage = ? WHERE id = ?',
      ['error', errorMessage, id]
    );
    logger.error(`❌ 视频源更新失败: ${source.name} - ${errorMessage}`);
  }
  
  // 记录更新历史
  const executionTime = Date.now() - startTime;
  await db.run(
    'INSERT INTO updateHistory (sourceId, status, videoCount, errorMessage, executionTime) VALUES (?, ?, ?, ?, ?)',
    [id, status, videoCount, errorMessage, executionTime]
  );
  
  return { videoCount, status, errorMessage, executionTime };
};

// 删除视频源
const deleteSource = async (id) => {
  const source = await getSource(id);
  if (!source) {
    throw new Error('视频源不存在');
  }
  
  // 取消排程
  scheduler.cancelSchedule(id);
  
  // 删除关联数据
  await db.run('DELETE FROM videos WHERE sourceId = ?', [id]);
  await db.run('DELETE FROM updateHistory WHERE sourceId = ?', [id]);
  await db.run('DELETE FROM sources WHERE id = ?', [id]);
  
  logger.info(`✅ 删除视频源: ${source.name}`);
  return { message: '视频源已删除' };
};

// 获取视频源的视频列表
const getSourceVideos = async (id, limit = 100, offset = 0) => {
  return await db.all(
    'SELECT * FROM videos WHERE sourceId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
    [id, limit, offset]
  );
};

// 获取更新历史
const getUpdateHistory = async (id, limit = 50) => {
  return await db.all(
    'SELECT * FROM updateHistory WHERE sourceId = ? ORDER BY timestamp DESC LIMIT ?',
    [id, limit]
  );
};

// 切换启用/禁用
const toggleSource = async (id) => {
  const source = await getSource(id);
  if (!source) {
    throw new Error('视频源不存在');
  }
  
  const newEnabled = source.enabled ? 0 : 1;
  await db.run('UPDATE sources SET enabled = ? WHERE id = ?', [newEnabled, id]);
  
  if (newEnabled) {
    const updated = await getSource(id);
    scheduler.scheduleSource(updated);
    logger.info(`✅ 启用视频源: ${source.name}`);
  } else {
    scheduler.cancelSchedule(id);
    logger.info(`✅ 禁用视频源: ${source.name}`);
  }
  
  return { enabled: newEnabled === 1 };
};

module.exports = {
  getAllSources,
  getSource,
  createSource,
  updateSource,
  deleteSource,
  getSourceVideos,
  getUpdateHistory,
  toggleSource
};
