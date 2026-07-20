const express = require('express');
const router = express.Router();
const sourceController = require('../controllers/sourceController');
const logger = require('../utils/logger');

// 获取所有视频源
router.get('/', async (req, res) => {
  try {
    const sources = await sourceController.getAllSources();
    res.json({
      success: true,
      data: sources,
      count: sources.length
    });
  } catch (err) {
    logger.error('获取视频源列表失败', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 创建新的视频源
router.post('/', async (req, res) => {
  try {
    const source = await sourceController.createSource(req.body);
    res.status(201).json({
      success: true,
      data: source,
      message: '视频源已创建'
    });
  } catch (err) {
    logger.error('创建视频源失败', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 获取单个视频源
router.get('/:id', async (req, res) => {
  try {
    const source = await sourceController.getSource(req.params.id);
    if (!source) {
      return res.status(404).json({ success: false, error: '视频源不存在' });
    }
    res.json({ success: true, data: source });
  } catch (err) {
    logger.error('获取视频源失败', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 更新视频源
router.put('/:id', async (req, res) => {
  try {
    await sourceController.updateSource(req.params.id, req.body);
    const updated = await sourceController.getSource(req.params.id);
    res.json({
      success: true,
      data: updated,
      message: '视频源已更新'
    });
  } catch (err) {
    logger.error('更新视频源失败', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 删除视频源
router.delete('/:id', async (req, res) => {
  try {
    await sourceController.deleteSource(req.params.id);
    res.json({
      success: true,
      message: '视频源已删除'
    });
  } catch (err) {
    logger.error('删除视频源失败', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 手动触发更新
router.post('/:id/update', async (req, res) => {
  try {
    const result = await sourceController.updateSource(req.params.id);
    res.json({
      success: true,
      data: result,
      message: '更新已完成'
    });
  } catch (err) {
    logger.error('更新视频源失败', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 获取视频源的视频列表
router.get('/:id/videos', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const videos = await sourceController.getSourceVideos(req.params.id, limit, offset);
    res.json({
      success: true,
      data: videos,
      count: videos.length
    });
  } catch (err) {
    logger.error('获取视频列表失败', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 获取更新历史
router.get('/:id/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await sourceController.getUpdateHistory(req.params.id, limit);
    res.json({
      success: true,
      data: history,
      count: history.length
    });
  } catch (err) {
    logger.error('获取更新历史失败', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 切换启用/禁用
router.post('/:id/toggle', async (req, res) => {
  try {
    const result = await sourceController.toggleSource(req.params.id);
    const source = await sourceController.getSource(req.params.id);
    res.json({
      success: true,
      data: source,
      message: result.enabled ? '视频源已启用' : '视频源已禁用'
    });
  } catch (err) {
    logger.error('切换视频源状态失败', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
