import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CurrentSaleItem = {
  product?: {
    id?: string;
    name?: string;
    price?: number;
    stock_quantity?: number;
  };
  quantity?: number;
  unit_price?: number;
  total_price?: number;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const safeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isUuid = (value: unknown) =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const withTimeout = async <T,>(promise: Promise<T>, ms: number, label = 'operation') => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]);
};

/**
 * Retry/Timeout policy for the Lovable AI gateway:
 *   - Per-attempt timeout: 8000ms
 *   - Max attempts: 3 (initial + 2 retries)
 *   - Backoff: 400ms, 1200ms (exponential)
 *   - Total worst-case latency: ~26s — but typical paths return in <2.5s
 *   - Retries triggered for: network errors, 5xx, and timeouts
 *   - 429 / 402 are surfaced immediately (no retry) so the client can show
 *     rate-limit / credit-exhaustion messaging instead of silently waiting.
 */
const callAiGatewayWithRetry = async (
  fetchInit: { url: string; init: RequestInit },
  perAttemptTimeoutMs = 8000,
  maxAttempts = 3,
) => {
  const backoffs = [400, 1200];
  let lastError: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const res = await withTimeout(
        fetch(fetchInit.url, fetchInit.init),
        perAttemptTimeoutMs,
        `ai-gateway attempt ${attempt + 1}`,
      );
      if (res.ok) return res;
      // Don't retry rate-limit / credit-exhaustion / auth errors.
      if (res.status === 429 || res.status === 402 || res.status === 401 || res.status === 403) {
        return res;
      }
      // 4xx other than the above are permanent client errors — don't retry.
      if (res.status >= 400 && res.status < 500) return res;
      lastError = new Error(`Gateway returned ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, backoffs[attempt] ?? 1500));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI gateway failed after retries');
};

const createFallbackReply = (message: string, outOfStock: string[]) => {
  const normalized = message.toLowerCase();

  if (normalized.includes('imeisha') || normalized.includes('zimeisha') || normalized.includes('out of stock')) {
    return outOfStock.length > 0
      ? `Bidhaa zilizokwisha ni ${outOfStock.join(', ')}.`
      : 'Kwa sasa hakuna bidhaa iliyokwisha stock.';
  }

  return 'Nimekuelewa. Naangalia taarifa za biashara yako sasa hivi.';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const authHeader = req.headers.get('Authorization');

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !lovableApiKey) {
      throw new Error('Voice assistant backend is not configured correctly.');
    }

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const requestedOwnerId = isUuid(body.ownerId) ? body.ownerId : null;
    const currentSale = Array.isArray(body.currentSale) ? (body.currentSale as CurrentSaleItem[]) : [];
    const conversationHistory = Array.isArray(body.conversationHistory)
      ? body.conversationHistory.slice(-4)
      : [];

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleRows } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const roles = new Set((roleRows ?? []).map((row: { role: string }) => row.role));

    let ownerId = user.id;
    if (requestedOwnerId && requestedOwnerId !== user.id) {
      const { data: assistantAccess } = await adminClient
        .from('assistant_permissions')
        .select('owner_id')
        .eq('assistant_id', user.id)
        .eq('owner_id', requestedOwnerId)
        .maybeSingle();

      if (assistantAccess?.owner_id || roles.has('super_admin')) {
        ownerId = requestedOwnerId;
      } else {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const [profileResult, productsResult, salesResult, expensesResult, customersResult, branchesResult] = await Promise.all([
      adminClient.from('profiles').select('business_name, full_name').eq('id', ownerId).maybeSingle(),
      adminClient
        .from('products')
        .select('id, name, price, stock_quantity, low_stock_threshold, category, is_archived')
        .eq('owner_id', ownerId)
        .order('name', { ascending: true })
        .limit(120),
      adminClient
        .from('sales')
        .select('total_amount, created_at')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(200),
      adminClient
        .from('expenses')
        .select('amount, expense_date')
        .eq('owner_id', ownerId)
        .order('expense_date', { ascending: false })
        .limit(200),
      adminClient.from('customers').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId),
      adminClient.from('business_branches').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId),
    ]);

    const products = (productsResult.data ?? []).filter((product: { is_archived?: boolean | null }) => !product.is_archived);
    const sales = salesResult.data ?? [];
    const expenses = expensesResult.data ?? [];
    const today = todayDate();

    const todaySales = sales.filter((sale: { created_at: string }) => sale.created_at?.startsWith(today));
    const todayExpenses = expenses.filter((expense: { expense_date: string }) => expense.expense_date?.startsWith(today));

    const outOfStockProducts = products.filter((product: { stock_quantity: number }) => safeNumber(product.stock_quantity) <= 0);
    const lowStockProducts = products.filter((product: { stock_quantity: number; low_stock_threshold?: number | null }) => {
      const threshold = safeNumber(product.low_stock_threshold || 3);
      const quantity = safeNumber(product.stock_quantity);
      return quantity > 0 && quantity <= threshold;
    });

    const currentSaleTotal = currentSale.reduce((sum, item) => sum + safeNumber(item.total_price), 0);
    const currentSaleItems = currentSale.map((item) => ({
      productId: item.product?.id ?? null,
      name: item.product?.name ?? 'Bidhaa isiyojulikana',
      quantity: safeNumber(item.quantity || 0),
      unit_price: safeNumber(item.unit_price || item.product?.price || 0),
      total_price: safeNumber(item.total_price || 0),
    }));

    const businessContext = {
      owner_id: ownerId,
      business_name: profileResult.data?.business_name ?? 'Biashara yako',
      owner_name: profileResult.data?.full_name ?? '',
      totals: {
        bidhaa: products.length,
        wateja: customersResult.count ?? 0,
        matawi: branchesResult.count ?? 0,
      },
      sales: {
        leo_idadi: todaySales.length,
        leo_jumla: todaySales.reduce((sum: number, sale: { total_amount: number }) => sum + safeNumber(sale.total_amount), 0),
      },
      expenses: {
        leo_jumla: todayExpenses.reduce((sum: number, expense: { amount: number }) => sum + safeNumber(expense.amount), 0),
      },
      inventory: {
        zimeisha: outOfStockProducts.slice(0, 20).map((product: { id: string; name: string }) => ({ id: product.id, name: product.name })),
        zinaisha: lowStockProducts.slice(0, 20).map((product: { id: string; name: string; stock_quantity: number }) => ({
          id: product.id,
          name: product.name,
          stock_quantity: safeNumber(product.stock_quantity),
        })),
        bidhaa: products.slice(0, 80).map((product: { id: string; name: string; price: number; stock_quantity: number; category?: string | null }) => ({
          id: product.id,
          name: product.name,
          price: safeNumber(product.price),
          stock_quantity: safeNumber(product.stock_quantity),
          category: product.category ?? null,
        })),
      },
      current_sale: {
        items: currentSaleItems,
        total_amount: currentSaleTotal,
      },
    };

    const systemPrompt = `Wewe ni Nurath, msaidizi rasmi wa sauti wa Kiduka. Jibu kwa Kiswahili sanifu cha Tanzania: fasaha, rahisi, chenye heshima, na kisicho cha kimashine. Usitumie Kiingereza isipokuwa jina la bidhaa au mtumiaji ameomba hivyo.

Wewe si chatbot wa amri. Elewa nia ya mtumiaji kwa lugha ya kawaida kabisa kisha rudisha tool call moja sahihi.

Sheria muhimu:
- Tumia data uliyopewa tu. Usibuni namba, bidhaa, mauzo, wateja, matawi, au taarifa yoyote.
- Ukikosa data, sema "Sina taarifa ya kutosha kuhusu hilo kwa sasa" kwa intent answer kisha uliza swali moja la kufafanua.
- Ukimsikia mtumiaji anataka KUNUNUA, KUUZA, KUONGEZA bidhaa kwenye mauzo (mfano "nahitaji kununua soda", "weka juice", "ongeza mkate"), tafuta bidhaa kwenye context. Ukiipata, tumia intent add_to_sale na productId halisi. Ukikosa, tumia intent search_products na neno alilolisema.
- Ukimsikia anataka kupunguza/ondoa: intent remove_from_sale.
- Kufuta cart yote: intent clear_sale.
- Kukamilisha/kulipia mauzo: intent complete_sale.
- Anaposema "nenda kwa…", "fungua…", "onyesha ukurasa wa…" (mfano "nenda dashboard", "fungua bidhaa", "onyesha ripoti"), tumia intent navigate na route sahihi kutoka orodha hii: dashboard, sales, products, customers, reports, expenses, sokoni, settings, scanner, mobile-qa.
- Anapouliza kuhusu stock, mauzo ya leo, matumizi, ripoti, ushauri: intent answer.
- Salamu tu au kuita jina lako: intent answer na reply fupi kama "Naam, nipo" au "Nakusikia, sema".
- reply iwe sentensi 1–2 tu, fasaha, ya kirafiki.
- quantity iwe namba halisi kama imetajwa; vinginevyo acha null (default 1).
- searchQuery iwe neno moja au mawili tu yanayoeleweka.
- route iwe moja ya orodha hapo juu pekee; vinginevyo tumia answer.
`;

    const gatewayResponse = await callAiGatewayWithRetry({
      url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
      init: {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            {
              role: 'user',
              content: `Ujumbe wa sasa wa mtumiaji: ${message}\n\nContext ya biashara (JSON): ${JSON.stringify(businessContext)}`,
            },
          ],
          temperature: 0.2,
          max_tokens: 280,
          tools: [
            {
              type: 'function',
              function: {
                name: 'voice_pos_response',
                description: 'Rudisha hatua au jibu la msaidizi wa sauti wa Kiduka.',
                parameters: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    intent: {
                      type: 'string',
                      enum: ['answer', 'add_to_sale', 'remove_from_sale', 'clear_sale', 'complete_sale', 'search_products', 'navigate'],
                    },
                    reply: { type: 'string' },
                    productId: { type: ['string', 'null'] },
                    quantity: { type: ['number', 'null'] },
                    searchQuery: { type: ['string', 'null'] },
                    route: {
                      type: ['string', 'null'],
                      enum: [null, 'dashboard', 'sales', 'products', 'customers', 'reports', 'expenses', 'sokoni', 'settings', 'scanner', 'mobile-qa'],
                    },
                    confidence: { type: 'number' },
                  },
                  required: ['intent', 'reply', 'productId', 'quantity', 'searchQuery', 'route', 'confidence'],
                },
              },
            },
          ],
          tool_choice: { type: 'function', function: { name: 'voice_pos_response' } },
        }),
      },
    }, 8000, 3);

    if (!gatewayResponse.ok) {
      if (gatewayResponse.status === 429 || gatewayResponse.status === 402) {
        const text = await gatewayResponse.text();
        return new Response(text, {
          status: gatewayResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await gatewayResponse.text();
      console.error('Voice assistant AI gateway error:', gatewayResponse.status, errorText);
      throw new Error('AI gateway request failed.');
    }

    const aiPayload = await gatewayResponse.json();
    const toolArguments = aiPayload?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;

    let result: {
      intent: 'answer' | 'add_to_sale' | 'remove_from_sale' | 'clear_sale' | 'complete_sale' | 'search_products' | 'navigate';
      reply: string;
      productId?: string | null;
      quantity?: number | null;
      searchQuery?: string | null;
      route?: string | null;
      confidence: number;
    } = {
      intent: 'answer',
      reply: createFallbackReply(message, outOfStockProducts.map((product: { name: string }) => product.name)),
      confidence: 0.4,
    };

    if (toolArguments) {
      try {
        result = { ...result, ...JSON.parse(toolArguments) };
      } catch (parseError) {
        console.error('Failed to parse voice assistant tool arguments:', parseError);
      }
    } else if (aiPayload?.choices?.[0]?.message?.content) {
      result.reply = aiPayload.choices[0].message.content;
    }

    // Light validation: drop hallucinated productId.
    if (result.productId && !products.some((product: { id: string }) => product.id === result.productId)) {
      // Fall back to a search instead of failing.
      result.intent = 'search_products';
      result.searchQuery = result.searchQuery || message;
      result.productId = null;
      result.reply = 'Hebu nikutafutie bidhaa hiyo kwenye orodha.';
    }

    // Server-side fuzzy product match for search_products to help the client.
    let matchedProducts: Array<{ id: string; name: string; price: number; stock_quantity: number }> = [];
    if (result.intent === 'search_products' && result.searchQuery) {
      const q = result.searchQuery.toLowerCase().trim();
      matchedProducts = products
        .filter((p: { name: string }) => p.name.toLowerCase().includes(q))
        .slice(0, 5)
        .map((p: { id: string; name: string; price: number; stock_quantity: number }) => ({
          id: p.id,
          name: p.name,
          price: safeNumber(p.price),
          stock_quantity: safeNumber(p.stock_quantity),
        }));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: result.reply,
        intent: result.intent,
        productId: result.productId ?? null,
        quantity: typeof result.quantity === 'number' ? result.quantity : null,
        searchQuery: result.searchQuery ?? null,
        route: result.route ?? null,
        matches: matchedProducts,
        confidence: result.confidence,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('voice-pos-assistant error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});