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

    const [profileResult, productsResult, salesResult, expensesResult, customersResult, branchesResult] = await Promise.all([
      adminClient.from('profiles').select('business_name, full_name').eq('id', user.id).maybeSingle(),
      adminClient
        .from('products')
        .select('id, name, price, stock_quantity, low_stock_threshold, category, is_archived')
        .eq('owner_id', user.id)
        .order('name', { ascending: true })
        .limit(120),
      adminClient
        .from('sales')
        .select('total_amount, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200),
      adminClient
        .from('expenses')
        .select('amount, expense_date')
        .eq('owner_id', user.id)
        .order('expense_date', { ascending: false })
        .limit(200),
      adminClient.from('customers').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
      adminClient.from('business_branches').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
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
      owner_id: user.id,
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

    const systemPrompt = `Wewe ni Nurath, msaidizi rasmi wa sauti wa Kiduka. Ongea kama mwanamke mwenye sauti ya upole, mwepesi na wa kitaalamu. Jibu kwa Kiswahili cha Tanzania, kifupi, cha asili, na kisicho cha kimashine. Kama mtumiaji ameongea English kidogo, bado mwelewe lakini mjibu kwa Kiswahili rahisi isipokuwa aombe lugha nyingine.

Lengo lako ni mawili:
1. Elewa ombi la mtumiaji kwa lugha ya kawaida.
2. Rudisha hatua sahihi kwa mfumo au jibu la ushauri.

Sheria muhimu:
- Usijibu kama chatbot wa commands. Elewa maana ya ujumbe kwa kawaida.
- Tumia data uliyopewa tu; usibuni namba au bidhaa.
- Kama mtumiaji anataka kuongeza bidhaa kwenye mauzo, tumia intent add_to_sale na productId sahihi kutoka kwenye context.
- Kama mtumiaji anataka kupunguza au kuondoa bidhaa kwenye mauzo ya sasa, tumia intent remove_from_sale.
- Kama mtumiaji anataka kufuta mauzo yote ya sasa, tumia intent clear_sale.
- Kama mtumiaji anataka kukamilisha mauzo, tumia intent complete_sale.
- Kwa maswali ya ripoti, stock, akaunti, ushauri au muhtasari, tumia intent answer.
- Ukikosa uhakika wa bidhaa au ombi halieleweki vya kutosha, tumia intent answer na umwombe mtumiaji arudie kwa ufupi.
- reply iwe sentensi fupi, ya kirafiki, ya moja kwa moja, na ya asili kabisa kwa Kiswahili.
- quantity iwe namba halisi kama ipo; vinginevyo acha.
`;

    const gatewayResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'voice_pos_response',
              description: 'Rudisha hatua au jibu la msaidizi wa Voice POS.',
              parameters: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  intent: {
                    type: 'string',
                    enum: ['answer', 'add_to_sale', 'remove_from_sale', 'clear_sale', 'complete_sale'],
                  },
                  reply: { type: 'string' },
                  productId: { type: 'string' },
                  quantity: { type: 'number' },
                  confidence: { type: 'number' },
                },
                required: ['intent', 'reply', 'confidence'],
              },
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: { name: 'voice_pos_response' },
        },
      }),
    });

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
      intent: 'answer' | 'add_to_sale' | 'remove_from_sale' | 'clear_sale' | 'complete_sale';
      reply: string;
      productId?: string;
      quantity?: number;
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

    if (result.productId && !products.some((product: { id: string }) => product.id === result.productId)) {
      result.intent = 'answer';
      result.productId = undefined;
      result.reply = 'Sijapata bidhaa hiyo kwa uhakika. Tafadhali sema jina la bidhaa tena kwa ufupi.';
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: result.reply,
        intent: result.intent,
        productId: result.productId ?? null,
        quantity: typeof result.quantity === 'number' ? result.quantity : null,
        confidence: result.confidence,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
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