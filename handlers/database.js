/**
 * 数据库模块 - 使用JSON文件存储（演示用）
 * 生产环境应替换为真实数据库
 */

const fs = require('fs');
const path = require('path');

// 模拟数据库存储路径
const DATA_DIR = path.join(__dirname, '..', 'data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化数据文件
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');
const WITHDRAWALS_FILE = path.join(DATA_DIR, 'withdrawals.json');

// 初始化文件（如果不存在）
['users', 'transactions', 'withdrawals'].forEach(table => {
  const filePath = path.join(DATA_DIR, `${table}.json`);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }
});

// 读取数据
function readData(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return [];
  }
}

// 写入数据
function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ========== 用户操作 ==========

const users = {
  /**
   * 根据手机号查找用户
   */
  findUserByPhone: async (phone) => {
    const data = readData(USERS_FILE);
    return data.find(u => u.phone === phone) || null;
  },

  /**
   * 根据ID查找用户
   */
  getUserById: async (id) => {
    const data = readData(USERS_FILE);
    return data.find(u => u.id === id) || null;
  },

  /**
   * 创建用户
   */
  createUser: async (user) => {
    const data = readData(USERS_FILE);
    data.push(user);
    writeData(USERS_FILE, data);
    return user;
  },

  /**
   * 更新用户信息
   */
  updateUser: async (id, updates) => {
    const data = readData(USERS_FILE);
    const index = data.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    data[index] = { ...data[index], ...updates, updated_at: new Date() };
    writeData(USERS_FILE, data);
    return data[index];
  },

  /**
   * 获取用户的所有推荐人
   */
  getReferralsByUserId: async (userId) => {
    const data = readData(USERS_FILE);
    return data.filter(u => u.referrer_id === userId);
  },

  /**
   * 获取收益排行榜
   */
  getTopEarners: async (limit = 10) => {
    const data = readData(USERS_FILE);
    return data
      .sort((a, b) => b.total_earnings - a.total_earnings)
      .slice(0, limit);
  },

  /**
   * 获取所有用户
   */
  getAllUsers: async () => {
    return readData(USERS_FILE);
  },

  /**
   * 获取用户列表（分页）
   */
  getUsersPaginated: async (page = 1, limit = 20) => {
    const data = readData(USERS_FILE);
    const start = (page - 1) * limit;
    return {
      data: data.slice(start, start + limit),
      total: data.length,
      page,
      limit,
      totalPages: Math.ceil(data.length / limit)
    };
  }
};

// ========== 交易记录操作 ==========

const transactions = {
  /**
   * 创建交易记录
   */
  createTransaction: async (tx) => {
    const data = readData(TRANSACTIONS_FILE);
    data.push(tx);
    writeData(TRANSACTIONS_FILE, data);
    return tx;
  },

  /**
   * 根据ID获取交易
   */
  getTransactionById: async (id) => {
    const data = readData(TRANSACTIONS_FILE);
    return data.find(t => t.id === id) || null;
  },

  /**
   * 获取用户的交易记录
   */
  getTransactionsByUserId: async (userId) => {
    const data = readData(TRANSACTIONS_FILE);
    return data.filter(t => t.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /**
   * 获取待确认交易
   */
  getPendingTransactions: async () => {
    const data = readData(TRANSACTIONS_FILE);
    return data.filter(t => t.status === 'pending');
  },

  /**
   * 更新交易状态
   */
  updateTransaction: async (id, updates) => {
    const data = readData(TRANSACTIONS_FILE);
    const index = data.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    data[index] = { ...data[index], ...updates };
    writeData(TRANSACTIONS_FILE, data);
    return data[index];
  },

  /**
   * 获取所有交易（管理员用）
   */
  getAllTransactions: async () => {
    return readData(TRANSACTIONS_FILE);
  }
};

// ========== 提现记录操作 ==========

const withdrawals = {
  /**
   * 创建提现记录
   */
  createWithdrawal: async (withdrawal) => {
    const data = readData(WITHDRAWALS_FILE);
    data.push(withdrawal);
    writeData(WITHDRAWALS_FILE, data);
    return withdrawal;
  },

  /**
   * 获取用户的提现记录
   */
  getWithdrawalsByUserId: async (userId) => {
    const data = readData(WITHDRAWALS_FILE);
    return data.filter(w => w.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /**
   * 获取所有待处理提现申请
   */
  getPendingWithdrawals: async () => {
    const data = readData(WITHDRAWALS_FILE);
    return data.filter(w => w.status === 'pending')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },

  /**
   * 更新提现状态
   */
  updateWithdrawal: async (id, updates) => {
    const data = readData(WITHDRAWALS_FILE);
    const index = data.findIndex(w => w.id === id);
    if (index === -1) return null;
    
    data[index] = { ...data[index], ...updates, updated_at: new Date() };
    writeData(WITHDRAWALS_FILE, data);
    return data[index];
  },

  /**
   * 获取所有提现记录
   */
  getAllWithdrawals: async () => {
    return readData(WITHDRAWALS_FILE);
  }
};

// ========== 统计操作 ==========

const stats = {
  /**
   * 获取总体统计数据
   */
  getOverview: async () => {
    const users = readData(USERS_FILE);
    const transactions = readData(TRANSACTIONS_FILE);
    const withdrawals = readData(WITHDRAWALS_FILE);

    const paidUsers = users.filter(u => u.level !== 'free');
    const confirmedWithdrawals = withdrawals.filter(w => w.status === 'confirmed');

    return {
      users: {
        total: users.length,
        free: users.filter(u => u.level === 'free').length,
        monthly: users.filter(u => u.level === 'monthly').length,
        yearly: users.filter(u => u.level === 'yearly').length,
        lifetime: users.filter(u => u.level === 'lifetime').length,
        paid: paidUsers.length
      },
      revenue: {
        total: users.reduce((sum, u) => sum + (u.total_spent || 0), 0),
        fromMonthly: users
          .filter(u => u.level === 'monthly')
          .reduce((sum, u) => sum + 99, 0),
        fromYearly: users
          .filter(u => u.level === 'yearly')
          .reduce((sum, u) => sum + 599, 0),
        fromLifetime: users
          .filter(u => u.level === 'lifetime')
          .reduce((sum, u) => sum + 1999, 0)
      },
      commissions: {
        total: transactions
          .filter(t => t.status === 'confirmed')
          .reduce((sum, t) => sum + t.amount, 0),
        pending: transactions
          .filter(t => t.status === 'pending')
          .reduce((sum, t) => sum + t.amount, 0),
        withdrawn: confirmedWithdrawals
          .reduce((sum, w) => sum + w.amount, 0)
      }
    };
  }
};

module.exports = {
  ...users,
  ...transactions,
  ...withdrawals,
  stats
};
