const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/sources.db');
const dbDir = path.dirname(dbPath);

// 确保数据库目录存在
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('数据库连接失败:', err);
  } else {
    logger.info('✅ 数据库连接成功');
  }
});

// 初始化数据库表
const init = () => {
  db.serialize(() => {
    // 视频源 API 表
    db.run(`
      CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 1,
        updateInterval TEXT DEFAULT '0 */6 * * *',
        lastUpdated DATETIME,
        lastStatus TEXT DEFAULT 'pending',
        errorMessage TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) logger.error('创建 sources 表失败:', err);
      else logger.info('✅ sources 表已就绪');
    });

    // 视频数据表
    db.run(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sourceId INTEGER NOT NULL,
        videoId TEXT,
        title TEXT,
        url TEXT,
        thumbnail TEXT,
        duration INTEGER,
        description TEXT,
        releaseDate DATETIME,
        rawData TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sourceId) REFERENCES sources(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) logger.error('创建 videos 表失败:', err);
      else logger.info('✅ videos 表已就绪');
    });

    // 更新历史表
    db.run(`
      CREATE TABLE IF NOT EXISTS updateHistory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sourceId INTEGER NOT NULL,
        status TEXT,
        videoCount INTEGER,
        errorMessage TEXT,
        executionTime INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sourceId) REFERENCES sources(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) logger.error('创建 updateHistory 表失败:', err);
      else logger.info('✅ updateHistory 表已就绪');
    });
  });
};

// 辅助函数
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

module.exports = {
  db,
  init,
  run,
  get,
  all
};
