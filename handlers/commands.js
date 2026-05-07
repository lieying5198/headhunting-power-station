/**
 * 命令处理器 - 统一路由
 * 处理所有用户命令的分发
 */

const membership = require('./membership');
const reward = require('./reward');

class CommandRouter {
  constructor() {
    this.commands = {
      // 会员相关
      register: this.handleRegister.bind(this),
      upgrade: this.handleUpgrade.bind(this),
      status: this.handleStatus.bind(this),
      referrals: this.handleReferrals.bind(this),
      earnings: this.handleEarnings.bind(this),
      withdraw: this.handleWithdraw.bind(this),
      
      // 功能使用
      search: this.handleSearch.bind(this),
      jdanalyze: this.handleJDAnalyze.bind(this),
      candidate: this.handleCandidate.bind(this),
      match: this.handleMatch.bind(this),
      insight: this.handleInsight.bind(this),
      daily: this.handleDaily.bind(this),
      learn: this.handleLearn.bind(this),
      ask: this.handleAsk.bind(this),
      report: this.handleReport.bind(this),
      train: this.handleTrain.bind(this),
      feedback: this.handleFeedback.bind(this),
      
      // 管理员
      admin: this.handleAdmin.bind(this),
      
      // 帮助
      help: this.handleHelp.bind(this)
    };
  }

  /**
   * 路由命令
   */
  async route(command, args, context) {
    const { name, params } = this.parseCommand(command, args);
    const handler = this.commands[name];

    if (!handler) {
      return {
        success: false,
        error: `未知命令: /${name}`,
        hint: '输入 /help 查看所有可用命令'
      };
    }

    // 会员命令需要验证用户
    const memberCommands = ['search', 'jdanalyze', 'candidate', 'match', 'report', 'train'];
    if (memberCommands.includes(name)) {
      const usageCheck = await this.checkUsage(context.phone);
      if (!usageCheck.success) {
        return usageCheck;
      }
    }

    try {
      return await handler(params, context);
    } catch (error) {
      console.error('[Command Error]', error);
      return {
        success: false,
        error: '处理命令时出错，请稍后重试'
      };
    }
  }

  /**
   * 解析命令
   */
  parseCommand(command, args) {
    const parts = command.split(' ');
    const name = parts[0].toLowerCase().replace('/', '');
    
    // 根据命令类型解析参数
    let params = {};
    
    switch (name) {
      case 'register':
        params = {
          name: args[0] || parts[1],
          phone: args[1] || parts[2],
          wechat: args[2] || parts[3],
          referrer: args[3] || parts[4]
        };
        break;
      case 'upgrade':
        params = { plan: args[0] || parts[1] || 'monthly' };
        break;
      case 'withdraw':
        params = { amount: parseFloat(args[0] || parts[1] || 0) };
        break;
      case 'search':
      case 'insight':
      case 'ask':
        params = { query: args.join(' ') || parts.slice(1).join(' ') };
        break;
      case 'jdanalyze':
        params = { jd: args.join('\n') || parts.slice(1).join('\n') };
        break;
      case 'candidate':
        params = { resume: args.join('\n') || parts.slice(1).join('\n') };
        break;
      case 'match':
        const combined = args.join(' | ') || parts.slice(1).join(' | ');
        const [jdPart, candidatePart] = combined.split('|').map(s => s.trim());
        params = { jd: jdPart, candidate: candidatePart };
        break;
      case 'learn':
        params = { content: args.join('\n') || parts.slice(1).join('\n') };
        break;
      case 'report':
      case 'train':
        params = { type: args[0] || parts[1] };
        break;
      case 'feedback':
        params = { result: args.join(' ') || parts.slice(1).join(' ') };
        break;
      case 'admin':
        params = { action: args[0] || parts[1], params: args.slice(1).join(' ') || parts.slice(2).join(' ') };
        break;
    }

    return { name, params };
  }

  /**
   * 检查使用权限
   */
  async checkUsage(phone) {
    if (!phone) {
      return { 
        success: false, 
        error: '请先注册成为会员',
        action: '/register'
      };
    }

    const usage = await membership.recordUsage(phone);
    return usage;
  }

  // ========== 会员命令处理 ==========

  async handleRegister(params, context) {
    const { name, phone, wechat, referrer } = params;

    if (!name || !phone || !wechat) {
      return {
        success: false,
        error: '参数不完整',
        usage: '/register <姓名> <手机号> <微信号> [推荐人手机号]'
      };
    }

    return await membership.register({ name, phone, wechat, referrer });
  }

  async handleUpgrade(params, context) {
    const { plan } = params;
    const validPlans = ['monthly', 'yearly', 'lifetime'];

    if (!validPlans.includes(plan)) {
      return {
        success: false,
        error: '无效的套餐',
        available: validPlans,
        usage: '/upgrade monthly | yearly | lifetime'
      };
    }

    return await membership.upgrade(context.phone, plan);
  }

  async handleStatus(params, context) {
    return await membership.getStatus(context.phone);
  }

