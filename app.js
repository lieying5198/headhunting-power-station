/**
 * 猎头能量站 - 前端应用
 * API 对接层
 */

// API 基础地址
const API_BASE = 'https://headhunting-api.lieying5198.workers.dev';

// 当前用户状态
let currentUser = null;
let authToken = localStorage.getItem('token');

// ========== API 工具 ==========

async function api(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` })
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ========== 认证相关 ==========

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  
  // URL中获取邀请码
  const urlParams = new URLSearchParams(window.location.search);
  const urlInviteCode = urlParams.get('invite');
  const formInviteCode = formData.get('invite_code');
  const inviteCode = formInviteCode || urlInviteCode || '';
  
  try {
    showLoading('正在注册...');
    
    const result = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        invite_code: inviteCode
      })
    });
    
    if (result.success) {
      // 保存token和用户信息
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      authToken = result.data.token;
      currentUser = result.data.user;
      
      closeModal('registerModal');
      updateUserUI();
      showToast('注册成功！获得50积分邀请奖励', 'success');
    }
  } catch (error) {
    showToast(error.message || '注册失败', 'error');
  } finally {
    hideLoading();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  
  try {
    showLoading('正在登录...');
    
    const result = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password')
      })
    });
    
    if (result.success) {
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      authToken = result.data.token;
      currentUser = result.data.user;
      
      closeModal('loginModal');
      updateUserUI();
      loadUserData();
      showToast('登录成功', 'success');
    }
  } catch (error) {
    showToast(error.message || '登录失败', 'error');
  } finally {
    hideLoading();
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  authToken = null;
  currentUser = null;
  updateUserUI();
  showToast('已退出登录', 'info');
}

async function loadUserData() {
  if (!authToken) return;
  
  try {
    const result = await api('/api/auth/profile');
    if (result.success) {
      currentUser = result.data.user;
      localStorage.setItem('user', JSON.stringify(currentUser));
      updateUserUI();
    }
  } catch (error) {
    console.error('加载用户数据失败:', error);
  }
}

// ========== UI 更新 ==========

function updateUserUI() {
  const userBar = document.getElementById('userBar');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  
  if (currentUser) {
    userBar.style.display = 'block';
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userLevel').textContent = getLevelName(currentUser.vip_level);
    document.getElementById('userPoints').textContent = currentUser.points || 0;
    
    // 更新邀请链接
    if (currentUser.invite_code) {
      document.getElementById('inviteLink').value = 
        `${window.location.origin}/?invite=${currentUser.invite_code}`;
      document.getElementById('myInviteCode').textContent = currentUser.invite_code;
      document.getElementById('shareLink').value = 
        `${window.location.origin}/?invite=${currentUser.invite_code}`;
      document.getElementById('inviteCount').textContent = currentUser.total_invites || 0;
    }
  } else {
    userBar.style.display = 'none';
    loginBtn.style.display = 'inline-flex';
    registerBtn.style.display = 'inline-flex';
  }
}

function getLevelName(level) {
  const names = ['免费版', '月度VIP', '年度VIP', '永久VIP'];
  return names[level] || '免费版';
}

// ========== 签到 ==========

async function doSignIn() {
  try {
    const result = await api('/api/points/sign-in', { method: 'POST' });
    
    if (result.success) {
      showToast(`签到成功！获得${result.data.points}积分`, 'success');
      closeModal('signInModal');
      
      // 更新积分显示
      if (currentUser) {
        currentUser.points = result.data.total_points;
        updateUserUI();
      }
    }
  } catch (error) {
    showToast(error.message || '签到失败', 'error');
  }
}

async function loadSignInStatus() {
  if (!authToken) return;
  
  try {
    const result = await api('/api/points/tasks');
    if (result.success) {
      // 更新签到按钮状态
      const signInTask = result.data.tasks.find(t => t.key === 'sign_in');
      const signInBtn = document.getElementById('signInBtn');
      
      if (signInTask && signInTask.completed) {
        signInBtn.textContent = '今日已签到';
        signInBtn.disabled = true;
        signInBtn.classList.add('btn-ghost');
        signInBtn.classList.remove('btn-primary');
      }
    }
  } catch (error) {
    console.error('加载签到状态失败:', error);
  }
}

// ========== 会员升级 ==========

let selectedPlan = null;

function handleUpgrade(plan) {
  if (!authToken) {
    showRegister();
    return;
  }
  
  selectedPlan = plan;
  const prices = { monthly: { name: '月度VIP', price: 99 }, 
                   yearly: { name: '年度VIP', price: 599 }, 
                   lifetime: { name: '永久VIP', price: 1999 } };
  
  document.getElementById('payProduct').textContent = prices[plan].name;
  document.getElementById('payAmount').textContent = prices[plan].price;
  
  showModal('payModal');
}

async function confirmPay() {
  if (!authToken || !selectedPlan) return;
  
  try {
    showLoading('正在创建订单...');
    
    // 创建订单
    const orderResult = await api('/api/order/create', {
      method: 'POST',
      body: JSON.stringify({ product_type: 'vip_' + selectedPlan })
    });
    
    if (orderResult.success) {
      // 模拟支付成功（实际需要接入微信/支付宝）
      showToast('支付成功！VIP已开通', 'success');
      closeModal('payModal');
      
      // 重新加载用户数据
      await loadUserData();
    }
  } catch (error) {
    showToast(error.message || '支付失败', 'error');
  } finally {
    hideLoading();
  }
}

// ========== 邀请分销 ==========

async function loadInviteStats() {
  if (!authToken) return;
  
  try {
    const result = await api('/api/invite/stats');
    if (result.success) {
      document.getElementById('inviteCount').textContent = result.data.total_invites;
      document.getElementById('inviteEarnings').textContent = '¥' + 
        (result.data.commissions.withdrawable / 100).toFixed(2);
    }
  } catch (error) {
    console.error('加载邀请数据失败:', error);
  }
}

function copyInviteLink() {
  const link = document.getElementById('inviteLink').value;
  copyToClipboard(link);
  showToast('链接已复制', 'success');
}

function copyShareLink() {
  const link = document.getElementById('shareLink').value;
  copyToClipboard(link);
  showToast('链接已复制', 'success');
}

// ========== 微信登录 ==========

function wechatLogin() {
  // 实际需要微信授权
  // 这里跳转到授权页
  const appId = 'your-wechat-appid';
  const redirectUri = encodeURIComponent(window.location.href.split('?')[0]);
  window.location.href = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo#wechat_redirect`;
}

