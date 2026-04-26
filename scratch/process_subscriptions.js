const db = require('../src/services/database');
const wallet = require('../src/services/wallet');

async function processRecurring() {
  console.log('Processing recurring subscriptions...');
  const now = new Date();
  
  try {
    const dueSubscriptions = await db('subscriptions')
      .where('status', 'active')
      .where('next_billing_at', '<=', now);
    
    console.log(`Found ${dueSubscriptions.length} subscriptions due.`);
    
    for (const sub of dueSubscriptions) {
      console.log(`Charging subscriber ${sub.subscriber_uuid} for creator ${sub.creator_uuid}...`);
      try {
        await db.transaction(async (trx) => {
          // Check balance
          const userWallet = await trx('wallets').where('user_id', sub.subscriber_uuid).forUpdate().first();
          
          if (!userWallet || parseFloat(userWallet.balance) < sub.amount) {
              // Failed to charge, cancel subscription
              await trx('subscriptions').where('id', sub.id).update({ status: 'expired' });
              console.log(`Subscription ${sub.id} failed: Insufficient balance.`);
              return;
          }

          // Deduct from subscriber
          await trx('wallets').where('user_id', sub.subscriber_uuid).update({
              balance: db.raw('balance - ?', [sub.amount])
          });

          // Add to creator
          await trx('wallets').where('user_id', sub.creator_uuid).update({
              balance: db.raw('balance + ?', [sub.amount]),
              total_earning: db.raw('total_earning + ?', [sub.amount])
          });

          // Update next billing
          const nextBilling = new Date(sub.next_billing_at);
          nextBilling.setMonth(nextBilling.getMonth() + 1);
          
          await trx('subscriptions').where('id', sub.id).update({
              next_billing_at: nextBilling,
              updated_at: db.fn.now()
          });

          // Record Transactions
          await trx('transactions').insert({
              user_id: sub.subscriber_uuid,
              type: 'subscription',
              amount: -sub.amount,
              status: 'success',
              description: `Perpanjangan langganan otomatis untuk kreator ${sub.creator_uuid}`
          });

          await trx('transactions').insert({
              user_id: sub.creator_uuid,
              from_user_id: sub.subscriber_uuid,
              type: 'subscription',
              amount: sub.amount,
              status: 'success',
              description: `Pendapatan langganan (perpanjangan) dari user ${sub.subscriber_uuid}`
          });
        });
        console.log(`Subscription ${sub.id} successfully renewed.`);
      } catch (err) {
        console.error(`Failed to process subscription ${sub.id}:`, err.message);
      }
    }
    
    console.log('Finished processing subscriptions.');
    process.exit(0);
  } catch (err) {
    console.error('Subscription processing failed:', err);
    process.exit(1);
  }
}

processRecurring();
