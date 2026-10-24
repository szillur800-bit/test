import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase';
import { executeBkashPayment, queryBkashPayment } from '@/lib/bkash';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const site = process.env.SITE_URL || new URL(req.url).origin;
  const orderId = req.nextUrl.searchParams.get('orderId');
  const paymentID = req.nextUrl.searchParams.get('paymentID');
  const returnedStatus = req.nextUrl.searchParams.get('status');
  if (!orderId || !paymentID || returnedStatus === 'cancel' || returnedStatus === 'failure') {
    return NextResponse.redirect(`${site}/?payment=cancelled`);
  }
  try {
    const db = adminDb();
    const {data: order, error} = await db.from('print_orders').select('*').eq('id',orderId).single();
    if (error || !order || order.status !== 'payment_pending' || order.bkash_payment_id !== paymentID) {
      return NextResponse.redirect(`${site}/?payment=invalid`);
    }

    let result: Record<string, any>;
    try { result = await executeBkashPayment(paymentID); }
    catch { result = await queryBkashPayment(paymentID); }

    const status = String(result.transactionStatus || result.status || '');
    const paidAmount = Number(result.amount);
    const trxId = result.trxID || result.trxId || null;
    if (['Completed','Success','successful'].includes(status) && paidAmount === Number(order.amount) && String(result.currency || 'BDT') === 'BDT') {
      // Conditional update prevents duplicate callback from creating duplicate queue entries.
      await db.from('print_orders').update({
        status:'queued', payment_status:'Completed', bkash_trx_id:trxId, paid_at:new Date().toISOString()
      }).eq('id',order.id).eq('status','payment_pending');
      return NextResponse.redirect(`${site}/?payment=success`);
    }
    await db.from('print_orders').update({payment_status:status || 'Unverified'}).eq('id',order.id).eq('status','payment_pending');
    return NextResponse.redirect(`${site}/?payment=pending`);
  } catch {
    return NextResponse.redirect(`${site}/?payment=verify-error`);
  }
}