// ========== UI 辅助 ==========

function showModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

function switchModal(from, to) {
  closeModal(from);
  showModal(to);
}

function showLogin() { showModal('loginModal'); }
function showRegister() { showModal('registerModal'); }
function showSignIn() { showModal('signInModal'); loadSignInStatus(); }
function showInvite() { showModal('inviteModal'); }
function showUpgrade() { document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' }); }

function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

function showLoading(message = '加载中...') {
  // 简单实现，可替换为更好的loading UI
  document.body.style.cursor = 'wait';
}

function hideLoading() {
  document.body.style.cursor = 'auto';
}

function showToast(message, type = 'info') {
  // 简单实现，可替换为更好的toast UI
  alert(message);
}

function scrollTo(selector) {
  document.querySelector(selector).scrollIntoView({ behavior: 'smooth' });
}

// ========== 初始化 ==========

document.addEventListener('DOMContentLoaded', () => {
  // 检查登录状态
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    updateUserUI();
    loadUserData();
    loadInviteStats();
  }
  
  // 检查URL中的邀请码
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');
  if (inviteCode) {
    document.getElementById('inviteCode').value = inviteCode;
    // 如果未登录，显示注册弹窗
    if (!authToken) {
      setTimeout(() => showRegister(), 500);
    }
  }
  
  // 移动端菜单
  document.getElementById('mobileMenu').addEventListener('click', () => {
    document.getElementById('nav').classList.toggle('active');
  });
  
  // 平滑滚动
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('nav').classList.remove('active');
      }
    });
  });
  
  // 点击模态框外部关闭
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
  
  // 加载统计数据
  loadPublicStats();
});

