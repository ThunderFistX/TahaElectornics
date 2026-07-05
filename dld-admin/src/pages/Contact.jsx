import { useEffect, useState } from 'react';
import { FiMail, FiMapPin, FiPhone, FiSend } from 'react-icons/fi';
import { API_URL } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const Contact = () => {
  const { token, user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'Project enquiry', message: '' });
  const [status, setStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [myMessages, setMyMessages] = useState([]);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    const loadMyMessages = async () => {
      if (!token) {
        setMyMessages([]);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/contact/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setMyMessages(data.messages || []);
        }
      } catch {
        setMyMessages([]);
      }
    };

    loadMyMessages();
  }, [token, status]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setStatus('');
    try {
      const response = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(form)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Message failed');
      setForm((prev) => ({ ...prev, message: '' }));
      setStatus('Your message was sent and saved for admin review.');
    } catch (err) {
      setStatus(err.message || 'Message failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-slate-950 text-white p-8 md:p-10">
            <span className="inline-flex px-3 py-1 rounded-full bg-emerald-400/15 text-emerald-200 text-xs font-bold uppercase tracking-wide">
              Contact Us
            </span>
            <h1 className="text-3xl md:text-4xl font-black mt-4 mb-4">Talk to the DLD project team</h1>
            <p className="text-slate-300 leading-7 mb-8">
              Send project questions, custom requirements, order issues, or delivery details. Logged-in user ids are saved with the message for admin.
            </p>
            <div className="space-y-4 text-sm">
              <p className="flex items-center gap-3"><FiMail className="text-emerald-300" /> Dld101@dldprojects.com</p>
              <p className="flex items-center gap-3"><FiPhone className="text-emerald-300" />03284473084</p>
              <p className="flex items-center gap-3"><FiMapPin className="text-emerald-300" /> Remote support for digital logic projects</p>
            </div>
          </div>

          <form onSubmit={submit} className="p-6 md:p-10 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Name</label>
                <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:outline-none focus:border-indigo-500" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email</label>
                <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:outline-none focus:border-indigo-500" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
                <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                <select value={form.subject} onChange={(e) => updateField('subject', e.target.value)} className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:outline-none focus:border-indigo-500 bg-white">
                  <option>Project enquiry</option>
                  <option>Custom project</option>
                  <option>Order support</option>
                  <option>Delivery question</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Message</label>
              <textarea value={form.message} onChange={(e) => updateField('message', e.target.value)} rows="6" className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 focus:outline-none focus:border-indigo-500 resize-none" required />
            </div>
            {status && <p className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-4 py-3 rounded-xl">{status}</p>}
            <button disabled={sending} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-2">
              <FiSend /> {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>
      {token && myMessages.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900 mb-5">Your contact requests</h2>
          <div className="space-y-4">
            {myMessages.map((item) => (
              <div key={item._id} className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-black text-slate-900">{item.subject || 'Contact request'}</p>
                    <p className="text-xs text-slate-400 mt-1">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.status === 'Replied' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {item.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-3">{item.message}</p>
                {item.adminReply?.message && (
                  <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700 mb-2">Admin Reply</p>
                    <p className="text-sm text-slate-700 leading-6">{item.adminReply.message}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Contact;
