import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Send,
  MessageCircle,
  Circle,
  ExternalLink,
  Sparkles,
  UserPlus,
  Newspaper,
  Filter,
  Clock3,
  Layers3,
  Bookmark,
  Compass,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getApiBaseUrl } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

type User = {
  id: string;
  name: string;
  headline?: string;
  skills?: string[];
  interests?: string[];
};

type Post = {
  id: string;
  authorId: string;
  content: string;
  tags: string[];
  createdAt: string;
  relevance?: number;
  author?: User;
  comments?: { id: string; content: string }[];
};

type DiscoveryPost = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt?: string;
  relevance?: number;
};

type Message = {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  createdAt: string;
};

const sourceBadgeStyles: Record<string, string> = {
  'dev.to': 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  reddit: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  hackernews: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
};

export default function CommunityPage() {
  const { profile } = useAppStore();
  const base = getApiBaseUrl();
  const currentUser = useMemo(
    () => ({
      id: 'user-1',
      name: profile?.name || 'Student',
      headline: profile?.course || 'B.Tech Student',
      skills: profile?.skills || [],
      interests: profile?.interests || [],
    }),
    [profile]
  );

  const [query, setQuery] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'dev.to' | 'reddit' | 'hackernews'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '24h' | '7d'>('all');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [discoveryPosts, setDiscoveryPosts] = useState<DiscoveryPost[]>([]);
  const [connections, setConnections] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [activeChat, setActiveChat] = useState<User | null>(null);
  const [typing, setTyping] = useState(false);
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});

  const [newPost, setNewPost] = useState('');
  const [messageText, setMessageText] = useState('');

  const loadCommunity = async () => {
    const [u, p, c, m] = await Promise.all([
      fetch(`${base}/api/community/users`).then((r) => r.json()),
      fetch(`${base}/api/community/feed?userId=${currentUser.id}`).then((r) => r.json()),
      fetch(`${base}/api/community/connections?userId=${currentUser.id}`).then((r) => r.json()),
      fetch(`${base}/api/community/messages?userId=${currentUser.id}`).then((r) => r.json()),
    ]);
    setUsers(u);
    setPosts(p);
    setConnections(c.map((x: any) => x.toId));
    setMessages(m);
  };

  const loadDiscovery = async (q: string) => {
    const data = await fetch(`${base}/api/community/discovery?userId=${currentUser.id}&q=${encodeURIComponent(q)}`).then((r) => r.json());
    setDiscoveryPosts(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const init = async () => {
      await fetch(`${base}/api/community/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentUser),
      });
      await Promise.all([loadCommunity(), loadDiscovery('')]);
    };
    void init();
  }, [base, currentUser]);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadCommunity();
    }, 12000);
    return () => clearInterval(timer);
  }, [base, currentUser.id]);

  useEffect(() => {
    const ids = users.filter((u) => u.id !== currentUser.id).map((u) => u.id);
    if (ids.length === 0) return;
    const poll = async () => {
      const data = await fetch(`${base}/api/community/presence?userIds=${ids.join(',')}`).then((r) => r.json());
      setOnlineIds(new Set<string>(data.filter((x: any) => x.online).map((x: any) => x.userId)));
    };
    void poll();
    const timer = setInterval(poll, 6000);
    return () => clearInterval(timer);
  }, [base, users, currentUser.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      void fetch(`${base}/api/community/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [base, currentUser.id]);

  useEffect(() => {
    if (!activeChat) return;
    const timer = setInterval(async () => {
      const t = await fetch(`${base}/api/community/typing?fromId=${activeChat.id}&toId=${currentUser.id}`).then((r) => r.json());
      setTyping(Boolean(t.typing));
    }, 2000);
    return () => clearInterval(timer);
  }, [activeChat, base, currentUser.id]);

  const onSearch = async () => {
    await loadDiscovery(query);
  };

  const onCreatePost = async () => {
    if (!newPost.trim()) return;
    await fetch(`${base}/api/community/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorId: currentUser.id, content: newPost, tags: currentUser.interests || [] }),
    });
    setNewPost('');
    await loadCommunity();
  };

  const toggleConnect = async (userId: string) => {
    if (userId === currentUser.id) return;
    await fetch(`${base}/api/community/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId: currentUser.id, toId: userId }),
    });
    await loadCommunity();
  };

  const sendMessage = async () => {
    if (!activeChat || !messageText.trim()) return;
    await fetch(`${base}/api/community/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId: currentUser.id, toId: activeChat.id, content: messageText }),
    });
    setMessageText('');
    setTyping(false);
    await loadCommunity();
  };

  const emitTyping = async () => {
    if (!activeChat) return;
    await fetch(`${base}/api/community/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId: currentUser.id, toId: activeChat.id }),
    });
  };

  const chatMessages = activeChat
    ? messages.filter((m) => (m.fromId === currentUser.id && m.toId === activeChat.id) || (m.fromId === activeChat.id && m.toId === currentUser.id))
    : [];

  const filteredPeople = users.filter((u) => u.id !== currentUser.id).filter((u) => {
    const q = peopleSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.headline || '').toLowerCase().includes(q) ||
      (u.skills || []).join(' ').toLowerCase().includes(q)
    );
  });

  const filteredDiscoveryPosts = useMemo(() => {
    const now = Date.now();
    return discoveryPosts.filter((p) => {
      if (sourceFilter !== 'all' && p.source !== sourceFilter) return false;
      if (timeFilter === 'all') return true;
      if (!p.publishedAt) return false;
      const age = now - new Date(p.publishedAt).getTime();
      if (timeFilter === '24h') return age <= 24 * 60 * 60 * 1000;
      if (timeFilter === '7d') return age <= 7 * 24 * 60 * 60 * 1000;
      return true;
    });
  }, [discoveryPosts, sourceFilter, timeFilter]);

  const liveSources = new Set(filteredDiscoveryPosts.map((p) => p.source)).size;
  const onlineCount = onlineIds.size;
  const networkPostCount = posts.length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-secondary/10 p-5 shadow-card"
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void onSearch();
                }}
                placeholder="Search topics, tech trends, job threads, people..."
                className="border-primary/20 bg-background/80 pl-9"
              />
            </div>
            <Button onClick={onSearch}>Search</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/80 p-3">
              <p className="text-xs text-muted-foreground">Live Sources</p>
              <p className="text-lg font-semibold">{liveSources}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/80 p-3">
              <p className="text-xs text-muted-foreground">People Online</p>
              <p className="text-lg font-semibold">{onlineCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-background/80 p-3">
              <p className="text-xs text-muted-foreground">Network Posts</p>
              <p className="text-lg font-semibold">{networkPostCount}</p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[260px_1fr_370px]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Filter className="h-4 w-4" />
                Feed Filters
              </div>
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Source</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['all', 'dev.to', 'reddit', 'hackernews'] as const).map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={sourceFilter === s ? 'secondary' : 'outline'}
                        onClick={() => setSourceFilter(s)}
                        className="justify-start text-xs"
                      >
                        <Layers3 className="mr-1 h-3 w-3" />
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs text-muted-foreground">Recency</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['all', '24h', '7d'] as const).map((t) => (
                      <Button
                        key={t}
                        size="sm"
                        variant={timeFilter === t ? 'secondary' : 'outline'}
                        onClick={() => setTimeFilter(t)}
                        className="justify-center text-xs"
                      >
                        <Clock3 className="mr-1 h-3 w-3" />
                        {t}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Compass className="h-4 w-4" />
                Post in Network
              </div>
              <Textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Share an update, ask a question, post a resource..."
                className="min-h-[100px]"
              />
              <Button className="mt-3 w-full" onClick={onCreatePost}>Post</Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                Relevant from Web
              </div>
              <div className="space-y-3">
                {filteredDiscoveryPosts.slice(0, 20).map((item, i) => (
                  <motion.a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="block rounded-xl border border-border/70 bg-background p-4 transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.title}</p>
                      <span className={`whitespace-nowrap rounded-full border px-2 py-1 text-[10px] ${sourceBadgeStyles[item.source] || 'bg-muted text-muted-foreground border-border'}`}>
                        {item.source}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Relevance {item.relevance ?? 0}</span>
                        <span className="inline-flex items-center gap-1">Open <ExternalLink className="h-3 w-3" /></span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
                          style={{ width: `${Math.min(100, item.relevance ?? 0)}%` }}
                        />
                      </div>
                    </div>
                  </motion.a>
                ))}
                {filteredDiscoveryPosts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    No external posts found for this filter.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <UserPlus className="h-4 w-4" />
                  Find People
                </div>
                <Input
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                  placeholder="Search name, headline, skills..."
                  className="mb-3"
                />
                <div className="max-h-56 space-y-2 overflow-auto">
                  {filteredPeople.map((u) => (
                    <div key={u.id} className="rounded-xl border border-border/70 p-3">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.headline}</p>
                        </div>
                        <Button
                          size="sm"
                          variant={connections.includes(u.id) ? 'secondary' : 'outline'}
                          onClick={() => void toggleConnect(u.id)}
                        >
                          {connections.includes(u.id) ? 'Connected' : 'Connect'}
                        </Button>
                      </div>
                      <p className="line-clamp-2 text-[11px] text-muted-foreground">{(u.skills || []).join(', ')}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <MessageCircle className="h-4 w-4" />
                  Chats
                </div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {filteredPeople.slice(0, 8).map((u) => (
                    <Button key={u.id} size="sm" variant={activeChat?.id === u.id ? 'secondary' : 'outline'} onClick={() => setActiveChat(u)}>
                      <Circle className={`mr-2 h-3 w-3 ${onlineIds.has(u.id) ? 'fill-green-500 text-green-500' : 'text-muted-foreground'}`} />
                      {u.name}
                    </Button>
                  ))}
                </div>

                {activeChat ? (
                  <div className="rounded-xl border border-border/70 p-3">
                    <p className="mb-2 text-sm font-semibold">
                      {activeChat.name} {onlineIds.has(activeChat.id) ? '(online)' : '(offline)'}
                    </p>
                    <div className="max-h-64 space-y-2 overflow-auto">
                      {chatMessages.map((m) => (
                        <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.fromId === currentUser.id ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted/60 text-foreground'}`}>
                          {m.content}
                        </div>
                      ))}
                      {typing && <p className="text-xs text-muted-foreground">typing...</p>}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={messageText}
                        onChange={(e) => {
                          setMessageText(e.target.value);
                          void emitTyping();
                        }}
                        placeholder="Type message..."
                      />
                      <Button size="sm" onClick={sendMessage}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a person to open chat.</p>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Newspaper className="h-4 w-4" />
                  Network Snapshot
                </div>
                <div className="space-y-2">
                  {posts.slice(0, 4).map((p) => (
                    <div key={p.id} className="rounded-lg border border-border/60 p-2">
                      <p className="line-clamp-2 text-xs text-foreground">{p.content}</p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{p.author?.name || 'Student'}</span>
                        <span>Rel {p.relevance ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