async function loadPublicStats() {
  try {
    const result = await api('/api/public/stats');
    if (result.success) {
      document.getElementById('statUsers').textContent = 
        result.data.total_users.toLocaleString();
    }
  } catch (error) {
    // 静默失败，使用默认数据
  }
}

// 支付方式选择
let selectedPayMethod = 'wechat';

function selectPayMethod(method) {
  selectedPayMethod = method;
  document.querySelectorAll('.pay-method').forEach(el => {
    el.classList.toggle('active', el.textContent.includes(method === 'wechat' ? '微信' : '支付'));
  });
}

// ========== 文章/课程加载 ==========

async function loadCourses() {
  try {
    const result = await api('/api/articles/featured');
    if (result.success && result.data.articles.length > 0) {
      const html = result.data.articles.slice(0, 6).map(article => createArticleCard(article)).join('');
      document.getElementById('courseList').innerHTML = html || '<div class="empty-state"><p>暂无课程</p></div>';
    } else {
      // 如果没有精选文章，显示最新课程
      loadArticlesByCategory('course', 'courseList', 6);
    }
  } catch (error) {
    // 如果API失败，显示默认内容
    document.getElementById('courseList').innerHTML = getDefaultCourses();
  }
}

async function loadResources() {
  try {
    const result = await api('/api/articles');
    if (result.success && result.data.articles.length > 0) {
      // 显示资源类文章
      const resources = result.data.articles.filter(a => a.category === 'resource' || a.category === 'tool');
      const html = resources.slice(0, 6).map(article => createArticleCard(article)).join('');
      document.getElementById('resourceList').innerHTML = html || '<div class="empty-state"><p>暂无资源</p></div>';
    } else {
      document.getElementById('resourceList').innerHTML = getDefaultResources();
    }
  } catch (error) {
    document.getElementById('resourceList').innerHTML = getDefaultResources();
  }
}

async function loadArticlesByCategory(category, elementId, limit) {
  try {
    const result = await api(`/api/articles/category/${category}`);
    if (result.success && result.data.articles.length > 0) {
      const html = result.data.articles.slice(0, limit).map(article => createArticleCard(article)).join('');
      document.getElementById(elementId).innerHTML = html;
    } else {
      document.getElementById(elementId).innerHTML = '<div class="empty-state"><p>暂无内容</p></div>';
    }
  } catch (error) {
    document.getElementById(elementId).innerHTML = '<div class="empty-state"><p>加载失败</p></div>';
  }
}

function createArticleCard(article) {
  const categoryMap = {
    course: { name: '课程', class: 'course' },
    resource: { name: '资源', class: 'resource' },
    news: { name: '资讯', class: 'news' },
    tool: { name: '工具', class: 'tool' }
  };
  const cat = categoryMap[article.category] || { name: '文章', class: 'course' };
  const vipText = article.view_level === 0 ? '' : `<span class="article-vip-badge">🔒 ${article.view_level === 1 ? 'VIP' : '高级VIP'}</span>`;

  return `
    <div class="article-card" onclick="viewArticle('${article.id}')">
      <div class="article-card-header">
        <span class="article-tag ${cat.class}">${cat.name}</span>
        ${article.is_featured ? '<span class="article-tag vip">⭐ 精选</span>' : ''}
      </div>
      <h3 class="article-card-title">${article.title}</h3>
      <p class="article-card-summary">${article.summary || '点击查看详情...'}</p>
      <div class="article-card-footer">
        <div class="article-stats">
          <span>👁 ${article.view_count || 0}</span>
          <span>❤️ ${article.like_count || 0}</span>
        </div>
        ${vipText}
      </div>
    </div>
  `;
}

function viewArticle(id) {
  // 如果已登录，跳转到文章详情
  if (authToken) {
    window.location.href = `article.html?id=${id}`;
  } else {
    // 未登录则提示登录
    showRegister();
  }
}

function showAllCourses() {
  if (!authToken) {
    showRegister();
    return;
  }
  showToast('课程中心即将上线', 'info');
}

