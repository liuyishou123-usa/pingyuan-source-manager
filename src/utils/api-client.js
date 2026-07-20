const axios = require('axios');
const logger = require('./logger');

const timeout = parseInt(process.env.API_TIMEOUT || '10000');
const maxRetries = parseInt(process.env.MAX_RETRIES || '3');

const apiClient = axios.create({
  timeout: timeout,
  headers: {
    'User-Agent': 'Pingyuan-Source-Manager/1.0'
  }
});

// 重试逻辑
const fetchWithRetry = async (url, retries = 0) => {
  try {
    logger.debug(`📡 请求 API: ${url}`);
    const response = await apiClient.get(url);
    
    if (!response.data) {
      throw new Error('API 返回空数据');
    }
    
    logger.debug(`✅ API 响应成功: ${url}`);
    return response.data;
  } catch (err) {
    if (retries < maxRetries) {
      logger.warn(`⚠️ API 请求失败，进行第 ${retries + 1} 次重试: ${url}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
      return fetchWithRetry(url, retries + 1);
    } else {
      logger.error(`❌ API 请求失败 (已重试 ${maxRetries} 次): ${url}`);
      throw err;
    }
  }
};

module.exports = {
  fetch: fetchWithRetry,
  client: apiClient
};
