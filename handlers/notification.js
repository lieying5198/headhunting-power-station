/**
 * 通知系统
 * 处理各类用户通知
 */

class NotificationService {
  constructor() {
    this.channels = {
      inApp: true,      // 应用内通知
      wechat: false,    // 微信通知（需配置）
      email: false,     // 邮件通知（需配置）
      sms: false        // 短信通知（需配置）
    };
  }

  /**
   * 发送升级成功通知
   */
  async sendUpgradeSuccess(phone, planName, amount) {
    const message = {
      type: 'upgrade_success',
      title: '🎉 升级成功',
      content: `恭喜您已成功升级为${planName}，支付金额：¥${amount}`,
      phone,
      created_at: new Date()
    };
    
    return this.send(message);
  }

  /**
   * 发送奖励到账通知
   */
  async sendRewardCredited(userId, transaction) {
    const message = {
      type: 'reward_credited',
      title: '💰 佣金到账',
      content: `您有一笔 ¥${transaction.amount} 佣金已到账（${this.getTransactionTypeName(transaction.type)}）`,
      user_id: userId,
      created_at: new Date()
    };
    
    return this.send(message);
  }

  /**
   * 发送提现申请通知（给管理员）
   */
  async sendWithdrawalRequest(withdrawal) {
    const message = {
      type: 'withdrawal_request',
      title: '📤 新的提现申请',
      content: `用户：${withdrawal.user_name}\n微信号：${withdrawal.user_wechat}\n金额：¥${withdrawal.amount}\n申请ID：${withdrawal.id}`,
      target: 'admin',
      created_at: new Date()
    };
    
    return this.send(message);
  }

  /**
   * 发送提现到账通知
   */
  async sendWithdrawalComplete(phone, amount, withdrawalId) {
    const message = {
      type: 'withdrawal_complete',
      title: '✅ 提现到账',
      content: `您申请的 ¥${amount} 已到账，请查收。提现单号：${withdrawalId}`,
      phone,
      created_at: new Date()
    };
    
    return this.send(message);
  }

  /**
   * 发送注册成功通知
   */
  async sendWelcome(user) {
    const message = {
      type: 'welcome',
      title: '🦁 欢迎加入猎头加油站',
      content: `尊敬的${user.name}，感谢您注册！您已自动成为分销会员，通过推荐链接可获得佣金奖励。`,
      phone: user.phone,
      data: {
        referral_code: user.referral_code,
        features: ['每日3次基础搜索', 'JD基础解析', '成为分销商赚佣金']
      },
      created_at: new Date()
    };
    
    return this.send(message);
  }

  /**
   * 发送使用限额提醒
   */
  async sendUsageLimitReminder(phone) {
    const message = {
      type: 'usage_limit_reminder',
      title: '📊 今日使用次数已用完',
      content: `您的免费额度已用完，升级会员可获得无限使用`,
      phone,
      cta: {
        text: '立即升级',
        action: '/upgrade'
      },
      created_at: new Date()
    };
    
    return this.send(message);
  }

  /**
   * 发送下线升级通知
   */
  async sendReferralUpgradeNotice(referrerPhone, referralName, levelName) {
    const message = {
      type: 'referral_upgrade',
      title: '🎊 您推荐的用户升级了',
      content: `您推荐的用户${referralName}已升级为${levelName}，您将获得相应佣金奖励！`,
      phone: referrerPhone,
      created_at: new Date()
    };
    
    return this.send(message);
  }

  /**
   * 发送佣金结算通知
   */
  async sendCommissionSettlement(phone, pendingAmount, confirmedAmount) {
    const message = {
      type: 'commission_settlement',
      title: '📅 月度佣金结算',
      content: `本月佣金结算：待确认 ¥${pendingAmount}，已到账 ¥${confirmedAmount}`,
      phone,
      created_at: new Date()
    };
    
    return this.send(message);
  }

  /**
   * 通用发送接口
   */
  async send(message) {
    // 记录通知日志
    console.log('[Notification]', JSON.stringify(message));
    
    // 根据配置发送到各渠道
    const results = [];
    
    if (this.channels.inApp) {
      results.push({ channel: 'inApp', status: 'sent' });
    }
    
    // 其他渠道需要额外配置...
    
    return {
      success: true,
      message_id: 'N' + Date.now().toString(36),
      channels: results
    };
  }

  /**
   * 获取交易类型名称
   */
  getTransactionTypeName(type) {
    const names = {
      level1_purchase: '一级推荐奖励',
      level2_purchase: '二级推荐奖励',
      registration: '注册奖励',
      monthly_settlement: '月度结算'
    };
    return names[type] || type;
  }
}

module.exports = new NotificationService();
