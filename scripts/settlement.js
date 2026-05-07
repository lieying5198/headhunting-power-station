/**
 * 月度佣金结算脚本
 * 定时任务：将待确认佣金转为可提现
 */

const reward = require('../handlers/reward');
const db = require('../handlers/database');
const notification = require('../handlers/notification');

async function runSettlement() {
  console.log('📅 开始月度佣金结算...');
  console.log('='.repeat(50));

  // 执行结算
  const result = await reward.monthlySettlement();

  console.log(`\n✅ 结算完成！`);
  console.log(`   处理交易数: ${result.processed}`);

  if (result.transactions.length > 0) {
    console.log('\n📋 结算明细:');
    result.transactions.forEach(tx => {
      console.log(`   - ${tx.id}: ¥${tx.amount} (${tx.type})`);
    });
  }

  // 统计汇总
  const stats = await db.stats.getOverview();
  console.log('\n📊 平台统计:');
  console.log(`   用户总数: ${stats.users.total}`);
  console.log(`   付费用户: ${stats.users.paid}`);
  console.log(`   总收入: ¥${stats.revenue.total}`);
  console.log(`   已发佣金: ¥${stats.commissions.total}`);
  console.log(`   待发佣金: ¥${stats.commissions.pending}`);

  console.log('\n' + '='.repeat(50));
  console.log('✅ 月度结算任务完成！');
}

// 每天凌晨2点执行
const now = new Date();
if (now.getHours() === 2) {
  runSettlement().catch(console.error);
} else {
  // 手动执行
  console.log('⏰ 当前时间不是结算时间，手动执行...\n');
  runSettlement().catch(console.error);
}
