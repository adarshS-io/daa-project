import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  loadState,
  saveState,
  pairKey,
  adjacencyMatrix,
  warshall,
  directFriends,
  mutualFriends,
  reachable,
  recommendations,
  type NetworkState,
} from "@/lib/network";
import { Avatar } from "@/components/Avatar";
import { NetworkGraph } from "@/components/NetworkGraph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast, Toaster } from "sonner";
import {
  Users, UserPlus, Link2, Sparkles, Moon, Sun, LogIn, LogOut, Download,
  Search, Home, Network, Bell, Lock, BarChart3,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Social Network Connectivity Analyzer" },
      { name: "description", content: "Analyze friendship networks with Warshall's algorithm — discover mutual friends, reachability, and friend recommendations." },
    ],
  }),
  component: App,
});

function App() {
  const [state, setState] = useState<NetworkState>(() => loadState());
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("home");
  const [search, setSearch] = useState("");
  const [newUser, setNewUser] = useState("");
  const [fA, setFA] = useState<string>("");
  const [fB, setFB] = useState<string>("");
  const [mA, setMA] = useState<string>("");
  const [mB, setMB] = useState<string>("");
  const [analyzeFor, setAnalyzeFor] = useState<string>("");
  const [loginName, setLoginName] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [editPw, setEditPw] = useState("");

  useEffect(() => { saveState(state); }, [state]);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  const current = state.users.find((u) => u.id === state.currentUserId) || null;

  const filteredUsers = useMemo(
    () => state.users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase())),
    [state.users, search]
  );

  const adj = useMemo(() => adjacencyMatrix(state), [state]);
  const closure = useMemo(() => warshall(adj), [adj]);

  function addUser() {
    const name = newUser.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, "_");
    if (state.users.some((u) => u.id === id)) {
      toast.error("User already exists");
      return;
    }
    setState({
      ...state,
      users: [
        ...state.users,
        { id, name, password: "123456", avatarHue: Math.floor(Math.random() * 360), online: true },
      ],
    });
    setNewUser("");
    toast.success(`${name} joined the network`);
  }

  function removeUser(id: string) {
    setState({
      ...state,
      users: state.users.filter((u) => u.id !== id),
      friendships: state.friendships.filter((f) => !f.split("|").includes(id)),
      currentUserId: state.currentUserId === id ? null : state.currentUserId,
    });
  }

  function addFriendship() {
    if (!fA || !fB || fA === fB) {
      toast.error("Pick two different users");
      return;
    }
    const key = pairKey(fA, fB);
    if (state.friendships.includes(key)) {
      toast.info("Already friends");
      return;
    }
    setState({ ...state, friendships: [...state.friendships, key] });
    toast.success("Friendship created");
  }

  function login() {
    const u = state.users.find((x) => x.name.toLowerCase() === loginName.trim().toLowerCase());
    if (!u || u.password !== loginPw) {
      toast.error("Invalid credentials");
      return;
    }
    setState({ ...state, currentUserId: u.id });
    setLoginName(""); setLoginPw("");
    toast.success(`Welcome, ${u.name}`);
  }

  function updatePassword() {
    if (!current || editPw.length < 4) {
      toast.error("Password must be 4+ chars");
      return;
    }
    setState({
      ...state,
      users: state.users.map((u) => u.id === current.id ? { ...u, password: editPw } : u),
    });
    setEditPw("");
    toast.success("Password updated");
  }

  function analyze() {
    const id = analyzeFor;
    if (!id) { toast.error("Pick a user"); return; }
    const recs = recommendations(state, id);
    if (recs.length > 0) {
      const names = recs.map((r) => state.users.find((u) => u.id === r)?.name).join(", ");
      toast.success(`Suggested friends: ${names}`, { icon: "✨", duration: 5000 });
    } else {
      toast.info("No new recommendations");
    }
    setTab("analyze");
  }

  function exportReport() {
    const lines: string[] = ["Social Network Connectivity Report", "=".repeat(40), ""];
    lines.push(`Users: ${state.users.length}`);
    lines.push(`Friendships: ${state.friendships.length}`);
    lines.push("");
    for (const u of state.users) {
      lines.push(`@${u.name}`);
      lines.push(`  Direct: ${directFriends(state, u.id).map((id) => state.users.find((x) => x.id === id)?.name).join(", ") || "—"}`);
      const r = reachable(state, u.id).map((id) => state.users.find((x) => x.id === id)?.name);
      lines.push(`  Reachable: ${r.join(", ") || "—"}`);
      const rec = recommendations(state, u.id).map((id) => state.users.find((x) => x.id === id)?.name);
      lines.push(`  Recommended: ${rec.join(", ") || "—"}`);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "connectivity-report.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported");
  }

  const analyzeUser = state.users.find((u) => u.id === analyzeFor) || null;
  const reachSet = analyzeUser ? new Set(reachable(state, analyzeUser.id)) : undefined;
  const directSet = analyzeUser ? new Set(directFriends(state, analyzeUser.id)) : new Set<string>();
  const recsList = analyzeUser ? recommendations(state, analyzeUser.id) : [];
  const mutualList = mA && mB ? mutualFriends(state, mA, mB) : [];

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <Toaster position="top-center" richColors />

      {/* Navbar */}
      <header className="glass sticky top-0 z-40 border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-xl shadow-glow">
              <Network className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight md:text-base">Connectivity Analyzer</h1>
              <p className="text-[10px] text-muted-foreground md:text-xs">Warshall's friendship graph</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            {current ? (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full bg-secondary px-2 py-1 transition hover:scale-105">
                    <Avatar name={current.name} hue={current.avatarHue} online size={28} />
                    <span className="hidden text-xs font-medium md:inline">{current.name}</span>
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Your profile</DialogTitle></DialogHeader>
                  <div className="flex items-center gap-3">
                    <Avatar name={current.name} hue={current.avatarHue} online size={56} />
                    <div>
                      <p className="font-semibold">{current.name}</p>
                      <p className="text-xs text-muted-foreground">{directFriends(state, current.id).length} friends</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Change password</label>
                    <div className="flex gap-2">
                      <Input type="password" placeholder="New password" value={editPw} onChange={(e) => setEditPw(e.target.value)} />
                      <Button onClick={updatePassword}>Save</Button>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setState({ ...state, currentUserId: null })}>
                    <LogOut className="mr-2 h-4 w-4" /> Logout
                  </Button>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-primary text-primary-foreground shadow-glow">
                    <LogIn className="mr-1 h-4 w-4" /> Login
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Sign in</DialogTitle></DialogHeader>
                  <Input placeholder="Username (e.g. ANIL)" value={loginName} onChange={(e) => setLoginName(e.target.value)} />
                  <Input type="password" placeholder="Password (default 123456)" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} />
                  <Button onClick={login} className="gradient-primary text-primary-foreground">
                    <Lock className="mr-2 h-4 w-4" /> Sign in
                  </Button>
                  <p className="text-xs text-muted-foreground">Default password for all seeded users: <code className="rounded bg-muted px-1">123456</code></p>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="hidden w-full md:grid md:grid-cols-4">
            <TabsTrigger value="home"><Home className="mr-2 h-4 w-4" />Home</TabsTrigger>
            <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Users</TabsTrigger>
            <TabsTrigger value="analyze"><Sparkles className="mr-2 h-4 w-4" />Analyze</TabsTrigger>
            <TabsTrigger value="matrix"><BarChart3 className="mr-2 h-4 w-4" />Matrix</TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="mt-4 space-y-4">
            <Card className="glass animate-float-in shadow-card">
              <CardContent className="p-6">
                <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Map your social graph</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add friends, create connections, and let Warshall's algorithm find indirect reach.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="gradient-primary text-primary-foreground">{state.users.length} users</Badge>
                    <Badge className="gradient-accent text-accent-foreground">{state.friendships.length} friendships</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="animate-float-in shadow-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" />Add user</CardTitle></CardHeader>
                <CardContent className="flex gap-2">
                  <Input placeholder="Enter username" value={newUser} onChange={(e) => setNewUser(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addUser()} />
                  <Button onClick={addUser} className="gradient-primary text-primary-foreground shadow-glow transition hover:scale-105">Add</Button>
                </CardContent>
              </Card>

              <Card className="animate-float-in shadow-card">
                <CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-4 w-4" />Add friendship</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={fA} onValueChange={setFA}>
                      <SelectTrigger><SelectValue placeholder="User A" /></SelectTrigger>
                      <SelectContent>
                        {state.users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={fB} onValueChange={setFB}>
                      <SelectTrigger><SelectValue placeholder="User B" /></SelectTrigger>
                      <SelectContent>
                        {state.users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addFriendship} className="w-full gradient-accent text-accent-foreground transition hover:scale-[1.02]">Connect</Button>
                </CardContent>
              </Card>
            </div>

            <Card className="animate-float-in shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><Network className="h-4 w-4" />Live network</span>
                  <Button size="sm" variant="ghost" onClick={exportReport}><Download className="mr-2 h-4 w-4" />Export</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square w-full max-w-md mx-auto">
                  <NetworkGraph state={state} highlightFrom={analyzeFor || null} reachableSet={reachSet} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-4 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search users..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((u) => {
                const friends = directFriends(state, u.id);
                return (
                  <Card key={u.id} className="animate-float-in shadow-card transition hover:-translate-y-1 hover:shadow-glow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} hue={u.avatarHue} online={u.online} size={48} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{friends.length} friends • {u.online ? "online" : "offline"}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => removeUser(u.id)}>×</Button>
                      </div>
                      {friends.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {friends.slice(0, 6).map((fid) => {
                            const f = state.users.find((x) => x.id === fid);
                            return f ? <Badge key={fid} variant="secondary" className="text-[10px]">{f.name}</Badge> : null;
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="analyze" className="mt-4 space-y-4">
            <Card className="animate-float-in shadow-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Analyze network</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={analyzeFor} onValueChange={setAnalyzeFor}>
                    <SelectTrigger className="sm:flex-1"><SelectValue placeholder="Select a user" /></SelectTrigger>
                    <SelectContent>
                      {state.users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={analyze} className="gradient-primary text-primary-foreground shadow-glow">Analyze</Button>
                </div>

                {analyzeUser && (
                  <div className="grid gap-3 md:grid-cols-2">
                    <ResultBlock title="Direct connections" items={Array.from(directSet).map((id) => state.users.find((u) => u.id === id)!.name)} tone="primary" />
                    <ResultBlock
                      title="Reachable users"
                      items={Array.from(reachSet ?? []).map((id) => state.users.find((u) => u.id === id)!.name)}
                      tone="accent"
                    />
                    <ResultBlock
                      title="Friend recommendations"
                      items={recsList.map((id) => state.users.find((u) => u.id === id)!.name)}
                      tone="success"
                      empty="No new suggestions"
                    />
                    <Card className="bg-secondary/50">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Insight</CardTitle></CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        {recsList.length > 0 ? (
                          <>
                            <span className="font-medium text-foreground">{analyzeUser.name}</span> can indirectly reach{" "}
                            <span className="font-medium text-foreground">{state.users.find((u) => u.id === recsList[0])?.name}</span>.
                            We recommend connecting them.
                          </>
                        ) : "All reachable users are already direct friends."}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="animate-float-in shadow-card">
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Mutual friends</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={mA} onValueChange={setMA}>
                    <SelectTrigger><SelectValue placeholder="User A" /></SelectTrigger>
                    <SelectContent>
                      {state.users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={mB} onValueChange={setMB}>
                    <SelectTrigger><SelectValue placeholder="User B" /></SelectTrigger>
                    <SelectContent>
                      {state.users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {mA && mB && (
                  <div className="flex flex-wrap gap-2">
                    {mutualList.length === 0 && <p className="text-sm text-muted-foreground">No mutual friends.</p>}
                    {mutualList.map((id) => {
                      const u = state.users.find((x) => x.id === id)!;
                      return (
                        <div key={id} className="flex items-center gap-2 rounded-full bg-secondary px-2 py-1 animate-float-in">
                          <Avatar name={u.name} hue={u.avatarHue} size={24} />
                          <span className="text-xs font-medium">{u.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matrix" className="mt-4 space-y-4">
            <Card className="animate-float-in shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Transitive closure (Warshall)</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-1 text-[10px]">
                  <thead>
                    <tr>
                      <th></th>
                      {state.users.map((u) => (
                        <th key={u.id} className="rotate-[-45deg] px-1 text-left font-medium">{u.name.slice(0, 6)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.users.map((u, i) => (
                      <tr key={u.id}>
                        <td className="pr-2 text-right font-medium">{u.name.slice(0, 6)}</td>
                        {state.users.map((_, j) => (
                          <td
                            key={j}
                            className={`h-6 w-6 rounded text-center ${
                              i === j ? "bg-muted" : closure[i][j] ? (adj[i][j] ? "bg-primary text-primary-foreground" : "bg-accent/60 text-accent-foreground") : "bg-secondary/40"
                            }`}
                            title={closure[i][j] ? (adj[i][j] ? "Direct" : "Indirect") : "Unreachable"}
                          >
                            {i === j ? "•" : closure[i][j] ? "1" : "0"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <Legend color="bg-primary" label="Direct" />
                  <Legend color="bg-accent/60" label="Indirect" />
                  <Legend color="bg-secondary/40" label="Unreachable" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile bottom nav */}
      <nav className="glass fixed bottom-0 left-0 right-0 z-40 border-t md:hidden">
        <div className="grid grid-cols-4">
          {[
            { v: "home", icon: Home, label: "Home" },
            { v: "users", icon: Users, label: "Users" },
            { v: "analyze", icon: Sparkles, label: "Analyze" },
            { v: "matrix", icon: BarChart3, label: "Matrix" },
          ].map(({ v, icon: Icon, label }) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              className={`flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition ${tab === v ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function ResultBlock({ title, items, tone, empty }: { title: string; items: string[]; tone: "primary" | "accent" | "success"; empty?: string }) {
  const toneClass =
    tone === "primary" ? "gradient-primary text-primary-foreground"
    : tone === "accent" ? "gradient-accent text-accent-foreground"
    : "bg-emerald-500 text-white";
  return (
    <Card className="animate-float-in">
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{empty || "None"}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {items.map((n) => (
              <span key={n} className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass}`}>{n}</span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${color}`} />{label}</span>;
}
