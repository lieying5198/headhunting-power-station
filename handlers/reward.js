/**
 * 分销奖励系统
 * 处理多级分销佣金的计算和发放
 */

const db = require('./database');
const notification = require('./notification');

class RewardSystem {
  constructor() {
    // 分销奖励配置
    this.config = {
      levels: [
        { level: 1, rate: 0.20, name: '一级推荐' },
        { level: 2, rate: 0.05, name: '二级推荐' }
      ],
      minWithdraw: 100,
      settlementCycle: 'monthly',
      processingFee: 0 // 平台不收取手续费
    };

    // 套餐价格映射
    this.planPrices = {
      monthly: 99,
      yearly: 599,
      lifetime: 1999
    };
  }

  /**
   * 处理购买奖励
   * @param {string} buyerId - 购买用户ID
   * @param {string|null} referrerId - 推荐人ID
   * @param {number} amount - 支付金额
   */
  async processPurchaseReward(buyerId, referrerId, amount) {
    if (!referrerId) return;

    const buyer = await db.getUserById(buyerId);
    if (!buyer) return;

    // 获取购买者的上线（可能是一级或二级推荐人）
    const referrer = await db.getUserById(referrerId);
    if (!referrer) return;

    // 计算并发放一级奖励
    const level1Reward = Math.round(amount * this.config.levels[0].rate * 100) / 100;
    await this.creditReward(referrer.id, {
      type: 'level1_purchase',
      level: 1,
      source_user_id: buyerId,
      source_user_name: buyer.name,
      amount: level1Reward,
      purchase_amount: amount,
      level_name: this.getLevelName(buyer.level)
    });

    // 计算并发放二级奖励
    if (referrer.referrer_id) {
      const level2Referrer = await db.getUserById(referrer.referrer_id);
      if (level2Referrer) {
        const level2Reward = Math.round(amount * this.config.levels[1].rate * 100) / 100;
        await this.creditReward(level2Referrer.id, {
          type: 'level2_purchase',
          level: 2,
          source_user_id: buyerId,
          source_user_name: buyer.name,
          referrer_id: referrerId,
          referrer_name: referrer.name,
          amount: level2Reward,
          purchase_amount: amount,
          level_name: this.getLevelName(buyer.level)
        });
      }
    }
  }

  /**
   * 处理注册奖励（可选）
   * @param {string} referrerId - 推荐人ID
   * @param {string} newUserId - 新用户ID
   */
  async processRegistrationReward(referrerId, newUserId) {
    const REGISTRATION_BONUS = 0; // 注册暂无奖励
    
    if (REGISTRATION_BONUS > 0 && referrerId) {
      const referrer = await db.getUserById(referrerId);
      if (referrer) {
        await this.creditReward(referrerId, {
          type: 'registration',
          level: 1,
          source_user_id: newUserId,
          amount: REGISTRATION_BONUS
        });
      }
    }
  }

  /**
   * 发放奖励
   * @param {string} userId - 获奖用户ID
   * @param {Object} rewardData - 奖励数据
   */
  async creditReward(userId, rewardData) {
    const transaction = {
      id: this.generateId(),
      user_id: userId,
      type: rewardData.type,
      level: rewardData.level,
      source_user_id: rewardData.source_user_id,
      source_user_name: rewardData.source_user_name || '系统',
      amount: rewardData.amount,
      status: 'pending', // 待确认
      created_at: new Date()
    };

    // 记录交易
    await db.createTransaction(transaction);

    // 更新用户可提现余额
    const user = await db.getUserById(userId);
    await db.updateUser(userId, {
      total_earnings: user.total_earnings + rewardData.amount,
      withdrawable: user.withdrawable + rewardData.amount,
      pending_earnings: (user.pending_earnings || 0) + rewardData.amount
    });

    // 发送通知
    await notification.sendRewardCredited(userId, transaction);

    return transaction;
  }

