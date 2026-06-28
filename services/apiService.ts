/**
 * TrekEasy API Service
 *
 * Centralises all data operations for the Frontend.
 * Backed by NestJS backend with MongoDB Atlas.
 *
 * ─── API BASE URL ──────────────────────────────────────────────────────────────
 * EXPO_PUBLIC_API_URL: The NestJS backend URL (default: http://localhost:3001/api)
 *
 * ─── JSON SCHEMA REFERENCE ───────────────────────────────────────────────────────
 *
 * User  (MongoDB collection: users)
 * ┌──────────────────────────┬──────────────────────────────────────────────┐
 * │ Field                    │ Type / Notes                                 │
 * ├──────────────────────────┼──────────────────────────────────────────────┤
 * │ id                       │ ObjectId                                     │
 * │ email                    │ string  unique                               │
 * │ name                     │ string                                       │
 * │ password                 │ string  bcrypt hashed                        │
 * │ profile                  │ UserProfile (see below)                      │
 * │ isOnboarded              │ boolean                                      │
 * │ lastLogin                │ ISO-8601 | null                              │
 * │ created_at               │ ISO-8601                                     │
 * │ updated_at               │ ISO-8601                                     │
 * └──────────────────────────┴──────────────────────────────────────────────┘
 *
 * UserProfile (embedded in User)
 * ┌──────────────────────────┬──────────────────────────────────────────────┐
 * │ Field                    │ Type / Notes (for KNN Classifier)            │
 * ├──────────────────────────┼──────────────────────────────────────────────┤
 * │ ageGroup                 │ number  0-3                                  │
 * │ experienceLevel          │ number  0-3                                  │
 * │ cardioRespiratoryIndicator│ number  0-1                               │
 * │ jointStability           │ number  0-1                                  │
 * │ altitudeHistory          │ number  0-3                                  │
 * └──────────────────────────┴──────────────────────────────────────────────┘
 *
 * UserLikes (MongoDB collection: user_likes)
 * ┌──────────────────────────┬──────────────────────────────────────────────┐
 * │ Field                    │ Type / Notes                                 │
 * ├──────────────────────────┼──────────────────────────────────────────────┤
 * │ id                       │ ObjectId                                     │
 * │ userId                   │ ObjectId  → FK to users._id                  │
 * │ trekId                   │ string  trek ID from DESTINATIONS            │
 * │ likedAt                  │ ISO-8601                                     │
 * └──────────────────────────┴──────────────────────────────────────────────┘
 *
 * Hotel  (MongoDB collection: hotels)
 * ┌──────────────────────────┬──────────────────────────────────────────────┐
 * │ Field                    │ Type / Notes                                 │
 * ├──────────────────────────┼──────────────────────────────────────────────┤
 * │ id                       │ ObjectId                                     │
 * │ name                     │ string                                       │
 * │ trek_destination_id      │ string  – references DESTINATIONS[].id       │
 * │ trek_destination_name    │ string                                       │
 * │ owner_contact            │ string  – phone or email                     │
 * │ price_per_package        │ number  – NPR                                │
 * │ location                 │ string  – e.g. "Chomrong, Annapurna"         │
 * │ capacity                 │ number  – max guests                         │
 * │ description              │ string | null                                │
 * │ image_url                │ string | null                                │
 * │ is_active                │ boolean                                      │
 * │ created_at               │ ISO-8601                                     │
 * │ updated_at               │ ISO-8601                                     │
 * └──────────────────────────┴──────────────────────────────────────────────┘
 *
 * ChatGroup  (MongoDB collection: chat_groups)
 * ┌──────────────────────────┬──────────────────────────────────────────────┐
 * │ Field                    │ Type / Notes                                 │
 * ├──────────────────────────┼──────────────────────────────────────────────┤
 * │ id                       │ ObjectId                                     │
 * │ name                     │ string                                       │
 * │ destination_id           │ string  – references DESTINATIONS[].id       │
 * │ destination_name         │ string                                       │
 * │ start_date               │ ISO date (YYYY-MM-DD) | null                 │
 * │ member_count             │ number                                       │
 * │ members                  │ { userId, name, joinedAt }[]                 │
 * │ booked_hotel_id          │ ObjectId | null  → FK to hotels._id          │
 * │ created_by               │ string  – user display name or ID            │
 * │ status                   │ 'active' | 'inactive' | 'completed'          │
 * │ created_at               │ ISO-8601                                     │
 * │ updated_at               │ ISO-8601                                     │
 * │ hotel (joined)           │ { name, location, price_per_package } | null │
 * └──────────────────────────┴──────────────────────────────────────────────┘
 *
 * Admin  (MongoDB collection: admins)
 * ┌──────────────────────────┬──────────────────────────────────────────────┐
 * │ Field                    │ Type / Notes                                 │
 * ├──────────────────────────┼──────────────────────────────────────────────┤
 * │ id                       │ ObjectId                                     │
 * │ username                 │ string  unique                               │
 * │ password_hash            │ string  bcrypt                               │
 * │ display_name             │ string                                       │
 * │ role                     │ 'admin' | 'super_admin'                      │
 * │ last_login               │ ISO-8601 | null                              │
 * │ created_at               │ ISO-8601                                     │
 * └──────────────────────────┴──────────────────────────────────────────────┘
 * ─────────────────────────────────────────────────────────────────────────────
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// Cross-platform storage (localStorage on web, in-memory fallback on native)
const memoryStore = new Map<string, string>();
const storage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return memoryStore.get(key) ?? null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { memoryStore.set(key, value); }
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch { memoryStore.delete(key); }
  },
};

const SESSION_KEY = 'trekEasyAdminSession';
const SESSION_TTL = 8 * 60 * 60 * 1000;

interface AdminSession {
  access_token: string;
  admin: { id: string; username: string; display_name: string; role: string };
  expiresAt: number;
}

function getSession(): AdminSession | null {
  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s: AdminSession = JSON.parse(raw);
    if (Date.now() > s.expiresAt) {
      storage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function setSession(data: Pick<AdminSession, 'access_token' | 'admin'>): void {
  try {
    storage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...data, expiresAt: Date.now() + SESSION_TTL })
    );
  } catch {}
}

function clearSession(): void {
  try { storage.removeItem(SESSION_KEY); } catch {}
}

function getAuthHeaders(): HeadersInit {
  const session = getSession();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  ageGroup: number;
  experienceLevel: number;
  cardioRespiratoryIndicator: number;
  jointStability: number;
  altitudeHistory: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  profile: UserProfile;
  isOnboarded: boolean;
  lastLogin: string | null;
}

export interface UserLike {
  trekId: string;
  likedAt: string;
}

export interface TopLikedTrek {
  trekId: string;
  likeCount: number;
}

export interface Hotel {
  id: string;
  name: string;
  trek_destination_id: string;
  trek_destination_name: string;
  owner_contact: string;
  price_per_package: number;
  location: string;
  capacity: number;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type HotelInput = Omit<Hotel, 'id' | 'created_at' | 'updated_at'>;

export interface ChatGroupMember {
  userId: string;
  name: string;
  joinedAt: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  destination_id: string;
  destination_name: string;
  start_date: string | null;
  member_count: number;
  members: ChatGroupMember[];
  booked_hotel_id: string | null;
  created_by: string;
  status: 'active' | 'inactive' | 'completed';
  created_at: string;
  updated_at: string;
  hotel?: {
    name: string;
    location: string;
    price_per_package: number;
  } | null;
}

export interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  role: 'admin' | 'super_admin';
  last_login: string | null;
  access_token?: string;
}

export interface DashboardStats {
  totalHotels: number;
  activeGroups: number;
  totalMembers: number;
  totalBookings: number;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  /** Login admin with username/password, returns admin with JWT token. */
  login: async (username: string, password: string): Promise<{ admin: AdminUser | null; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.error) return { admin: null, error: data.error };
      if (data.access_token && data.admin) {
        setSession({ access_token: data.access_token, admin: data.admin });
        return {
          admin: {
            id: data.admin.id,
            username: data.admin.username,
            display_name: data.admin.display_name,
            role: data.admin.role,
            last_login: null,
            access_token: data.access_token,
          },
        };
      }
      return { admin: null, error: 'Invalid response' };
    } catch {
      return { admin: null, error: 'Connection error' };
    }
  },

  /** Logout admin. */
  logout: async (): Promise<void> => {
    try {
      const headers = getAuthHeaders();
      await fetch(`${API_URL}/auth/admin/logout`, { method: 'POST', headers });
    } catch {}
    clearSession();
  },

  /** Get current admin from session. */
  getCurrentAdmin: (): AdminUser | null => {
    const session = getSession();
    if (!session) return null;
    return {
      id: session.admin.id,
      username: session.admin.username,
      display_name: session.admin.display_name,
      role: session.admin.role as 'admin' | 'super_admin',
      last_login: null,
      access_token: session.access_token,
    };
  },

  /** Check if admin session is valid. */
  isAuthenticated: (): boolean => {
    return getSession() !== null;
  },
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  /** Register a new user. */
  register: async (email: string, name: string, password: string): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await res.json();
      if (data.error) return null;
      return data as User;
    } catch {
      return null;
    }
  },

  /** Get current user profile. */
  getMe: async (): Promise<User | null> => {
    try {
      const res = await fetch(`${API_URL}/users/me`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.error) return null;
      return data as User;
    } catch {
      return null;
    }
  },

  /** Update user profile (KNN fields). */
  updateProfile: async (profile: UserProfile): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/users/profile`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  },

  /** Like a trek. */
  likeTrek: async (trekId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/users/me/likes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ trekId }),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  },

  /** Unlike a trek. */
  unlikeTrek: async (trekId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/users/me/unlike`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ trekId }),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  },

  /** Get user's liked treks. */
  getMyLikes: async (): Promise<UserLike[]> => {
    try {
      const res = await fetch(`${API_URL}/users/me/likes`, { headers: getAuthHeaders() });
      return await res.json();
    } catch {
      return [];
    }
  },

  /** Get top 3 most liked treks. */
  getTopLikedTreks: async (): Promise<TopLikedTrek[]> => {
    try {
      const res = await fetch(`${API_URL}/users/likes/top`);
      return await res.json();
    } catch {
      return [];
    }
  },

  /** Get like count for a trek. */
  getTrekLikeCount: async (trekId: string): Promise<number> => {
    try {
      const res = await fetch(`${API_URL}/users/likes/count/${trekId}`);
      const data = await res.json();
      return data.likeCount ?? 0;
    } catch {
      return 0;
    }
  },

  /** Check if trek is liked by current user. */
  isTrekLiked: async (trekId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/users/liked/${trekId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      return data.isLiked === true;
    } catch {
      return false;
    }
  },
};

