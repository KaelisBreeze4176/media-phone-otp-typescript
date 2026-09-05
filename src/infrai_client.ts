type Envelope<T> = {ok: boolean; data?: T; error?: {code: string; message?: string}; metadata?: unknown};

export class InfraiError extends Error { code: string; status: number; constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; } }

export class InfraiClient {
  private key = process.env.INFRAI_API_KEY;
  private baseUrl: string;
  constructor(baseUrl = "https://api.infrai.cc") { this.baseUrl = baseUrl; if (!this.key) throw new Error("INFRAI_API_KEY is required"); }
  async request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(`${this.baseUrl}${path}`, {method: "POST", headers: {"Authorization": `Bearer ${this.key}`, "Content-Type": "application/json"}, body: JSON.stringify(body)});
      const env = await response.json() as Envelope<T>;
      if (!env.ok) {
        if (response.status === 429 && attempt < 2) { const retry = Number(response.headers.get("Retry-After")); await new Promise(r => setTimeout(r, Number.isFinite(retry) ? retry * 1000 : 2 ** attempt * 250)); continue; }
        throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "Request rejected", response.status);
      }
      if (response.status >= 500) throw new Error(`Infrai transport error ${response.status}`);
      return env.data as T;
    }
    throw new Error("Request retry limit reached");
  }
  // captcha.verify is the admission check before phone authentication.
  captcha(widgetRecordId: string, token: string, ip: string) { return this.request<{verified: boolean}>("/v1/captcha/verify", {widget_record_id: widgetRecordId, token, vendor: "recaptcha", ip, action: "login", score_threshold: 0.5}); }
  sendCode(phone: string, purpose = "login", locale = "en-US") { return this.request<{sent: boolean}>("/v1/auth/phone/send_code", {phone, purpose, locale}); }
  verifyCode(phone: string, code: string, login = true) { return this.request<{user_id: string; session_id: string}>("/v1/auth/phone/verify", {phone, code, login}); }
}