  /**
   * 确认交易（从待确认变为已确认）
   * @param {string} transactionId - 交易ID
   */
  async confirmTransaction(transactionId) {
    const transaction = await db.getTransactionById(transactionId);
    if (!transaction || transaction.status !== 'pending') {
      return false;
    }

    await db.updateTransaction(transactionId, { status: 'confirmed' });

    // 从待确认余额移到可提现余额
    const user = await db.getUserById(transaction.user_id);
    await db.updateUser(transaction.user_id, {
      pending_earnings: Math.max(0, (user.pending_earnings || 0) - transaction.amount)
    });

    return true;
  }

  /**
   * 计算用户推荐网络的总收益潜力
   * @param {string} userId - 用户ID
   * @returns {Object} 收益统计
   */
  async calculateNetworkValue(userId) {
    const user = await db.getUserById(userId);
    if (!user) return null;

    // 获取一级推荐人
    const level1Referrals = await db.getReferralsByUserId(userId);
    
    // 获取二级推荐人
    let level2Referrals = [];
    for (const ref of level1Referrals) {
      const subRefs = await db.getReferralsByUserId(ref.id);
      level2Referrals = [...level2Referrals, ...subRefs];
    }

    // 计算已转化（一级推荐中付费的）
    const level1Paid = level1Referrals.filter(r => r.level !== 'free');
    const level2Paid = level2Referrals.filter(r => r.level !== 'free');

    // 计算潜在收益
    const currentEarnings = user.total_earnings;
    const potentialFromLevel1 = level1Paid.reduce((sum, r) => {
      return sum + (this.planPrices[r.level] || 0) * this.config.levels[0].rate;
    }, 0);
    const potentialFromLevel2 = level2Paid.reduce((sum, r) => {
      return sum + (this.planPrices[r.level] || 0) * this.config.levels[1].rate;
    }, 0);

    return {
      current: currentEarnings,
      level1: {
        total: level1Referrals.length,
        paid: level1Paid.length,
        potential: Math.round(potentialFromLevel1 * 100) / 100
      },
      level2: {
        total: level2Referrals.length,
        paid: level2Paid.length,
        potential: Math.round(potentialFromLevel2 * 100) / 100
      },
      totalPotential: Math.round((currentEarnings + potentialFromLevel1 + potentialFromLevel2) * 100) / 100
    };
  }

  /**
   * 生成推荐链接/二维码内容
   * @param {string} referralCode - 推荐码
   * @param {string} baseUrl - 基础URL
   * @returns {Object} 推荐信息
   */
  generateReferralLink(referralCode, baseUrl = 'https://skill.example.com/register') {
    return {
      code: referralCode,
      link: `${baseUrl}?ref=${referralCode}`,
      qr_data: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${baseUrl}?ref=${referralCode}`)}`,
      share_text: `推荐码：${referralCode}，注册时填写可享9折优惠！`
    };
  }

  /**
   * 获取奖励排行榜
   * @param {number} limit - 返回数量
   * @returns {Array} 排行榜
   */
  async getLeaderboard(limit = 10) {
    const topEarners = await db.getTopEarners(limit);
    
    return topEarners.map((user, index) => ({
      rank: index + 1,
      name: user.name.substring(0, 1) + '***',
      total_earnings: user.total_earnings,
      total_referrals: user.total_referrals,
      level: user.level
    }));
  }

  /**
   * 月度结算（定时任务）
   * 将待确认收益转为可提现
   */
  async monthlySettlement() {
    const pendingTransactions = await db.getPendingTransactions();
    const confirmedThisMonth = [];

    for (const tx of pendingTransactions) {
      // 检查是否过了冷却期（例如7天）
      const createdAt = new Date(tx.created_at);
      const now = new Date();
      const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24);

      if (daysSinceCreation >= 7) {
        await this.confirmTransaction(tx.id);
        confirmedThisMonth.push(tx);
      }
    }

    return {
      processed: confirmedThisMonth.length,
      transactions: confirmedThisMonth
    };
  }

  // ========== 工具方法 ==========

  generateId() {
    return 'TX' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6).toUpperCase();
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

module.exports = new RewardSystem();
