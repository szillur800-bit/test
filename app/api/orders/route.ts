import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase';
import { PDFDocument } from 'pdf-lib';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { filename, size, mode, copies } = await req.json();
    const maxBytes = Number(process.env.MAX_PDF_MB || 20) * 1024 * 1024;
    if (typeof filename !== 'string' || !filename.toLowerCase().endsWith('.pdf')) return NextResponse.json({error:'শুধু PDF ফাইল দিন'}, {status:400});
    if (!Number.isInteger(size) || size < 1 || size > maxBytes) return NextResponse.json({error:`PDF সর্বোচ্চ ${process.env.MAX_PDF_MB || 20} MB হতে পারবে`}, {status:400});
    if (!['bw','color'].includes(mode) || !Number.isInteger(copies) || copies < 1 || copies > 20) return NextResponse.json({error:'প্রিন্টের তথ্য সঠিক নয়'}, {status:400});

    const db = adminDb();
    const id = randomUUID();
    const path = `${id}.pdf`;
    const { data: signed, error: signErr } = await db.storage.from('pdf-orders').createSignedUploadUrl(path);
    if (signErr || !signed) throw new Error('Signed upload URL তৈরি করা যায়নি');

    // Create a temporary order. Page count and final amount are recalculated server-side
    // after upload by the payment endpoint; the client cannot choose the amount.
    const invoice = `PRN-${Date.now()}-${id.slice(0,8)}`;
    const unit = Number(mode === 'bw' ? process.env.PRICE_BW_PER_PAGE : process.env.PRICE_COLOR_PER_PAGE);
    if (!Number.isFinite(unit) || unit <= 0) throw new Error('Price environment variable is invalid');

    const { error } = await db.from('print_orders').insert({
      id, invoice_number: invoice, storage_path:path, original_filename:filename.slice(0,180),
      print_mode:mode, copies, page_count:1, amount:unit * copies, status:'awaiting_payment'
    });
    if (error) throw new Error('অর্ডার সংরক্ষণ করা যায়নি');
    return NextResponse.json({orderId:id, uploadUrl:signed.signedUrl, amount:unit*copies});
  } catch (e) {
    return NextResponse.json({error:e instanceof Error ? e.message : 'অর্ডার তৈরি করা যায়নি'}, {status:500});
  }
}
