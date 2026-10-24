import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.PRINT_AGENT_TOKEN}`) return NextResponse.json({error:'Unauthorized'}, {status:401});
  try {
    const {id, ok, errorMessage} = await req.json();
    if (typeof id !== 'string' || typeof ok !== 'boolean') return NextResponse.json({error:'Invalid payload'}, {status:400});
    const db = adminDb();
    const update = ok
      ? {status:'printed', printed_at:new Date().toISOString(), print_error:null}
      : {status:'failed', print_error:String(errorMessage || 'Print command failed').slice(0,500)};
    const {error} = await db.from('print_orders').update(update).eq('id',id).eq('status','printing');
    if (error) throw error;
    return NextResponse.json({ok:true});
  } catch {
    return NextResponse.json({error:'Could not update print status'}, {status:500});
  }
}
