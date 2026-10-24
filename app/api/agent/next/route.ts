import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.PRINT_AGENT_TOKEN}`) return NextResponse.json({error:'Unauthorized'}, {status:401});
  try {
    const db = adminDb();
    // Claim a single queued order with a conditional update. For high-volume production,
    // replace this with a Postgres RPC using FOR UPDATE SKIP LOCKED.
    const {data: candidates, error} = await db.from('print_orders').select('*').eq('status','queued').order('created_at',{ascending:true}).limit(1);
    if (error) throw error;
    if (!candidates?.length) return NextResponse.json({job:null});
    const order = candidates[0];
    const {data: claimed} = await db.from('print_orders').update({status:'printing'}).eq('id',order.id).eq('status','queued').select('*').maybeSingle();
    if (!claimed) return NextResponse.json({job:null});
    const {data: signed, error: signErr} = await db.storage.from('pdf-orders').createSignedUrl(order.storage_path, 120);
    if (signErr || !signed) {
      await db.from('print_orders').update({status:'failed',print_error:'Could not create signed download URL'}).eq('id',order.id);
      throw new Error('Could not create signed PDF URL');
    }
    return NextResponse.json({job:{id:order.id, url:signed.signedUrl, filename:order.original_filename, mode:order.print_mode, copies:order.copies}});
  } catch {
    return NextResponse.json({error:'Agent queue error'}, {status:500});
  }
}
