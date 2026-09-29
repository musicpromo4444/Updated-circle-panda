import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type ProviderSettings = {
  google_enabled: boolean;
  google_package_name: string;
  google_service_account_email: string;
  google_rtdn_topic: string;
  google_service_account_configured: boolean;
  google_rtdn_secret_configured: boolean;
  apple_enabled: boolean;
  apple_bundle_id: string;
  apple_team_id: string;
  apple_issuer_id: string;
  apple_key_id: string;
  apple_iap_private_key_configured: boolean;
  paystack_enabled: boolean;
  paystack_public_key: string;
  paystack_secret_key_configured: boolean;
  updated_at: string;
};

type StoreProduct = {
  id: string;
  name: string;
  item_type: string;
  coins: number;
  vip_days: number;
  enabled: boolean;
  android_product_id: string | null;
  ios_product_id: string | null;
};

const emptySettings: ProviderSettings = {
  google_enabled: false, google_package_name: "", google_service_account_email: "", google_rtdn_topic: "",
  google_service_account_configured: false, google_rtdn_secret_configured: false,
  apple_enabled: false, apple_bundle_id: "", apple_team_id: "", apple_issuer_id: "", apple_key_id: "",
  apple_iap_private_key_configured: false, paystack_enabled: true, paystack_public_key: "", paystack_secret_key_configured: false, updated_at: "",
};

