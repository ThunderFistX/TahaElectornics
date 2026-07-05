import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiInbox, FiMessageCircle, FiMoreHorizontal, FiSend, FiShoppingBag, FiStar } from 'react-icons/fi';
import { API_URL } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const getSessionId = () => {
  const key = 'dld_chat_session';
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
};

const formatTime = (value) => {
  if (!value) return 'Now';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const groupMessages = (messages) => {
  const groups = messages.reduce((acc, message) => {
    const sessionId = message.sessionId || 'unknown-session';
    if (!acc[sessionId]) acc[sessionId] = [];
    acc[sessionId].push(message);
    return acc;
  }, {});

  return Object.entries(groups)
    .map(([sessionId, items]) => {
      const sorted = [...items].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      const firstUser = sorted.find((item) => item.sender !== 'Admin') || sorted[0];
      const latest = sorted[sorted.length - 1];
      const unread = sorted.filter((item) => item.sender !== 'Admin' && item.status === 'New').length;
      return {
        sessionId,
        name: firstUser?.name || firstUser?.user?.name || 'Customer Chat',
        meta: firstUser?.email || firstUser?.user?.email || 'Support thread',
        preview: latest?.message || 'No messages yet',
        time: formatTime(latest?.createdAt),
        unread,
        messages: sorted
      };
    })
    .sort((a, b) => new Date(b.messages[b.messages.length - 1]?.createdAt || 0) - new Date(a.messages[a.messages.length - 1]?.createdAt || 0));
};

const ConsolePreview = () => {
  const { token, user, isLoggedIn, isAdmin } = useAuth();
  const [sessionId] = useState(() => getSessionId());
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const userEmail = user?.email || '';

  const loadChats = useCallback(async () => {
    if (!isLoggedIn || !token) {
      setConversations([]);
      setActiveId('');
      return;
    }

    setLoading(true);
    setStatus('');
    try {
      const path = isAdmin ? '/chat' : `/chat/session/${encodeURIComponent(sessionId)}`;
      const response = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to load chats');

      const nextConversations = isAdmin
        ? groupMessages(data.messages || [])
        : [{
            sessionId,
            name: 'Admin Support',
            meta: userEmail || 'Your support thread',
            preview: data.messages?.[data.messages.length - 1]?.message || 'Start a conversation with admin',
            time: formatTime(data.messages?.[data.messages.length - 1]?.createdAt),
            unread: 0,
            messages: data.messages || []
          }];

      setConversations(nextConversations);
      setActiveId((current) => {
        if (nextConversations.some((conversation) => conversation.sessionId === current)) return current;
        return nextConversations[0]?.sessionId || '';
      });
    } catch (err) {
      setStatus(err.message || 'Unable to load chats');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isLoggedIn, sessionId, token, userEmail]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const activeConversation = useMemo(() => {
    return conversations.find((conversation) => conversation.sessionId === activeId) || conversations[0];
  }, [activeId, conversations]);

  const activeMessages = activeConversation?.messages || [];
  const sentMessages = useMemo(() => {
    const sender = isAdmin ? 'Admin' : 'User';
    return conversations
      .flatMap((conversation) => conversation.messages)
      .filter((message) => message.sender === sender)
      .slice(-3)
      .reverse();
  }, [conversations, isAdmin]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    if (!isLoggedIn || !token) {
      setStatus('Please login first to message admin.');
      return;
    }

    const targetSessionId = activeConversation?.sessionId || sessionId;
    setSending(true);
    setStatus('');
    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sessionId: targetSessionId, message: draft })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to send message');
      setDraft('');
      await loadChats();
      setStatus('Message sent.');
    } catch (err) {
      setStatus(err.message || 'Unable to send message');
    } finally {
      setSending(false);
    }
  };

  const totalMessages = conversations.reduce((total, conversation) => total + conversation.messages.length, 0);
  const resolvedRate = totalMessages > 0 ? Math.round((sentMessages.length / totalMessages) * 100) : 0;
  const quickStats = [
    { label: 'Open Chats', value: String(conversations.length), icon: <FiInbox /> },
    { label: 'Sent', value: String(sentMessages.length), icon: <FiSend /> },
    { label: 'Replies', value: `${resolvedRate}%`, icon: <FiCheckCircle /> }
  ];

  return (
    <section className="bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_48%,#ecfeff_100%)]">
      <div className="responsive-section py-14 sm:py-16 lg:py-20">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-800">
              <FiMessageCircle /> Message Hub
            </span>
            <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
              A sharper workspace for store conversations.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {isAdmin ? 'Reply to customer chat sessions and keep product support moving from one clean dashboard.' : 'Chat directly with admin about sellers, printers, money counting machines, and orders.'}
            </p>
          </div>
          <div className="gradient-card grid grid-cols-1 gap-3 rounded-[8px] p-2 shadow-xl shadow-slate-200/70 sm:grid-cols-3">
            {quickStats.map((stat) => (
              <div key={stat.label} className="min-w-0 rounded-xl bg-slate-50 px-4 py-3 text-center ring-1 ring-slate-100">
                <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-emerald-700 shadow-sm">
                  {stat.icon}
                </div>
                <p className="text-lg font-black text-slate-950">{stat.value}</p>
                <p className="text-[0.65rem] font-black uppercase tracking-wide text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid overflow-hidden rounded-[8px] bg-white shadow-2xl shadow-slate-300/60 ring-1 ring-slate-200 lg:grid-cols-[21rem_1fr]">
          <aside className="gradient-footer border-b border-white/10 p-4 text-white lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Chat List</p>
                <h3 className="text-xl font-black">Inbox</h3>
              </div>
              <button type="button" onClick={loadChats} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-emerald-400 hover:text-slate-950" aria-label="Refresh chats" title="Refresh chats">
                <FiMoreHorizontal />
              </button>
            </div>

            <div className="space-y-3">
              {!isLoggedIn && (
                <div className="rounded-2xl bg-white p-4 text-slate-950">
                  <p className="font-black">Login required</p>
                  <p className="mt-1 text-sm text-slate-600">Sign in to start a chat with admin.</p>
                  <Link to="/auth" className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-emerald-600">
                    Login
                  </Link>
                </div>
              )}
              {isLoggedIn && loading && <p className="rounded-2xl bg-white/10 p-4 text-sm font-bold text-slate-300">Loading chats...</p>}
              {isLoggedIn && !loading && conversations.length === 0 && <p className="rounded-2xl bg-white/10 p-4 text-sm font-bold text-slate-300">No chats yet.</p>}
              {conversations.map((conversation) => {
                const isActive = conversation.sessionId === activeId;
                return (
                  <button
                    key={conversation.sessionId}
                    type="button"
                    onClick={() => setActiveId(conversation.sessionId)}
                    className={`w-full rounded-[8px] p-4 text-left ring-1 transition ${isActive ? 'bg-white text-slate-950 shadow-lg ring-white' : 'bg-white/[0.08] text-white ring-white/10 hover:bg-white/[0.14]'}`}
                    aria-pressed={isActive}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-black">{conversation.name}</span>
                        <span className={`mt-1 block text-xs font-bold ${isActive ? 'text-emerald-700' : 'text-slate-300'}`}>{conversation.meta}</span>
                      </span>
                      <span className={`text-xs font-bold ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>{conversation.time}</span>
                    </span>
                    <span className={`mt-3 flex items-center justify-between gap-3 text-sm ${isActive ? 'text-slate-600' : 'text-slate-300'}`}>
                      <span className="line-clamp-1">{conversation.preview}</span>
                      {conversation.unread > 0 && (
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-400 px-2 text-xs font-black text-slate-950">
                          {conversation.unread}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="grid min-h-[32rem] bg-slate-50 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <section className="flex min-h-0 flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Active Thread</p>
                  <h3 className="text-xl font-black text-slate-950">{activeConversation?.name || 'Admin Support'}</h3>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800">
                  <FiClock /> Live
                </span>
              </div>

              <div className="flex-1 space-y-4 p-5">
                {status && <p className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700">{status}</p>}
                {activeMessages.length === 0 && (
                  <div className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-500 ring-1 ring-slate-200">
                    {isLoggedIn ? 'No messages yet. Send the first message to admin.' : 'Login to start a chat thread.'}
                  </div>
                )}
                {activeMessages.map((message) => {
                  const isSent = isAdmin ? message.sender === 'Admin' : message.sender !== 'Admin';
                  return (
                    <article key={message._id || `${message.createdAt}-${message.message}`} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] rounded-[8px] px-4 py-3 shadow-sm sm:max-w-[78%] ${isSent ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
                        <p className={`mb-1 text-xs font-black uppercase tracking-wide ${isSent ? 'text-emerald-100' : 'text-slate-400'}`}>{message.sender === 'Admin' ? 'Admin' : message.name || 'User'}</p>
                        <p className="text-sm leading-6">{message.message}</p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <form onSubmit={sendMessage} className="border-t border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    disabled={!isLoggedIn || sending || (isAdmin && !activeConversation)}
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder={isLoggedIn ? `Type a reply for ${activeConversation?.name || 'admin'}...` : 'Login to send a message...'}
                  />
                  <button type="submit" disabled={!isLoggedIn || sending || !draft.trim()} className="gradient-button flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message" title="Send message">
                    <FiSend />
                  </button>
                </div>
              </form>
            </section>

            <aside className="border-t border-slate-200 bg-white p-5 lg:border-l lg:border-t-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Sent Messages</p>
              <div className="mt-4 space-y-3">
                {sentMessages.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">No sent messages yet.</p>}
                {sentMessages.map((message) => (
                  <div key={message._id || `${message.createdAt}-${message.message}`} className="gradient-card rounded-[8px] p-4 shadow-sm hover:-translate-y-1 hover:shadow-lg">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <FiSend />
                    </div>
                    <p className="text-sm font-black text-slate-950">{message.message}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Delivered to chat thread</p>
                  </div>
                ))}
              </div>

              <div className="gradient-banner mt-5 rounded-[8px] p-4 text-white shadow-xl">
                <div className="flex items-center gap-2 text-emerald-300">
                  <FiStar />
                  <p className="text-xs font-black uppercase tracking-[0.18em]">Priority</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">Seller requests and printer support stay visible until a reply is sent.</p>
                <div className="mt-4 flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold">
                  <FiShoppingBag /> Store ready
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConsolePreview;
