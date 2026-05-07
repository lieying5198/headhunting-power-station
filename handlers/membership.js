/**
 * 会员管理与分销系统 - 核心模块
 * Headhunting Power Station - Membership & Distribution System
 */

const db = require('./database');
const reward = require('./reward');
const notification = require('./notification');

class MembershipManager {
  constructor() {
    this.plans = {
      free: { id: 'free', name: '免费版', price: 0, daily_limit: 3 },
      monthly: { id: 'monthly', name: '月卡会员', price: 99, daily_limit: -1 },
      yearly: { id: 'yearly', name: '年卡会员', price: 599, daily_limit: -1 },
      lifetime: { id: 'lifetime', name: '终身会员', price: 1999, daily_limit: -1 }
    };
  }

  /**
   * 用户注册
   * @param {Object} userInfo - 用户信息
   * @returns {Object} 注册结果
   */
  async register(userInfo) {
    const { name, phone, wechat, referrer } = userInfo;
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return { success: false, error: '手机号格式不正确' };
    }

    // 检查手机号是否已注册
    const existing = await db.findUserByPhone(phone);
    if (existing) {
      return { success: false, error: '该手机号已注册' };
    }

    // 获取推荐人信息
    let referrerInfo = null;
    let referrerCode = null;
    if (referrer) {
      referrerInfo = await db.findUserByPhone(referrer);
      if (!referrerInfo) {
        return { success: false, error: '推荐人手机号不存在' };
      }
      referrerCode = referrerInfo.id;
    }

    // 生成用户ID和推荐码
    const userId = this.generateUserId();
    const myReferralCode = this.generateReferralCode();

    // 创建用户记录
    const user = {
      id: userId,
      name,
      phone,
      wechat,
      level: 'free',
      status: 'active',
      referrer_id: referrerCode,
      referral_code: myReferralCode,
      daily_usage: 0,
      last_usage_date: null,
      total_spent: 0,
      total_referrals: 0,
      total_earnings: 0,
      withdrawable: 0,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.createUser(user);

    // 处理推荐关系
    if (referrerInfo) {
      await db.updateUser(referrerInfo.id, {
        total_referrals: referrerInfo.total_referrals + 1
      });
    }

    return {
      success: true,
      user: {
        id: userId,
        name,
        phone,
        level: 'free',
        referral_code: myReferralCode
      },
      message: '注册成功！您已自动成为分销会员，可通过推荐链接获得佣金奖励。'
    };
  }

