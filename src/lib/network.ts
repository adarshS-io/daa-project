export type User = {
  id: string;
  name: string;
  password: string;
  avatarHue: number;
  online: boolean;
};

export type NetworkState = {
  users: User[];
  // adjacency as set of "a|b" sorted pairs
  friendships: string[];
  currentUserId: string | null;
};

const KEY = "sna-network-v1";

const DEFAULT_NAMES = [
  "ANIL", "NINGAPPA", "ADARSH", "RANGEGOWDA",
  "PAVAN", "AMEYA", "SANTHOSH", "SUMITH", "HARSH",
];

export function pairKey(a: string, b: string) {
  return [a, b].sort().join("|");
}

export function loadState(): NetworkState {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as NetworkState;
  } catch {
    return seed();
  }
}

export function saveState(state: NetworkState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

function seed(): NetworkState {
  const users: User[] = DEFAULT_NAMES.map((name, i) => ({
    id: name.toLowerCase(),
    name,
    password: "123456",
    avatarHue: Math.round((i / DEFAULT_NAMES.length) * 360),
    online: Math.random() > 0.4,
  }));
  // sample edges that demonstrate indirect reachability
  // RANGEGOWDA -> PAVAN -> AMEYA (indirect)
  const fs = [
    ["anil", "ningappa"],
    ["anil", "adarsh"],
    ["adarsh", "rangegowda"],
    ["rangegowda", "pavan"],
    ["pavan", "ameya"],
    ["ameya", "santhosh"],
    ["santhosh", "sumith"],
    ["sumith", "harsh"],
    ["ningappa", "harsh"],
  ].map(([a, b]) => pairKey(a, b));
  return { users, friendships: fs, currentUserId: null };
}

export function adjacencyMatrix(state: NetworkState): boolean[][] {
  const n = state.users.length;
  const idx = new Map(state.users.map((u, i) => [u.id, i]));
  const m: boolean[][] = Array.from({ length: n }, () => Array(n).fill(false));
  for (let i = 0; i < n; i++) m[i][i] = true;
  for (const f of state.friendships) {
    const [a, b] = f.split("|");
    const ai = idx.get(a), bi = idx.get(b);
    if (ai === undefined || bi === undefined) continue;
    m[ai][bi] = true;
    m[bi][ai] = true;
  }
  return m;
}

// Warshall's transitive closure
export function warshall(adj: boolean[][]): boolean[][] {
  const n = adj.length;
  const reach = adj.map((r) => r.slice());
  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        reach[i][j] = reach[i][j] || (reach[i][k] && reach[k][j]);
  return reach;
}

export function directFriends(state: NetworkState, userId: string): string[] {
  return state.friendships
    .filter((f) => f.split("|").includes(userId))
    .map((f) => f.split("|").find((x) => x !== userId)!)
    .filter(Boolean);
}

export function mutualFriends(state: NetworkState, a: string, b: string): string[] {
  const A = new Set(directFriends(state, a));
  return directFriends(state, b).filter((x) => A.has(x));
}

export function reachable(state: NetworkState, userId: string): string[] {
  const adj = adjacencyMatrix(state);
  const reach = warshall(adj);
  const idx = state.users.findIndex((u) => u.id === userId);
  if (idx < 0) return [];
  return state.users
    .map((u, j) => (j !== idx && reach[idx][j] ? u.id : null))
    .filter((x): x is string => Boolean(x));
}

export function recommendations(state: NetworkState, userId: string): string[] {
  const direct = new Set(directFriends(state, userId));
  const r = reachable(state, userId);
  return r.filter((id) => !direct.has(id));
}