  async handleReferrals(params, context) {
    return await membership.getReferrals(context.phone);
  }

  async handleEarnings(params, context) {
    return await membership.getEarnings(context.phone);
  }

  async handleWithdraw(params, context) {
    const { amount } = params;

    if (amount <= 0) {
      return {
        success: false,
        error: '请输入有效的提现金额',
        usage: '/withdraw <金额>'
      };
    }

    return await membership.withdraw(context.phone, amount);
  }

  // ========== 功能命令处理 ==========

  async handleSearch(params, context) {
    const { query } = params;
    
    if (!query) {
      return {
        success: false,
        error: '请输入搜索关键词',
        usage: '/search <关键词>'
      };
    }

    // 实际搜索逻辑
    return {
      success: true,
      type: 'search_results',
      query,
      message: '正在搜索知识库...',
      // 这里调用IMA搜索
      results: []
    };
  }

  async handleJDAnalyze(params, context) {
    const { jd } = params;
    
    if (!jd) {
      return {
        success: false,
        error: '请提供职位描述',
        usage: '/jdanalyze <JD内容>'
      };
    }

    // JD解析逻辑
    return {
      success: true,
      type: 'jd_analysis',
      message: '正在深度解析JD...',
      analysis: {
        structure: {},
        candidate_profile: {},
        market_benchmark: {},
        suggestions: {}
      }
    };
  }

  async handleCandidate(params, context) {
    const { resume } = params;
    
    if (!resume) {
      return {
        success: false,
        error: '请提供候选人简历',
        usage: '/candidate <简历内容>'
      };
    }

    return {
      success: true,
      type: 'candidate_evaluation',
      message: '正在评估候选人...',
      evaluation: {
        match_score: 0,
        strengths: [],
        concerns: [],
        interview_questions: [],
        communication_strategy: {}
      }
    };
  }

  async handleMatch(params, context) {
    const { jd, candidate } = params;
    
    if (!jd || !candidate) {
      return {
        success: false,
        error: '请同时提供JD和候选人信息',
        usage: '/match <JD> | <候选人简历>'
      };
    }

    return {
      success: true,
      type: 'matching_result',
      message: '正在计算匹配度...',
      match: {
        overall_score: 0,
        skill_match: { score: 0, details: [] },
        experience_match: { score: 0, details: [] },
        motivation_match: { score: 0, details: [] },
        culture_match: { score: 0, details: [] },
        risks: [],
        recommendation: ''
      }
    };
  }

  async handleInsight(params, context) {
    const { query } = params;

    return {
      success: true,
      type: 'industry_insight',
      topic: query,
      insights: {
        trends: [],
        talent_demand: {},
        salary_outlook: {},
        competitors: []
      }
    };
  }

  async handleDaily(params, context) {
    return {
      success: true,
      type: 'daily_news',
      date: new Date().toISOString().split('T')[0],
      content: {
        headline: '今日行业要闻',
        news: [],
        tips: [],
        market_update: {}
      }
    };
  }

  async handleLearn(params, context) {
    const { content } = params;

    return {
      success: true,
      type: 'learning_confirmed',
      message: '已学习新知识，内容将用于后续分析'
    };
  }

  async handleAsk(params, context) {
    const { query } = params;

    return {
      success: true,
      type: 'answer',
      question: query,
      answer: '正在思考中...',
      sources: []
    };
  }

  async handleReport(params, context) {
    const { type } = params;

    return {
      success: true,
      type: 'report_generated',
      report_type: type,
      download_url: null
    };
  }

  async handleTrain(params, context) {
    const { type } = params;

    return {
      success: true,
      type: 'training_plan',
      ability: type,
      suggestions: []
    };
  }

  async handleFeedback(params, context) {
    const { result } = params;

    return {
      success: true,
      type: 'feedback_received',
      message: '感谢反馈，这将帮助我不断进化'
    };
  }

  async handleAdmin(params, context) {
    // 管理员命令需要验证权限
    if (context.user_id !== 'ADMIN') {
      return {
        success: false,
        error: '无权限访问'
      };
    }

    const admin = require('./admin');
    return await admin.handle(params.action, params.params);
  }

  async handleHelp(params, context) {
    return {
      success: true,
      type: 'help',
      commands: {
        basic: [
          { cmd: '/help', desc: '显示帮助信息' },
          { cmd: '/register', desc: '注册会员' },
          { cmd: '/status', desc: '查看会员状态' }
        ],
        vip: [
          { cmd: '/upgrade', desc: '升级会员' },
          { cmd: '/search', desc: '搜索知识库' },
          { cmd: '/jdanalyze', desc: 'JD深度解析' },
          { cmd: '/candidate', desc: '候选人评估' },
          { cmd: '/match', desc: '精准匹配' }
        ],
        distribution: [
          { cmd: '/referrals', desc: '查看推荐人' },
          { cmd: '/earnings', desc: '查看收益' },
          { cmd: '/withdraw', desc: '申请提现' }
        ]
      }
    };
  }
}

module.exports = new CommandRouter();
