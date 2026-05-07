/**
 * 数据初始化脚本
 * 创建一些示例数据用于演示
 */

const membership = require('../handlers/membership');
const reward = require('../handlers/reward');

async function initializeSampleData() {
  console.log('📦 初始化示例数据...\n');

  // 创建发布者账户
  console.log('1. 创建发布者账户...');
  const publisher = await membership.register({
    name: '猎头加油站',
    phone: '13800000000',
    wechat: 'headhunting_station',
    referrer: null
  });
  console.log('   发布者ID:', publisher.user.id);

  // 创建一级分销商
  console.log('\n2. 创建一级分销商...');
  const agent1 = await membership.register({
    name: '赵经理',
    phone: '13800000001',
    wechat: 'zhao_hh',
    referrer: null
  });
  console.log('   代理ID:', agent1.user.id);
  console.log('   推荐码:', agent1.user.referral_code);

  // 创建二级分销商
  console.log('\n3. 创建二级分销商...');
  const agent2 = await membership.register({
    name: '钱总监',
    phone: '13800000002',
    wechat: 'qian_hh',
    referrer: null
  });
  console.log('   代理ID:', agent2.user.id);
  console.log('   推荐码:', agent2.user.referral_code);

  // 创建普通用户（通过赵经理推荐）
  console.log('\n4. 创建普通用户...');
  const user1 = await membership.register({
    name: '孙先生',
    phone: '13800000003',
    wechat: 'sun_user',
    referrer: agent1.user.referral_code
  });
  console.log('   用户注册成功');

  // 用户1升级年卡
  console.log('\n5. 用户升级年卡...');
  await membership.upgrade(user1.user.phone, 'yearly');
  console.log('   升级成功！');

  // 创建更多用户
  console.log('\n6. 创建更多用户...');
  const user2 = await membership.register({
    name: '周女士',
    phone: '13800000004',
    wechat: 'zhou_user',
    referrer: agent1.user.referral_code
  });
  await membership.upgrade(user2.user.phone, 'monthly');
  console.log('   周女士注册并升级月卡');

  const user3 = await membership.register({
    name: '吴先生',
    phone: '13800000005',
    wechat: 'wu_user',
    referrer: agent2.user.referral_code
  });
  await membership.upgrade(user3.user.phone, 'lifetime');
  console.log('   吴先生注册并升级终身会员');

  // 查看分销商收益
  console.log('\n7. 查看分销商收益...');
  const agent1Earnings = await membership.getEarnings(agent1.user.phone);
  console.log('   赵经理累计收益: ¥' + agent1Earnings.summary.total_earnings);

  const agent2Earnings = await membership.getEarnings(agent2.user.phone);
  console.log('   钱总监累计收益: ¥' + agent2Earnings.summary.total_earnings);

  // 查看排行榜
  console.log('\n8. 收益排行榜...');
  const leaderboard = await reward.getLeaderboard(10);
  console.log('   排行榜:');
  leaderboard.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.name} - ¥${item.total_earnings}`);
  });

  console.log('\n✅ 数据初始化完成！');
  console.log('\n测试账号:');
  console.log('- 赵经理: 13800000001 (分销商)');
  console.log('- 钱总监: 13800000002 (分销商)');
  console.log('- 孙先生: 13800000003 (年卡用户)');
  console.log('- 周女士: 13800000004 (月卡用户)');
  console.log('- 吴先生: 13800000005 (终身用户)');
}

initializeSampleData().catch(console.error);