  /**
   * 用户升级/购买会员
   * @param {string} phone - 用户手机号
   * @param {string} plan - 套餐类型
   * @returns {Object} 升级结果
   */
  async upgrade(phone, plan) {
    const user = await db.findUserByPhone(phone);
    if (!user) {
      return { success: false, error: '用户不存在，请先注册' };
    }

    const planInfo = this.plans[plan];
    if (!planInfo) {
      return { success: false, error: '无效的套餐类型' };
    }

    if (plan === 'free') {
      return { success: false, error: '免费版无需升级' };
    }

    // 检查是否已购买更高等级
    const currentPlanIndex = ['monthly', 'yearly', 'lifetime'].indexOf(user.level);
    const newPlanIndex = ['monthly', 'yearly', 'lifetime'].indexOf(plan);
    if (newPlanIndex <= currentPlanIndex) {
      return { success: false, error: '您已拥有此套餐或更高级套餐' };
    }

    // 计算实际支付金额（如果有推荐人可能享受优惠）
    let actualPrice = planInfo.price;
    if (user.referrer_id) {
      actualPrice = Math.round(actualPrice * 0.9); // 推荐用户享9折
    }

    // ⚠️ 退款政策提示
    const refundNote = `【重要提醒】一经注册，不予退费。购买即表示您同意此条款，请根据自身需求谨慎购买。`;

    // 更新用户等级
    await db.updateUser(user.id, {
      level: plan,
      total_spent: user.total_spent + actualPrice,
      upgraded_at: new Date(),
      updated_at: new Date()
    });

    // 处理分销佣金
    await reward.processPurchaseReward(user.id, user.referrer_id, planInfo.price);

    // 发送通知
    await notification.sendUpgradeSuccess(user.phone, planInfo.name, actualPrice);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        level: plan,
        level_name: planInfo.name
      },
      payment: {
        method: '微信支付',
        qr_code: '请扫描微信支付二维码', // 实际集成时替换为真实二维码
        original_price: planInfo.price,
        actual_price: actualPrice,
        discount: planInfo.price - actualPrice
      },
      message: `恭喜升级为${planInfo.name}！${refundNote}`
    };
  }

  /**
   * 获取用户状态
   * @param {string} phone - 用户手机号
   * @returns {Object} 用户状态
   */
  async getStatus(phone) {
    const user = await db.findUserByPhone(phone);
    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    const planInfo = this.plans[user.level];
    const remaining = this.getRemainingUsage(user);

    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: this.maskPhone(user.phone),
        level: user.level,
        level_name: planInfo.name,
        member_since: user.created_at,
        daily_usage: user.daily_usage,
        remaining_daily: remaining
      }
    };
  }

  /**
   * 检查并重置每日使用次数
   * @param {Object} user - 用户对象
   * @returns {number} 剩余使用次数
   */
  getRemainingUsage(user) {
    const today = new Date().toDateString();
    const planInfo = this.plans[user.level];

    // 如果不是今天，重置计数
    if (user.last_usage_date !== today) {
      return planInfo.daily_limit;
    }

    // 免费版检查限额
    if (planInfo.daily_limit === -1) {
      return -1; // 无限
    }

    return Math.max(0, planInfo.daily_limit - user.daily_usage);
  }

  /**
   * 记录使用次数
   * @param {string} phone - 用户手机号
   * @returns {Object} 使用结果
   */
  async recordUsage(phone) {
    const user = await db.findUserByPhone(phone);
    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    const remaining = this.getRemainingUsage(user);
    const planInfo = this.plans[user.level];
    const today = new Date().toDateString();

    // 检查是否超限
    if (planInfo.daily_limit !== -1 && remaining <= 0) {
      return {
        success: false,
        error: '今日使用次数已用完',
        upgrade_tip: `升级到${planInfo.name}可获得无限使用`,
        remaining: 0
      };
    }

    // 更新使用记录
    const newUsage = user.last_usage_date === today 
      ? user.daily_usage + 1 
      : 1;

    await db.updateUser(user.id, {
      daily_usage: newUsage,
      last_usage_date: today,
      total_requests: (user.total_requests || 0) + 1
    });

    return {
      success: true,
      remaining: planInfo.daily_limit === -1 
        ? -1 
        : Math.max(0, planInfo.daily_limit - newUsage)
    };
  }

  /**
   * 获取推荐列表
   * @param {string} phone - 用户手机号
   * @returns {Object} 推荐数据
   */
  async getReferrals(phone) {
    const user = await db.findUserByPhone(phone);
    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    // 获取直接推荐人
    const directReferrer = user.referrer_id 
      ? await db.getUserById(user.referrer_id)
      : null;

    // 获取我推荐的用户
    const myReferrals = await db.getReferralsByUserId(user.id);

    return {
      success: true,
      my_referral_code: user.referral_code,
      referrer: directReferrer ? {
        name: directReferrer.name,
        joined_at: directReferrer.created_at
      } : null,
      referrals: myReferrals.map(r => ({
        name: r.name,
        level: r.level,
        level_name: this.plans[r.level].name,
        joined_at: r.created_at,
        total_spent: r.total_spent
      })),
      stats: {
        total_referrals: user.total_referrals,
        paid_referrals: myReferrals.filter(r => r.level !== 'free').length,
        potential_earnings: myReferrals
          .filter(r => r.level !== 'free')
          .reduce((sum, r) => sum + this.plans[r.level].price * 0.2, 0)
      }
    };
  }

  /**
   * 获取收益明细
   * @param {string} phone - 用户手机号
   * @returns {Object} 收益数据
   */
  async getEarnings(phone) {
    const user = await db.findUserByPhone(phone);
    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    const transactions = await db.getTransactionsByUserId(user.id);
    const pendingTransactions = transactions.filter(t => t.status === 'pending');
    const confirmedTransactions = transactions.filter(t => t.status === 'confirmed');
    const withdrawals = await db.getWithdrawalsByUserId(user.id);

    return {
      success: true,
      summary: {
        total_earnings: user.total_earnings,
        withdrawable: user.withdrawable,
        pending: pendingTransactions.reduce((sum, t) => sum + t.amount, 0),
        withdrawn: withdrawals.reduce((sum, w) => sum + w.amount, 0)
      },
      recent_transactions: confirmedTransactions.slice(0, 10).map(t => ({
        id: t.id,
        type: t.type,
        level: t.level_name,
        amount: t.amount,
        source: t.source_user_name,
        created_at: t.created_at
      })),
      recent_withdrawals: withdrawals.slice(0, 5).map(w => ({
        id: w.id,
        amount: w.amount,
        status: w.status,
        created_at: w.created_at
      }))
    };
  }

  /**
   * 申请提现
   * @param {string} phone - 用户手机号
   * @param {number} amount - 提现金额
   * @returns {Object} 提现结果
   */
  async withdraw(phone, amount) {
    const user = await db.findUserByPhone(phone);
    if (!user) {
      return { success: false, error: '用户不存在' };
    }

    const MIN_WITHDRAW = 100;

    if (amount < MIN_WITHDRAW) {
      return { success: false, error: `最低提现金额为${MIN_WITHDRAW}元` };
    }

    if (user.withdrawable < amount) {
      return { 
        success: false, 
        error: '余额不足',
        withdrawable: user.withdrawable 
      };
    }

    // 创建提现记录
    const withdrawal = {
      id: this.generateId(),
      user_id: user.id,
      user_name: user.name,
      user_wechat: user.wechat,
      amount,
      status: 'pending',
      created_at: new Date()
    };

    await db.createWithdrawal(withdrawal);

    // 冻结余额
    await db.updateUser(user.id, {
      withdrawable: user.withdrawable - amount,
      frozen_amount: (user.frozen_amount || 0) + amount
    });

    // 发送通知给管理员
    await notification.sendWithdrawalRequest(withdrawal);

    return {
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount,
        status: 'pending'
      },
      message: '提现申请已提交，预计1-3个工作日到账'
    };
  }

  // ========== 工具方法 ==========

  generateUserId() {
    return 'HH' + Date.now().toString(36).toUpperCase() + 
           Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  maskPhone(phone) {
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }
}

module.exports = new MembershipManager();
