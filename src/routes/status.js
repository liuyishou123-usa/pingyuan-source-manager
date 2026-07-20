const express = require('express');
const router = express.Router();
const db = require('../db');
const scheduler = require('../scheduler');
const logger = require('../utils/logger');

// 获取系统状态
router.get('/', async (req, res) => {
  try {
    const sources = await db.all('SELECT COUNT(*) as count FROM sources');
    const videos = await db.all('SELECT COUNT(*) as count FROM videos');
    const jobs = scheduler.getJobStatus();
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        totalSources: sources[0]?.count || 0,
        totalVideos: videos[0]?.count || 0,
        activeJobs: jobs.length,
        scheduledJobs: jobs
      }
    });
  } catch (err) {
    logger.error('获取系统状态失败', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
