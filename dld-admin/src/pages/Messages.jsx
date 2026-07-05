import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiMail, FiMessageSquare, FiSend } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const groupChatsBySession = (messages) => {
  const groups = messages.reduce((acc, item) => {
    const sessionId = item.sessionId || 'unknown-session';
    if (!acc[sessionId]) acc[sessionId] = [];
    acc[sessionId].push(item);
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([sessionId, items]) => {
      const sorted = [...items].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      const firstUserMessage = sorted.find((item) => item.sender !== 'Admin') || sorted[0];
      const latest = sorted[sorted.length - 1];
      return {
        sessionId,
        name: firstUserMessage?.name || firstUserMessage?.user?.name || 'Guest User',
        email: firstUserMessage?.email || firstUserMessage?.user?.email || 'No email',
        userId: firstUserMessage?.user?._id || firstUserMessage?.user || 'Guest',
        latest,
        messages: sorted
      };
    })
    .sort((a, b) => new Date(b.latest?.createdAt || 0) - new Date(a.latest?.createdAt || 0));
};

const Messages = () => {
  const { request } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeTab, setActiveTab] = useState('contacts');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyingId, setReplyingId] = useState('');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const [contactData, chatData] = await Promise.all([
        request('/contact'),
        request('/chat')
      ]);
      setContacts(contactData.messages || []);
      setChats(chatData.messages || []);
    } catch (err) {
      setMessage(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const chatThreads = useMemo(() => groupChatsBySession(chats), [chats]);
  const rows = activeTab === 'contacts' ? contacts : chats;

  const sendReply = async (id) => {
    const reply = String(replyDrafts[id] || '').trim();
    if (!reply) {
      setMessage('Please enter a reply first.');
      return;
    }

    setReplyingId(id);
    setMessage('');
    try {
      const data = await request(`/contact/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply })
      });
      setContacts((prev) => prev.map((item) => (item._id === id ? data.contactMessage : item)));
      setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
      setMessage('Reply saved. The user can see it on their Contact page.');
    } catch (err) {
      setMessage(err.message || 'Failed to save reply');
    } finally {
      setReplyingId('');
    }
  };

  const sendChatReply = async (sessionId) => {
    const reply = String(replyDrafts[sessionId] || '').trim();
    if (!reply) {
      setMessage('Please enter a reply first.');
      return;
    }

    setReplyingId(sessionId);
    setMessage('');
    try {
      await request('/chat', {
        method: 'POST',
        body: JSON.stringify({ sessionId, message: reply })
      });
      setReplyDrafts((prev) => ({ ...prev, [sessionId]: '' }));
      await loadMessages();
      setMessage('Reply sent to the user chat thread.');
    } catch (err) {
      setMessage(err.message || 'Failed to send chat reply');
    } finally {
      setReplyingId('');
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-dark">User Messages</h2>
        <div className="bg-white rounded-lg shadow-card p-1 flex">
          <button onClick={() => setActiveTab('contacts')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'contacts' ? 'bg-primary text-white' : 'text-gray-600'}`}>
            <FiMail /> Contact ({contacts.length})
          </button>
          <button onClick={() => setActiveTab('chats')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'chats' ? 'bg-primary text-white' : 'text-gray-600'}`}>
            <FiMessageSquare /> Chats ({chatThreads.length})
          </button>
        </div>
      </div>

      {message && <div className="mb-4 bg-indigo-50 text-indigo-700 px-4 py-3 rounded-lg text-sm font-semibold">{message}</div>}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading messages...</div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'chats' && chatThreads.map((thread) => (
            <div key={thread.sessionId} className="bg-white rounded-xl shadow-card p-5 border border-gray-100">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-dark">{thread.name}</h3>
                  <p className="text-sm text-gray-500">{thread.email}</p>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  User ID: {thread.userId}
                </span>
              </div>
              <p className="mt-3 text-xs text-gray-400">Chat session: {thread.sessionId}</p>

              <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
                {thread.messages.map((item) => {
                  const isAdmin = item.sender === 'Admin';
                  return (
                    <div key={item._id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-2xl rounded-xl px-4 py-3 ${isAdmin ? 'bg-primary text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>
                        <p className={`text-xs font-black uppercase tracking-wide mb-1 ${isAdmin ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {isAdmin ? 'Admin Reply' : item.name || item.user?.name || 'User'}
                        </p>
                        <p className="text-sm leading-6">{item.message}</p>
                        <p className={`text-[0.7rem] mt-2 ${isAdmin ? 'text-indigo-100' : 'text-slate-400'}`}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold text-dark mb-2">Reply to User</label>
                <textarea
                  value={replyDrafts[thread.sessionId] ?? ''}
                  onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [thread.sessionId]: event.target.value }))}
                  placeholder={`Reply to ${thread.email || 'this user'}...`}
                  rows="3"
                  className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => sendChatReply(thread.sessionId)}
                    disabled={replyingId === thread.sessionId}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    <FiSend /> {replyingId === thread.sessionId ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            </div>
          ))}

          {activeTab === 'contacts' && rows.map((item) => (
            <div key={item._id} className="bg-white rounded-xl shadow-card p-5 border border-gray-100">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-bold text-dark">{item.name || item.user?.name || 'Guest User'}</h3>
                  <p className="text-sm text-gray-500">{item.email || item.user?.email || 'No email'} {item.phone ? `| ${item.phone}` : ''}</p>
                </div>
                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                  User ID: {item.user?._id || item.user || 'Guest'}
                </span>
              </div>
              {item.subject && <p className="mt-3 text-sm font-bold text-primary">{item.subject}</p>}
              {item.sessionId && <p className="mt-3 text-xs text-gray-400">Chat session: {item.sessionId}</p>}
              <p className="mt-3 text-gray-700 leading-6">{item.message}</p>
              {activeTab === 'contacts' && item.adminReply?.message && (
                <div className="mt-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-700 mb-2">Admin Reply</p>
                  <p className="text-sm text-slate-700 leading-6">{item.adminReply.message}</p>
                  <p className="text-xs text-emerald-700 mt-2">
                    {item.adminReply.repliedAt ? new Date(item.adminReply.repliedAt).toLocaleString() : ''}
                    {item.adminReply.repliedBy?.name ? ` by ${item.adminReply.repliedBy.name}` : ''}
                  </p>
                </div>
              )}
              {activeTab === 'contacts' && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <label className="block text-sm font-bold text-dark mb-2">{item.adminReply?.message ? 'Update Reply' : 'Reply to User'}</label>
                  <textarea
                    value={replyDrafts[item._id] ?? ''}
                    onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [item._id]: event.target.value }))}
                    placeholder={`Reply to ${item.email || item.user?.email || 'this user'}...`}
                    rows="3"
                    className="w-full rounded-lg border-2 border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary"
                  />
                  <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                    <a
                      href={`mailto:${item.email || item.user?.email || ''}?subject=${encodeURIComponent(`Re: ${item.subject || 'tahaelectronics enquiry'}`)}&body=${encodeURIComponent(replyDrafts[item._id] || item.adminReply?.message || '')}`}
                      className="text-xs font-bold text-primary hover:text-primary-dark"
                    >
                      Open email app
                    </a>
                    <button
                      onClick={() => sendReply(item._id)}
                      disabled={replyingId === item._id}
                      className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      <FiSend /> {replyingId === item._id ? 'Saving...' : 'Save Reply'}
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-4 text-xs text-gray-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</p>
            </div>
          ))}
          {activeTab === 'contacts' && rows.length === 0 && <div className="text-center py-10 text-gray-400">No messages found.</div>}
          {activeTab === 'chats' && chatThreads.length === 0 && <div className="text-center py-10 text-gray-400">No chats found.</div>}
        </div>
      )}
    </section>
  );
};

export default Messages;
