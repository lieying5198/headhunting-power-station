/**
 * 管理员功能模块
 */

const db = require('./database');
const reward = require('./reward');

class AdminService {
  /**
   * 处理管理员命令
   */
  async handle(action, params) {
    const actions = {
      'members': this.listMembers.bind(this),
      'member': this.getMember.bind(this),
      'earnings': this.getEarningsReport.bind(this),
      'withdrawals': this.listWithdrawals.bind(this),
      'approve': this.approveWithdrawal.bind(this),
      'reject': this.rejectWithdrawal.bind(this),
      'leaderboard': this.getLeaderboard.bind(this),
      'stats': this.getStats.bind(this)
    };

    const handler = actions[action];
    if (!handler) {
      return {
        success: false,
        error: '未知操作',
        available: Object.keys(actions)
      };
    }

    return await handler(params);
  }

  /**
   * 列出所有会员
   */
  async listMembers(params) {
    const { page = 1, limit = 20, level } = this.parseParams(params);
    
    const result = await db.getUsersPaginated(page, limit);
    
    let users = result.data;
    if (level) {
      users = users.filter(u => u.level === level);
    }

    return {
      success: true,
      type: 'admin_members',
      page: result.page,
      total: result.total,
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        phone: this.maskPhone(u.phone),
        wechat: u.wechat,
        level: u.level,
        level_name: this.getLevelName(u.level),
        total_spent: u.total_spent,
        total_referrals: u.total_referrals,
        total_earnings: u.total_earnings,
        withdrawable: u.withdrawable,
        created_at: u.created_at
      }))
    };
  }

  /**
   * 查看单个会员详情
   */
  async getMember(params) {
    const { phone } = this.parseParams(params);
    
    const user = await db.findUserByPhone(phone);
    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    const networkValue = await reward.calculateNetworkValue(user.id);
    const transactions = await db.getTransactionsByUserId(user.id);
    const withdrawals = await db.getWithdrawalsByUserId(user.id);

    return {
      success: true,
      type: 'admin_member_detail',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        wechat: user.wechat,
        level: user.level,
        level_name: this.getLevelName(user.level),
        referrer_id: user.referrer_id,
        referral_code: user.referral_code,
        total_spent: user.total_spent,
        total_referrals: user.total_referrals,
        total_earnings: user.total_earnings,
        withdrawable: user.withdrawable,
        pending_earnings: user.pending_earnings || 0,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      network: networkValue,
      recent_transactions: transactions.slice(0, 10),
      recent_withdrawals: withdrawals.slice(0, 10)
    };
  }

  /**
   * 收益报告
   */
  async getEarningsReport(params) {
    const stats = await db.stats.getOverview();

    const allTransactions = await db.getAllTransactions();
    const confirmedTx = allTransactions.filter(t => t.status === 'confirmed');
    const pendingTx = allTransactions.filter(t => t.status === 'pending');

    // 按月统计
    const monthlyStats = {};
    confirmedTx.forEach(tx => {
      const month = tx.created_at.split('T')[0].substring(0, 7);
      if (!monthlyStats[month]) {
        monthlyStats[month] = { revenue: 0, commission: 0, count: 0 };
      }
      monthlyStats[month].commission += tx.amount;
      monthlyStats[month].count += 1;
    });

    return {
      success: true,
      type: 'admin_earnings',
      overview: {
        total_revenue: stats.revenue.total,
        total_commission: stats.commissions.total,
        pending_commission: stats.commissions.pending,
        withdrawn: stats.commissions.withdrawn
      },
      breakdown: stats.revenue,
      monthly: monthlyStats,
      topEarners: await reward.getLeaderboard(10)
    };
  }

  /**
   * 提现申请列表
   */
  async listWithdrawals(params) {
    const { status = 'pending' } = this.parseParams(params);
    
    const all = await db.getAllWithdrawals();
    const filtered = status === 'all' 
      ? all 
      : all.filter(w => w.status === status);

    return {
      success: true,
      type: 'admin_withdrawals',
      status,
      withdrawals: filtered.map(w => ({
        id: w.id,
        user_id: w.user_id,
        user_name: w.user_name,
        user_wechat: w.user_wechat,
        amount: w.amount,
        status: w.status,
        created_at: w.created_at,
        processed_at: w.processed_at
      }))
    };
  }

  /**
   * 审批提现
   */
  async approveWithdrawal(params) {
    const { id } = this.parseParams(params);
    
    const withdrawal = await db.updateWithdrawal(id, {
      status: 'approved',
      processed_at: new Date()
    });

    if (!withdrawal) {
      return { success: false, error: '提现记录不存在' };
    }

    return {
      success: true,
      message: '提现已批准',
      withdrawal: {
        id: withdrawal.id,
        status: 'approved',
        user_wechat: withdrawal.user_wechat,
        amount: withdrawal.amount
      }
    };
  }

  /**
   * 拒绝提现
   */
  async rejectWithdrawal(params) {
    const { id, reason } = this.parseParams(params);
    
    const withdrawal = await db.updateWithdrawal(id, {
      status: 'rejected',
      reason: reason || '未说明原因',
      processed_at: new Date()
    });

    if (!withdrawal) {
      return { success: false, error: '提现记录不存在' };
    }

    // 返还冻结金额
    const user = await db.getUserById(withdrawal.user_id);
    await db.updateUser(user.id, {
      withdrawable: user.withdrawable + withdrawal.amount,
      frozen_amount: Math.max(0, (user.frozen_amount || 0) - withdrawal.amount)
    });

    return {
      success: true,
      message: '提现已拒绝，金额已返还',
      withdrawal: {
        id: withdrawal.id,
        status: 'rejected',
        reason: withdrawal.reason
      }
    };
  }

  /**
   * 分销排行榜
   */
  async getLeaderboard(params) {
    const { type = 'earnings', limit = 10 } = this.parseParams(params);
    
    let leaderboard;
    
    if (type === 'referrals') {
      const users = await db.getAllUsers();
      leaderboard = users
        .filter(u => u.total_referrals > 0)
        .sort((a, b) => b.total_referrals - a.total_referrals)
        .slice(0, limit)
        .map((u, i) => ({
          rank: i + 1,
          name: this.maskName(u.name),
          referrals: u.total_referrals,
          level: u.level
        }));
    } else {
      leaderboard = await reward.getLeaderboard(limit);
    }

    return {
      success: true,
      type: 'admin_leaderboard',
      leaderboard
    };
  }

  /**
   * 统计数据概览
   */
  async getStats(params) {
    const stats = await db.stats.getOverview();
    
    return {
      success: true,
      type: 'admin_stats',
      overview: stats
    };
  }

  // ========== 工具方法 ==========

  parseParams(params) {
    if (typeof params === 'string') {
      const obj = {};
      params.split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        obj[key] = value;
      });
      return obj;
    }
    return params || {};
  }

  maskPhone(phone) {
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }

  maskName(name) {
    if (name.length <= 2) return name[0] + '*';
    return name[0] + '*'.repeat(name.length - 1);
  }

  getLevelName(levelId) {
    const names = {
      free: '免费版',
      monthly: '月卡会员',
      yearly: '年卡会员',
      lifetime: '终身会员'
    };
    return names[levelId] || levelId;
  }
}

module.exports = new AdminService();
