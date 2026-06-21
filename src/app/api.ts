import { API_BASE_URL } from "./config";

const AUTH_TOKEN_KEY = "masterstudio.authToken";

const getAuthToken = () => {
  try {
    return window.sessionStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

const authHeaders = (extra: HeadersInit = {}) => {
  const token = getAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
};

export const setAuthToken = (token: string) => {
  if (token) window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
  else window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
};

export interface EventData {
  id: string;
  name: string;
  date: string;
  photos: string;
  guests: number;
  qr: boolean;
  status: string;
  revenue: string;
  client_name?: string;
  client_mobile?: string;
  photographer_email?: string;
  photographer_name?: string;
  photographer_logo_url?: string;
  photographer_brand_name?: string;
  photographer_rights_text?: string;
  photographer_instagram_url?: string;
  photographer_facebook_url?: string;
  photographer_website_url?: string;
  photographer_whatsapp_url?: string;
  created_at?: string;
}

export interface EventQrPayloadData {
  event_id: string;
  event_name: string;
  event_date: string;
  public_path: string;
  photographer_name?: string;
  photographer_email?: string;
  brand_name?: string;
  brand_logo_url?: string;
  brand_rights_text?: string;
  instagram_url?: string;
  facebook_url?: string;
  website_url?: string;
  whatsapp_url?: string;
}

export interface PhotoData {
  id: number;
  event_id: string;
  name: string;
  preview_name?: string;
  preview_url?: string;
  original_url?: string;
  size: string;
  size_bytes?: number;
  progress: number;
  status: string;
  faces_count?: number;
}

export interface StorageSummaryData {
  used_bytes: number;
  quota_bytes: number;
  used: string;
  quota: string;
  percent: number;
}

export interface StoragePolicyData {
  quota_per_photographer: string;
  backup_retention_days: number;
  cleanup_failed_job_days: number;
  auto_archive_days: number;
  delete_originals_after_days: number;
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  previews_only_after_cleanup: boolean;
  original_storage: string;
  preview_storage: string;
  client_delivery: string;
}

export interface StorageTenantData {
  photographer_id: string;
  photographer_name: string;
  photographer_email: string;
  quota_gb: number;
  quota_bytes: number;
  used_bytes: number;
  used: string;
  percent: number;
  photo_count: number;
  event_count: number;
  status: string;
  warning_level: string;
}

export interface StorageReportData {
  total_used_bytes: number;
  total_used: string;
  total_quota_bytes: number;
  total_quota: string;
  free_bytes: number;
  free: string;
  percent: number;
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  tenants: StorageTenantData[];
}

export interface StorageCleanupData {
  dry_run: boolean;
  cutoff_days: number;
  eligible_photos: number;
  affected_events: number;
  reclaimable_bytes: number;
  reclaimable: string;
  originals_deleted: number;
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  avatar_url?: string;
  brand_logo_url?: string;
  brand_name?: string;
  brand_rights_text?: string;
  instagram_url?: string;
  facebook_url?: string;
  website_url?: string;
  whatsapp_url?: string;
  address?: string;
  about_studio?: string;
  verification_status?: string;
  brand_change_request?: string;
  events_count: number;
  joined: string;
  plan: string;
  status: string;
  storage_quota_gb?: number;
  must_change_password?: boolean;
  first_login_done?: boolean;
  password?: string;
  temp_password?: string;
}

export interface ContactMessageData {
  id: number;
  name: string;
  email: string;
  message: string;
  date: string;
}

export interface PhotoSelectionData {
  id: number;
  event_id: string;
  photo_id: number;
  photo_name: string;
  preview_url?: string;
  guest_mobile: string;
  guest_name: string;
  status: string;
  created_at: string;
}

export interface LeadData {
  id: number;
  event_id: string;
  event_name: string;
  name: string;
  mobile: string;
  search_count: number;
  created_at: string;
}

export interface LeadStatsData {
  total_leads: number;
  total_scans: number;
  active_events: number;
  storage_used_gb: number;
}

export interface AuditLogData {
  id: number;
  actor_id?: string;
  actor_email?: string;
  actor_role?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  result: string;
  ip_address?: string;
  user_agent?: string;
  details?: string;
  created_at: string;
}

export interface PhotographerValidationRow {
  id: string;
  name: string;
  email: string;
  status: string;
  verification_status: string;
  plan: string;
  profile_done: boolean;
  event_created: boolean;
  photos_uploaded: boolean;
  qr_shared: boolean;
  guests_used: boolean;
  client_selection_used: boolean;
  event_count: number;
  photo_count: number;
  guest_count: number;
  search_count: number;
  download_count: number;
  selection_count: number;
}

export interface ValidationSummaryData {
  target_photographers: number;
  target_guests: number;
  target_real_events: number;
  photographers_registered: number;
  active_photographers: number;
  active_events: number;
  real_events: number;
  photos_uploaded: number;
  guest_accesses: number;
  guest_searches: number;
  downloads: number;
  client_selections: number;
  feedback_messages: number;
  payment_interest: number;
  photographers: PhotographerValidationRow[];
}

export interface PaymentTransactionData {
  id: string;
  amount: string;
  status: string;
  date: string;
  plan: string;
}

export interface WhatsAppSettingsData {
  method: string;
  provider: string;
  enabled: boolean;
  api_token: string;
  phone_number_id: string;
  business_account_id: string;
  welcome_template_name: string;
  otp_template_name: string;
  gallery_template_name: string;
  language_code: string;
  daily_limit: number;
  test_mobile: string;
  notify_photographer_approval: boolean;
  notify_guest_otp: boolean;
  notify_gallery_ready: boolean;
  notes: string;
}

export interface LoginResponseData {
  access_token: string;
  token_type: string;
  role: "super_admin" | "photographer" | "user";
  email: string;
  session_id?: string;
}

export interface PaymentData {
  id: string;
  client: string;
  event: string;
  amount: string;
  status: string;
  date: string;
}

export interface MatchData {
  photo_id: number;
  name: string;
  url: string;
  similarity: number;
}

export interface SearchResult {
  search_log_id: string;
  guest: string;
  event: string;
  status: string;
  matches: MatchData[];
}

export const api = {
  setAuthToken,

  async login(email: string, password: string, role: "super_admin" | "photographer" | "user"): Promise<LoginResponseData> {
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Invalid login credentials");
    }
    const data = await res.json();
    setAuthToken(data.access_token);
    return data;
  },

  async fetchEvents(photographerEmail?: string): Promise<EventData[]> {
    const url = photographerEmail 
      ? `${API_BASE_URL}/events/?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/events/`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch events");
    return res.json();
  },

  async fetchPublicEvents(eventId?: string): Promise<EventData[]> {
    const url = eventId
      ? `${API_BASE_URL}/events/public?event_id=${encodeURIComponent(eventId)}`
      : `${API_BASE_URL}/events/public`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch public events");
    return res.json();
  },

  async createEvent(id: string, name: string, date: string, photographerEmail?: string, clientName = "", clientMobile = ""): Promise<EventData> {
    const url = photographerEmail
      ? `${API_BASE_URL}/events/?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/events/`;
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ id, name, date, client_name: clientName, client_mobile: clientMobile }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to create event");
    }
    return res.json();
  },

  async updateEventClient(eventId: string, clientName: string, clientMobile: string, photographerEmail?: string): Promise<EventData> {
    const url = photographerEmail
      ? `${API_BASE_URL}/events/${encodeURIComponent(eventId)}/client?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/events/${encodeURIComponent(eventId)}/client`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ client_name: clientName, client_mobile: clientMobile }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to update client details");
    }
    return res.json();
  },

  async updateEvent(eventId: string, updates: Partial<Pick<EventData, "name" | "date" | "status">>): Promise<EventData> {
    const res = await fetch(`${API_BASE_URL}/events/${encodeURIComponent(eventId)}`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to update event");
    }
    return res.json();
  },

  async fetchEventQrPayload(eventId: string): Promise<EventQrPayloadData> {
    const res = await fetch(`${API_BASE_URL}/events/${encodeURIComponent(eventId)}/qr-payload`, { headers: authHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to fetch QR payload");
    }
    return res.json();
  },

  async fetchStats(photographerEmail?: string) {
    const url = photographerEmail
      ? `${API_BASE_URL}/payments/stats?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/payments/stats`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },

  async fetchPhotos(eventId: string, photographerEmail?: string): Promise<PhotoData[]> {
    const url = photographerEmail
      ? `${API_BASE_URL}/photos/event/${encodeURIComponent(eventId)}?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/photos/event/${encodeURIComponent(eventId)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch event photos");
    return res.json();
  },

  async fetchClientAlbum(eventId: string, clientName: string, clientMobile: string, verificationToken: string): Promise<PhotoData[]> {
    const res = await fetch(`${API_BASE_URL}/photos/client-album/${encodeURIComponent(eventId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_name: clientName, client_mobile: clientMobile, verification_token: verificationToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to load client album");
    }
    return res.json();
  },

  async sendOtp(eventId: string, name: string, mobile: string): Promise<{ sent: boolean; expires_in: number; debug_otp?: string }> {
    const res = await fetch(`${API_BASE_URL}/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, name, mobile }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to send OTP");
    }
    return res.json();
  },

  async verifyOtp(eventId: string, mobile: string, otp: string): Promise<{ verified: boolean; verification_token: string }> {
    const res = await fetch(`${API_BASE_URL}/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, mobile, otp }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to verify OTP");
    }
    return res.json();
  },

  async uploadPhoto(eventId: string, file: File, photographerEmail?: string): Promise<PhotoData> {
    const formData = new FormData();
    formData.append("event_id", eventId);
    if (photographerEmail) formData.append("photographer_email", photographerEmail);
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/photos/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to upload photo");
    return res.json();
  },

  async fetchUsers(photographerEmail?: string): Promise<UserData[]> {
    const url = photographerEmail
      ? `${API_BASE_URL}/users/?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/users/`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },

  async createUser(
    id: string, 
    name: string, 
    email: string, 
    role: string, 
    extra: Partial<Pick<UserData, "brand_name" | "phone" | "password" | "temp_password" | "must_change_password" | "first_login_done" | "verification_status" | "storage_quota_gb" | "plan" | "status">> = {}
  ): Promise<UserData> {
    const res = await fetch(`${API_BASE_URL}/users/`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ id, name, email, role, ...extra }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to create user");
    }
    return res.json();
  },

  async fetchTransactions(photographerEmail?: string): Promise<PaymentData[]> {
    const url = photographerEmail
      ? `${API_BASE_URL}/payments/transactions?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/payments/transactions`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch transactions");
    return res.json();
  },

  async fetchSearchLogs(photographerEmail?: string) {
    const url = photographerEmail
      ? `${API_BASE_URL}/search/logs?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/search/logs`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch search logs");
    return res.json();
  },

  async fetchAuditLogs(filters: { action?: string; actorEmail?: string; resourceType?: string; result?: string; limit?: number } = {}): Promise<AuditLogData[]> {
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.actorEmail) params.set("actor_email", filters.actorEmail);
    if (filters.resourceType) params.set("resource_type", filters.resourceType);
    if (filters.result) params.set("result", filters.result);
    params.set("limit", String(filters.limit || 250));
    const res = await fetch(`${API_BASE_URL}/audit-logs/?${params.toString()}`, { headers: authHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to fetch audit logs");
    }
    return res.json();
  },

  async fetchValidationSummary(): Promise<ValidationSummaryData> {
    const res = await fetch(`${API_BASE_URL}/validation/summary`, { headers: authHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to fetch validation summary");
    }
    return res.json();
  },

  async searchSelfie(eventId: string, guestName: string, file: File, guestMobile = "", verificationToken = ""): Promise<SearchResult> {
    const formData = new FormData();
    formData.append("event_id", eventId);
    formData.append("guest_name", guestName);
    formData.append("guest_mobile", guestMobile);
    formData.append("verification_token", verificationToken);
    formData.append("live_capture", "1");
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/search/selfie`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to search by selfie");
    }
    return res.json();
  },

  async updateUser(
    userId: string,
    name: string,
    email: string,
    phone: string,
    plan: string = "Premium",
    status: string = "Active",
    branding: Partial<Pick<UserData, "brand_name" | "brand_rights_text" | "instagram_url" | "facebook_url" | "website_url" | "whatsapp_url" | "address" | "about_studio" | "password" | "temp_password" | "must_change_password" | "first_login_done" | "verification_status" | "storage_quota_gb">> = {}
  ): Promise<UserData> {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name, email, phone, plan, status, ...branding }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to update profile");
    }
    return res.json();
  },

  async requestBrandChange(userId: string, requestedBrandName: string, reason: string): Promise<UserData> {
    const res = await fetch(`${API_BASE_URL}/users/${userId}/brand-change-request`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ requested_brand_name: requestedBrandName, reason }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to submit brand change request");
    }
    return res.json();
  },

  async updateBrandVerification(userId: string, verificationStatus: string): Promise<UserData> {
    const res = await fetch(`${API_BASE_URL}/users/${userId}/verification`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ verification_status: verificationStatus }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to update verification status");
    }
    return res.json();
  },

  async reviewBrandChange(userId: string, action: "approve" | "reject"): Promise<UserData> {
    const res = await fetch(`${API_BASE_URL}/users/${userId}/brand-change-review`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to review brand change request");
    }
    return res.json();
  },

  async uploadUserAvatar(userId: string, file: File): Promise<UserData> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/users/${userId}/avatar`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to upload profile photo");
    }
    return res.json();
  },

  async uploadBrandLogo(userId: string, file: File): Promise<UserData> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/users/${userId}/brand-logo`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to upload brand logo");
    }
    return res.json();
  },

  async deleteUser(userId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to delete user");
    }
    return res.json();
  },

  async logDownload(guestEmail: string, eventName: string, photoName: string, size: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/users/downloads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest: guestEmail, event: eventName, photo: photoName, size }),
    });
    if (!res.ok) throw new Error("Failed to log download");
    return res.json();
  },

  async downloadPhoto(photoId: number, fileName: string, fallbackUrl?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/photos/download/${photoId}`, { headers: authHeaders() });
    if (!res.ok) {
      if (fallbackUrl) {
        window.location.href = fallbackUrl;
        return;
      }
      throw new Error("Failed to download photo");
    }

    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName || `photo-${photoId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  },

  async downloadPhotosZip(photoIds: number[], fileName = "masterstudio-photos.zip", photographerEmail?: string): Promise<void> {
    const url = photographerEmail
      ? `${API_BASE_URL}/photos/download-zip?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/photos/download-zip`;
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ photo_ids: photoIds }),
    });
    if (!res.ok) throw new Error("Failed to download selected photos as ZIP");

    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  },

  async fetchUserDownloads(guestEmail: string): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/users/downloads/${guestEmail}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch user downloads");
    return res.json();
  },

  async deleteEvent(id: string, photographerEmail?: string): Promise<any> {
    const url = photographerEmail
      ? `${API_BASE_URL}/events/${encodeURIComponent(id)}?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/events/${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete event");
    return res.json();
  },

  async fetchIndexingJobs(photographerEmail?: string): Promise<PhotoData[]> {
    const url = photographerEmail
      ? `${API_BASE_URL}/photos/indexing/jobs?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/photos/indexing/jobs`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch indexing jobs");
    return res.json();
  },

  async fetchStorageSummary(photographerEmail?: string): Promise<StorageSummaryData> {
    const url = photographerEmail
      ? `${API_BASE_URL}/photos/storage/summary?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/photos/storage/summary`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch storage summary");
    return res.json();
  },

  async fetchStoragePolicy(): Promise<StoragePolicyData> {
    const res = await fetch(`${API_BASE_URL}/photos/storage/policy`);
    if (!res.ok) throw new Error("Failed to fetch storage policy");
    return res.json();
  },

  async saveStoragePolicy(policy: Partial<StoragePolicyData>): Promise<StoragePolicyData> {
    const res = await fetch(`${API_BASE_URL}/photos/storage/policy`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(policy),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to save storage policy");
    }
    return res.json();
  },

  async fetchStorageReport(): Promise<StorageReportData> {
    const res = await fetch(`${API_BASE_URL}/photos/storage/report`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch storage report");
    return res.json();
  },

  async cleanupOriginals(dryRun = true, deleteOriginalsAfterDays?: number): Promise<StorageCleanupData> {
    const res = await fetch(`${API_BASE_URL}/photos/storage/cleanup-originals`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ dry_run: dryRun, delete_originals_after_days: deleteOriginalsAfterDays }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to cleanup originals");
    }
    return res.json();
  },

  async fetchAllDownloads(photographerEmail?: string): Promise<any[]> {
    const url = photographerEmail
      ? `${API_BASE_URL}/users/downloads?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/users/downloads`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch all downloads");
    return res.json();
  },

  async deletePhotos(photoIds: number[], photographerEmail?: string): Promise<any> {
    const url = photographerEmail
      ? `${API_BASE_URL}/photos/delete?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/photos/delete`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ photo_ids: photoIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail || "Failed to delete photos");
    }
    return res.json();
  },

  async checkSession(email: string, sessionId: string): Promise<{ valid: boolean }> {
    const res = await fetch(`${API_BASE_URL}/users/check-session?email=${encodeURIComponent(email)}&session_id=${encodeURIComponent(sessionId)}`);
    if (!res.ok) throw new Error("Failed to check session");
    return res.json();
  },

  async submitContact(name: string, email: string, message: string): Promise<ContactMessageData> {
    const res = await fetch(`${API_BASE_URL}/support/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });
    if (!res.ok) throw new Error("Failed to submit contact message");
    return res.json();
  },

  async fetchContactMessages(): Promise<ContactMessageData[]> {
    const res = await fetch(`${API_BASE_URL}/support/`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch contact messages");
    return res.json();
  },

  async deleteContactMessage(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/support/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete contact message");
  },

  async toggleSelectionFavorite(eventId: string, photoId: number, guestMobile: string, guestName?: string, verificationToken = ""): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/selections/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, photo_id: photoId, guest_mobile: guestMobile, guest_name: guestName || "", verification_token: verificationToken }),
    });
    if (!res.ok) throw new Error("Failed to toggle favorite state");
    return res.json();
  },

  async fetchEventSelections(eventId: string, photographerEmail?: string): Promise<PhotoSelectionData[]> {
    const url = photographerEmail
      ? `${API_BASE_URL}/selections/event/${encodeURIComponent(eventId)}?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/selections/event/${encodeURIComponent(eventId)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch selections");
    return res.json();
  },

  async fetchGuestSelections(mobile: string, eventId: string, verificationToken = ""): Promise<number[]> {
    const res = await fetch(`${API_BASE_URL}/selections/guest/${encodeURIComponent(mobile)}/event/${encodeURIComponent(eventId)}?verification_token=${encodeURIComponent(verificationToken)}`);
    if (!res.ok) throw new Error("Failed to fetch guest selections");
    return res.json();
  },

  async updateSelectionStatus(selectionId: number, status: string, photographerEmail?: string): Promise<PhotoSelectionData> {
    const url = photographerEmail
      ? `${API_BASE_URL}/selections/${selectionId}/status?photographer_email=${encodeURIComponent(photographerEmail)}`
      : `${API_BASE_URL}/selections/${selectionId}/status`;
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Failed to update selection status");
    return res.json();
  },

  async fetchPhotographerLeads(email: string): Promise<LeadData[]> {
    const res = await fetch(`${API_BASE_URL}/leads/photographer/${email}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch photographer leads");
    return res.json();
  },

  async fetchPhotographerStats(email: string): Promise<LeadStatsData> {
    const res = await fetch(`${API_BASE_URL}/leads/stats/${email}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch leads stats");
    return res.json();
  },

  async fetchPaymentHistory(email: string): Promise<PaymentTransactionData[]> {
    const res = await fetch(`${API_BASE_URL}/leads/payments/history/${email}`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch payment history");
    return res.json();
  },

  async fetchWhatsAppSettings(): Promise<WhatsAppSettingsData> {
    const res = await fetch(`${API_BASE_URL}/support/settings/whatsapp`, { headers: authHeaders() });
    if (!res.ok) throw new Error("Failed to fetch WhatsApp settings");
    return res.json();
  },

  async saveWhatsAppSettings(settings: WhatsAppSettingsData): Promise<WhatsAppSettingsData> {
    const res = await fetch(`${API_BASE_URL}/support/settings/whatsapp`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error("Failed to save WhatsApp settings");
    return res.json();
  }
};
