'use client';
import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'bw'|'color'>('bw');
  const [copies, setCopies] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState<number | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setMessage('প্রথমে একটি PDF ফাইল নির্বাচন করুন।'); return; }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setMessage('শুধু PDF ফাইল গ্রহণ করা হবে।'); return;
    }
    setBusy(true); setMessage('ফাইল যাচাই হচ্ছে…');
    try {
      const init = await fetch('/api/orders', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ filename: file.name, size: file.size, mode, copies })
      });
      const data = await init.json();
      if (!init.ok) throw new Error(data.error || 'অর্ডার তৈরি করা যায়নি');
      const upload = await fetch(data.uploadUrl, {
        method: 'PUT', headers: {'Content-Type':'application/pdf'}, body: file
      });
      if (!upload.ok) throw new Error('PDF আপলোড হয়নি। আবার চেষ্টা করুন।');
      const pay = await fetch('/api/payments/create', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({orderId:data.orderId})
      });
      const payment = await pay.json();
      if (!pay.ok) throw new Error(payment.error || 'পেমেন্ট শুরু করা যায়নি');
      setAmount(data.amount);
      window.location.href = payment.bkashURL;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'একটি সমস্যা হয়েছে');
      setBusy(false);
    }
  }

  return <main><div className="card">
    <h1>PDF অনলাইন প্রিন্ট</h1>
    <p className="hint">PDF আপলোড করুন, প্রিন্টের ধরন নির্বাচন করুন এবং bKash দিয়ে পেমেন্ট করুন। পেমেন্ট নিশ্চিত হলে দোকানের প্রিন্টারে কাজ পাঠানো হবে।</p>
    <form onSubmit={submit}>
      <label>PDF ফাইল</label>
      <input type="file" accept="application/pdf,.pdf" onChange={e=>setFile(e.target.files?.[0] || null)} required />
      <label>প্রিন্টের ধরন</label>
      <select value={mode} onChange={e=>setMode(e.target.value as 'bw'|'color')}>
        <option value="bw">সাদা-কালো</option><option value="color">কালার</option>
      </select>
      <label>কপি সংখ্যা</label>
      <input type="number" min={1} max={20} value={copies} onChange={e=>setCopies(Math.max(1,Math.min(20,Number(e.target.value))))} />
      {amount !== null && <div className="price">আনুমানিক মূল্য: ৳{amount.toFixed(2)}</div>}
      <button disabled={busy} type="submit">{busy ? 'প্রসেস হচ্ছে…' : 'PDF আপলোড করে bKash পেমেন্ট করুন'}</button>
    </form>
    {message && <p className="hint" role="status">{message}</p>}
    <p className="hint">গোপনীয়তা: সংবেদনশীল বা ব্যক্তিগত নথি আপলোড করার আগে নিশ্চিত হোন যে এটি প্রিন্টের জন্য উপযুক্ত।</p>
  </div></main>;
}