function Field({ label, value, onChange, placeholder, secret = false }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; secret?: boolean;
}) {
  const [show, setShow] = useState(false);
  return <label className="text-xs font-semibold">
    {label}
    <div className="relative mt-1">
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        type={secret && !show ? "password" : "text"}
        className="h-11 w-full rounded-xl border bg-background px-3 pr-10 text-sm" />
      {secret ? <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={show ? "Hide" : "Show"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button> : null}
    </div>
  </label>;
}

export function PaymentProviderSetup() {
  const [settings, setSettings] = useState<ProviderSettings>(emptySettings);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [googleJson, setGoogleJson] = useState("");
  const [rtdnSecret, setRtdnSecret] = useState("");
  const [appleKey, setAppleKey] = useState("");
  const [paystackSecret, setPaystackSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProduct, setSavingProduct] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [provider, catalog] = await Promise.all([
      (supabase as any).rpc("admin_get_payment_provider_settings"),
      (supabase as any).rpc("admin_get_store_catalog"),
    ]);
    setLoading(false);
    if (provider.error || catalog.error) {
      toast.error((provider.error ?? catalog.error)?.message ?? "Payment setup could not load");
      return;
    }
    setSettings(provider.data ?? emptySettings);
    setProducts((catalog.data ?? []) as StoreProduct[]);
  };

  useEffect(() => { void load(); }, []);

  const saveProviders = async () => {
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("admin_save_payment_provider_settings", {
      p_google_enabled: settings.google_enabled,
      p_google_package_name: settings.google_package_name,
      p_google_service_account_email: settings.google_service_account_email,
      p_google_rtdn_topic: settings.google_rtdn_topic,
      p_google_service_account_json: googleJson.trim() || null,
      p_google_rtdn_secret: rtdnSecret.trim() || null,
      p_apple_enabled: settings.apple_enabled,
      p_apple_bundle_id: settings.apple_bundle_id,
      p_apple_team_id: settings.apple_team_id,
      p_apple_issuer_id: settings.apple_issuer_id,
      p_apple_key_id: settings.apple_key_id,
      p_apple_iap_private_key: appleKey.trim() || null,
      p_paystack_enabled: settings.paystack_enabled,
      p_paystack_public_key: settings.paystack_public_key,
      p_paystack_secret_key: paystackSecret.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message ?? "Could not save payment settings");
    setSettings(data ?? settings);
    setGoogleJson(""); setRtdnSecret(""); setAppleKey(""); setPaystackSecret("");
    toast.success("Payment setup saved securely");
  };

  const saveProduct = async (product: StoreProduct) => {
    setSavingProduct(product.id);
    const { data, error } = await (supabase as any).rpc("admin_update_store_product_ids", {
      p_id: product.id,
      p_android_product_id: product.android_product_id ?? "",
      p_ios_product_id: product.ios_product_id ?? "",
    });
    setSavingProduct(null);
    if (error) return toast.error(error.message ?? "Could not save product IDs");
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...data } : p));
    toast.success(product.name + " product IDs saved");
  };

  if (loading) return <section className="panda-panel rounded-3xl p-5"><Loader2 className="mx-auto size-7 animate-spin text-primary" /></section>;

  return <section className="panda-panel rounded-3xl p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><KeyRound className="size-5" /></div>
      <div>
        <h2 className="font-display font-bold">Production payment setup</h2>
        <p className="mt-1 text-xs text-muted-foreground">Everything is prepared now. When you create the Apple/Google consoles later, enter their details here. Private credentials are stored securely and never displayed back.</p>
      </div>
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div><p className="font-semibold">Google Play</p><p className="text-[11px] text-muted-foreground">Android billing and purchase notifications</p></div>
          <label className="text-xs font-semibold"><input type="checkbox" checked={settings.google_enabled} onChange={e => setSettings(s => ({...s, google_enabled: e.target.checked}))} /> Enabled</label>
        </div>
        <div className="mt-3 grid gap-3">
          <Field label="Package name" value={settings.google_package_name} onChange={v => setSettings(s => ({...s, google_package_name: v}))} placeholder="com.circlepanda.app" />
          <Field label="Service account email" value={settings.google_service_account_email} onChange={v => setSettings(s => ({...s, google_service_account_email: v}))} placeholder="service-account@project.iam.gserviceaccount.com" />
          <Field label="RTDN Pub/Sub topic" value={settings.google_rtdn_topic} onChange={v => setSettings(s => ({...s, google_rtdn_topic: v}))} placeholder="projects/.../topics/..." />
          <Field label="Google service-account JSON" value={googleJson} onChange={setGoogleJson} placeholder={settings.google_service_account_configured ? "Already saved — paste only to replace" : "Paste JSON when ready"} secret />
          <Field label="RTDN secret" value={rtdnSecret} onChange={setRtdnSecret} placeholder={settings.google_rtdn_secret_configured ? "Already saved — paste only to replace" : "Create one when RTDN is ready"} secret />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
          {settings.google_service_account_configured ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary"><CheckCircle2 className="size-3" /> Service account saved</span> : null}
          {settings.google_rtdn_secret_configured ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary"><CheckCircle2 className="size-3" /> RTDN secret saved</span> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div><p className="font-semibold">Apple App Store</p><p className="text-[11px] text-muted-foreground">StoreKit and App Store Server API</p></div>
          <label className="text-xs font-semibold"><input type="checkbox" checked={settings.apple_enabled} onChange={e => setSettings(s => ({...s, apple_enabled: e.target.checked}))} /> Enabled</label>
        </div>
        <div className="mt-3 grid gap-3">
          <Field label="Bundle ID" value={settings.apple_bundle_id} onChange={v => setSettings(s => ({...s, apple_bundle_id: v}))} placeholder="com.circlepanda.app" />
          <Field label="Apple Team ID" value={settings.apple_team_id} onChange={v => setSettings(s => ({...s, apple_team_id: v}))} placeholder="10-character Team ID" />
          <Field label="Issuer ID" value={settings.apple_issuer_id} onChange={v => setSettings(s => ({...s, apple_issuer_id: v}))} placeholder="App Store Connect issuer ID" />
          <Field label="In-App Purchase Key ID" value={settings.apple_key_id} onChange={v => setSettings(s => ({...s, apple_key_id: v}))} placeholder="Key ID" />
          <Field label="Private key (.p8)" value={appleKey} onChange={setAppleKey} placeholder={settings.apple_iap_private_key_configured ? "Already saved — paste only to replace" : "Paste private key when ready"} secret />
        </div>
        {settings.apple_iap_private_key_configured ? <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"><CheckCircle2 className="size-3" /> Apple private key saved</div> : null}
      </div>
    </div>

    <div className="mt-4 rounded-2xl border border-border/70 bg-secondary/20 p-4">
      <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><p className="font-semibold text-sm">Web payments</p></div>
      <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={settings.paystack_enabled} onChange={e => setSettings(s => ({...s, paystack_enabled: e.target.checked}))} /> Paystack enabled</label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Paystack public key" value={settings.paystack_public_key} onChange={v => setSettings(s => ({...s, paystack_public_key: v}))} placeholder="pk_test_... or pk_live_..." />
        <Field label="Paystack secret key" value={paystackSecret} onChange={setPaystackSecret} placeholder={settings.paystack_secret_key_configured ? "Already saved — paste only to replace" : "sk_test_... or sk_live_..."} secret />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
        {settings.paystack_secret_key_configured ? <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-primary"><CheckCircle2 className="size-3" /> Secret key saved</span> : null}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">The secret key is stored securely and used only by the payment server.</p>
    </div>

    <div className="mt-4 rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between gap-2"><div><p className="font-semibold text-sm">Store product IDs</p><p className="text-[11px] text-muted-foreground">Enter the exact IDs created in Google Play and App Store Connect later.</p></div><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{products.length} products</span></div>
      <div className="mt-3 space-y-3">
        {products.map(product => <div key={product.id} className="rounded-2xl border border-border/70 bg-secondary/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">{product.name}</p><p className="text-[10px] text-muted-foreground">{product.item_type}{product.coins ? " • " + product.coins + " BC" : ""}{product.vip_days ? " • " + product.vip_days + " VIP days" : ""}</p></div><span className={product.android_product_id && product.ios_product_id ? "text-primary" : "text-muted-foreground"}>{product.android_product_id && product.ios_product_id ? "Ready" : "IDs needed"}</span></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input aria-label={product.name + " Google Play ID"} value={product.android_product_id ?? ""} onChange={e => setProducts(prev => prev.map(p => p.id === product.id ? {...p, android_product_id: e.target.value} : p))} placeholder="Google Play product ID" className="h-10 rounded-xl border bg-background px-3 text-sm" />
            <input aria-label={product.name + " Apple ID"} value={product.ios_product_id ?? ""} onChange={e => setProducts(prev => prev.map(p => p.id === product.id ? {...p, ios_product_id: e.target.value} : p))} placeholder="Apple product ID" className="h-10 rounded-xl border bg-background px-3 text-sm" />
          </div>
          <Button className="mt-2 h-9" size="sm" variant="outline" disabled={savingProduct === product.id} onClick={() => void saveProduct(product)}>{savingProduct === product.id ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Save className="mr-2 size-3.5" />}Save product IDs</Button>
        </div>)}
      </div>
    </div>

    <Button className="mt-4 w-full" disabled={saving} onClick={() => void saveProviders()}>{saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}Save payment provider setup</Button>
  </section>;
}
