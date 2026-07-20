const schedule = require('node-schedule');
const logger = require('./utils/logger');
const sourceController = require('./controllers/sourceController');
const db = require('./db');

const scheduledJobs = {};

// 初始化定时任务
const initScheduler = async () => {
  try {
    const sources = await db.all('SELECT * FROM sources WHERE enabled = 1');
    logger.info(`🔍 初始化定时任务，找到 ${sources.length} 个启用的数据源`);
    
    sources.forEach(source => {
      scheduleSource(source);
    });
  } catch (err) {
    logger.error('初始化定时任务失败:', err);
  }
};

// 为单个数据源安排定时任务
const scheduleSource = (source) => {
  // 取消之前的任务
  if (scheduledJobs[source.id]) {
    scheduledJobs[source.id].cancel();
    logger.info(`❌ 取消任务: ${source.name}`);
  }

  // 创建新的定时任务
  const cron = source.updateInterval || '0 */6 * * *';
  
  try {
    scheduledJobs[source.id] = schedule.scheduleJob(cron, async () => {
      logger.info(`⏰ 触发更新: ${source.name}`);
      try {
        const result = await sourceController.updateSource(source.id);
        logger.info(`✅ 更新完成: ${source.name} - 获取 ${result.videoCount} 条视频`);
      } catch (err) {
        logger.error(`❌ 更新失败: ${source.name} - ${err.message}`);
      }
    });
    
    logger.info(`✅ 已排程: ${source.name} (${cron})`);
  } catch (err) {
    logger.error(`排程失败: ${source.name} - ${err.message}`);
  }
};

// 取消任务
const cancelSchedule = (sourceId) => {
  if (scheduledJobs[sourceId]) {
    scheduledJobs[sourceId].cancel();
    delete scheduledJobs[sourceId];
    logger.info(`❌ 任务已取消: ID ${sourceId}`);
  }
};

// 重新调度所有任务
const rescheduleAll = async () => {
  logger.info('🔄 重新调度所有任务...');
  
  // 取消所有现有任务
  Object.keys(scheduledJobs).forEach(key => {
    scheduledJobs[key].cancel();
    delete scheduledJobs[key];
  });
  
  // 重新初始化
  await initScheduler();
};

module.exports = {
  initScheduler,
  scheduleSource,
  cancelSchedule,
  rescheduleAll,
  getJobStatus: () => Object.keys(scheduledJobs)
};
