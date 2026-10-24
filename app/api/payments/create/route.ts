import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase';
import { PDFDocument } from 'pdf-lib';
import { createBkashPayment } from '@/lib/bkash';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (typeof orderId !== 'string') return NextResponse.json({error:'অর্ডার আইডি সঠিক নয়'}, {status:400});
    const db = adminDb();
    const {data: order, error} = await db.from('print_orders').select('*').eq('id', orderId).single();
    if (error || !order || order.status !== 'awaiting_payment') return NextResponse.json({error:'অর্ডার পাওয়া যায়নি বা ইতিমধ্যে প্রসেস হয়েছে'}, {status:404});

    const {data: file, error: downloadErr} = await db.storage.from('pdf-orders').download(order.storage_path);
    if (downloadErr || !file) return NextResponse.json({error:'PDF ফাইল পাওয়া যায়নি'}, {status:400});
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes, {ignoreEncryption:false});
    const pages = pdf.getPageCount();
    if (pages < 1 || pages > 1000) return NextResponse.json({error:'PDF পৃষ্ঠা সংখ্যা গ্রহণযোগ্য সীমার বাইরে'}, {status:400});
    const unit = Number(order.print_mode === 'bw' ? process.env.PRICE_BW_PER_PAGE : process.env.PRICE_COLOR_PER_PAGE);
    const amount = Number((unit * pages * order.copies).toFixed(2));
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('মূল্য গণনায় সমস্যা হয়েছে');

    const {error: updateErr} = await db.from('print_orders').update({page_count:pages, amount, status:'payment_pending'}).eq('id', order.id).eq('status','awaiting_payment');
    if (updateErr) throw new Error('অর্ডার আপডেট করা যায়নি');

    const site = process.env.SITE_URL;
    if (!site) throw new Error('SITE_URL সেট করা নেই');
    const callbackURL = `${site}/api/payments/callback?orderId=${encodeURIComponent(order.id)}`;
    const payment = await createBkashPayment(amount.toFixed(2), order.invoice_number, callbackURL);
    const {error: saveErr} = await db.from('print_orders').update({bkash_payment_id:payment.paymentID}).eq('id',order.id);
    if (saveErr) throw new Error('পেমেন্ট আইডি সংরক্ষণ করা যায়নি');
    return NextResponse.json({bkashURL:payment.bkashURL});
  } catch (e) {
    return NextResponse.json({error:e instanceof Error ? e.message : 'পেমেন্ট শুরু করা যায়নি'}, {status:500});
  }
}