// ─── Hotels API ───────────────────────────────────────────────────────────────

export const hotelsApi = {
  getAll: async (): Promise<Hotel[]> => {
    try {
      const res = await fetch(`${API_URL}/hotels`, { headers: getAuthHeaders() });
      return await res.json();
    } catch {
      return [];
    }
  },

  getActive: async (): Promise<Hotel[]> => {
    try {
      const res = await fetch(`${API_URL}/hotels/active`);
      return await res.json();
    } catch {
      return [];
    }
  },

  getById: async (id: string): Promise<Hotel | null> => {
    try {
      const res = await fetch(`${API_URL}/hotels/${id}`);
      const data = await res.json();
      if (data.error) return null;
      return data as Hotel;
    } catch {
      return null;
    }
  },

  create: async (hotel: HotelInput): Promise<{ success: boolean; id?: string; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/hotels`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(hotel),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  update: async (id: string, hotel: Partial<HotelInput>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/hotels/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(hotel),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/hotels/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  },
};

// ─── Chat Groups API ──────────────────────────────────────────────────────────

export const groupsApi = {
  getAll: async (): Promise<ChatGroup[]> => {
    try {
      const res = await fetch(`${API_URL}/groups`, { headers: getAuthHeaders() });
      return await res.json();
    } catch {
      return [];
    }
  },

  getById: async (id: string): Promise<ChatGroup | null> => {
    try {
      const res = await fetch(`${API_URL}/groups/${id}`);
      const data = await res.json();
      if (data.error) return null;
      return data as ChatGroup;
    } catch {
      return null;
    }
  },

  create: async (data: {
    name: string;
    destination_id: string;
    destination_name: string;
    start_date?: string;
    created_by: string;
  }): Promise<{ success: boolean; id?: string }> => {
    try {
      const res = await fetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  },

  update: async (id: string, data: Partial<ChatGroup>): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/groups/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const result = await res.json();
      return result.success === true;
    } catch {
      return false;
    }
  },

  bookHotel: async (groupId: string, hotelId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/groups/${groupId}/book-hotel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ hotelId }),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/groups/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data.success === true;
    } catch {
      return false;
    }
  },
};

// ─── Treks API ─────────────────────────────────────────────────────────────────

export interface RouteStage {
  day: number;
  from: string;
  to: string;
  distance: number;
  elevationGain: number;
  estimatedHours: number;
  checkpoint: string;
  restStop: string;
}

export interface Trek {
  id: string;
  name: string;
  description: string;
  region: string;
  difficulty: string;
  duration: number;
  price: number;
  maxAltitude: number;
  imageUrl: string | null;
  keywords: string[];
  routeStages: RouteStage[];
}

export const treksApi = {
  getAll: async (): Promise<Trek[]> => {
    try {
      const res = await fetch(`${API_URL}/treks`);
      return await res.json();
    } catch {
      return [];
    }
  },

  getById: async (id: string): Promise<Trek | null> => {
    try {
      const res = await fetch(`${API_URL}/treks/${id}`);
      const data = await res.json();
      if (data.error) return null;
      return data as Trek;
    } catch {
      return null;
    }
  },
};

// ─── Itinerary API ────────────────────────────────────────────────────────────

export interface ItineraryDay {
  day: number;
  from: string;
  to: string;
  distance: number;
  elevationGain: number;
  estimatedHours: number;
  checkpoint: string;
  restStops: string[];
}

export interface PersonalizedItinerary {
  trekName: string;
  totalDays: number;
  totalDistance: number;
  suitability: 'Low' | 'Moderate' | 'High';
  cautionMessage: string;
  itinerary: ItineraryDay[];
}

export const itineraryApi = {
  getForTrek: async (
    trekId: string,
    params?: {
      pace?: string;
      fitnessLevel?: string;
      trekkingExperience?: string;
      targetDays?: number;
      healthCondition?: string;
      age?: number;
      weight?: number;
      groupSize?: number;
      previousTreks?: number;
    },
  ): Promise<PersonalizedItinerary | null> => {
    try {
      const query = new URLSearchParams();
      if (params?.pace) query.set('pace', params.pace);
      if (params?.fitnessLevel) query.set('fitnessLevel', params.fitnessLevel);
      if (params?.trekkingExperience) query.set('trekkingExperience', params.trekkingExperience);
      if (params?.targetDays) query.set('targetDays', String(params.targetDays));
      if (params?.healthCondition) query.set('healthCondition', params.healthCondition);
      if (params?.age) query.set('age', String(params.age));
      if (params?.weight) query.set('weight', String(params.weight));
      if (params?.groupSize) query.set('groupSize', String(params.groupSize));
      if (params?.previousTreks) query.set('previousTreks', String(params.previousTreks));
      const qs = query.toString();
      const url = `${API_URL}/treks/${trekId}/itinerary${qs ? `?${qs}` : ''}`;
      const res = await fetch(url);
      return await res.json();
    } catch {
      return null;
    }
  },
};

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    try {
      const res = await fetch(`${API_URL}/dashboard/stats`, { headers: getAuthHeaders() });
      return await res.json();
    } catch {
      return { totalHotels: 0, activeGroups: 0, totalMembers: 0, totalBookings: 0 };
    }
  },

  getRecent: async (): Promise<{ recentHotels: Hotel[]; recentGroups: ChatGroup[] }> => {
    try {
      const res = await fetch(`${API_URL}/dashboard/recent`, { headers: getAuthHeaders() });
      return await res.json();
    } catch {
      return { recentHotels: [], recentGroups: [] };
    }
  },
};