function getDefaultCourses() {
  return `
    <div class="article-card" onclick="showRegister()">
      <div class="article-card-header">
        <span class="article-tag course">课程</span>
        <span class="article-tag vip">⭐ 精选</span>
      </div>
      <h3 class="article-card-title">【干货】猎头新人必看：如何快速找到优质候选人</h3>
      <p class="article-card-summary">本文分享5个实用的候选人搜索技巧，帮助猎头新人快速提升业绩。</p>
      <div class="article-card-footer">
        <div class="article-stats"><span>👁 1,258</span><span>❤️ 89</span></div>
      </div>
    </div>
    <div class="article-card" onclick="showRegister()">
      <div class="article-card-header">
        <span class="article-tag course">课程</span>
        <span class="article-tag vip">⭐ 精选</span>
      </div>
      <h3 class="article-card-title">猎头沟通话术大全：这样跟候选人沟通，转化率翻倍</h3>
      <p class="article-card-summary">从开场白到薪资谈判，完整的猎头沟通话术模板。</p>
      <div class="article-card-footer">
        <div class="article-stats"><span>👁 892</span><span>❤️ 67</span></div>
      </div>
    </div>
    <div class="article-card" onclick="showRegister()">
      <div class="article-card-header">
        <span class="article-tag course">课程</span>
      </div>
      <h3 class="article-card-title">猎头如何做好BD？5个步骤拿下大客户</h3>
      <p class="article-card-summary">分享开发企业客户的实战经验，从目标客户画像到商务谈判。</p>
      <div class="article-card-footer">
        <div class="article-stats"><span>👁 567</span><span>❤️ 45</span></div>
        <span class="article-vip-badge">🔒 VIP</span>
      </div>
    </div>
  `;
}

function getDefaultResources() {
  return `
    <div class="article-card" onclick="showRegister()">
      <div class="article-card-header">
        <span class="article-tag resource">资源</span>
        <span class="article-tag vip">⭐ 精选</span>
      </div>
      <h3 class="article-card-title">【收藏】2024年各行业薪酬报告汇总</h3>
      <p class="article-card-summary">整理了互联网、金融、医疗、制造等行业的薪酬数据。</p>
      <div class="article-card-footer">
        <div class="article-stats"><span>👁 2,341</span><span>❤️ 156</span></div>
      </div>
    </div>
    <div class="article-card" onclick="showRegister()">
      <div class="article-card-header">
        <span class="article-tag tool">工具</span>
      </div>
      <h3 class="article-card-title">【工具推荐】猎头必备的10款效率工具</h3>
      <p class="article-card-summary">从简历解析到项目管理，推荐实用的猎头工具。</p>
      <div class="article-card-footer">
        <div class="article-stats"><span>👁 1,892</span><span>❤️ 123</span></div>
      </div>
    </div>
    <div class="article-card" onclick="showRegister()">
      <div class="article-card-header">
        <span class="article-tag news">资讯</span>
        <span class="article-tag vip">⭐ 精选</span>
      </div>
      <h3 class="article-card-title">【行业洞察】2024年猎头行业发展趋势报告</h3>
      <p class="article-card-summary">分析猎头行业的现状和未来发展方向，AI赋能招聘成趋势。</p>
      <div class="article-card-footer">
        <div class="article-stats"><span>👁 3,421</span><span>❤️ 234</span></div>
      </div>
    </div>
  `;
}

// 更新初始化函数
document.addEventListener('DOMContentLoaded', () => {
  // 检查登录状态
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    updateUserUI();
    loadUserData();
    loadInviteStats();
  }

  // 检查URL中的邀请码
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');
  if (inviteCode) {
    document.getElementById('inviteCode').value = inviteCode;
    // 如果未登录，显示注册弹窗
    if (!authToken) {
      setTimeout(() => showRegister(), 500);
    }
  }

  // 移动端菜单
  document.getElementById('mobileMenu').addEventListener('click', () => {
    document.getElementById('nav').classList.toggle('active');
  });

  // 平滑滚动
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('nav').classList.remove('active');
      }
    });
  });

  // 点击模态框外部关闭
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  // 加载统计数据
  loadPublicStats();

  // 加载文章列表
  loadCourses();
  loadResources();
});
