
import { supabase } from '@/integrations/supabase/client';

export interface VoiceCommandResult {
  success: boolean;
  message: string;
  data?: any;
}

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const includesAny = (command: string, words: string[]) => words.some((word) => command.includes(word));

export class VoiceCommandProcessor {
  private products: any[] = [];
  private currentSale: any[] = [];

  constructor(products: any[], currentSale: any[]) {
    this.products = products;
    this.currentSale = currentSale;
  }

  async processCommand(command: string, userId: string): Promise<VoiceCommandResult> {
    const lowerCommand = normalizeText(command);

    if (this.isClearSaleCommand(lowerCommand)) {
      return {
        success: true,
        message: 'Sawa, nimefuta mauzo ya sasa.',
        data: { action: 'clear_sale' }
      };
    }

    if (this.isCompleteSaleCommand(lowerCommand)) {
      return {
        success: true,
        message: 'Sawa, nakamilisha mauzo ya sasa.',
        data: { action: 'complete_sale' }
      };
    }

    if (this.isRemoveSaleCommand(lowerCommand)) {
      return this.processRemoveFromSaleCommand(lowerCommand);
    }

    // Sales commands
    if (this.isSaleCommand(lowerCommand)) {
      return this.processSaleCommand(lowerCommand);
    }

    // Inventory commands
    if (this.isInventoryCommand(lowerCommand)) {
      return this.processInventoryCommand(lowerCommand);
    }

    // Search commands
    if (lowerCommand.includes('tafuta') || lowerCommand.includes('search')) {
      return this.processSearchCommand(lowerCommand);
    }

    // Report commands
    if (this.isReportCommand(lowerCommand)) {
      return this.processReportCommand(lowerCommand, userId);
    }

    if (includesAny(lowerCommand, ['mauzo ya sasa', 'sale ya sasa', 'basket', 'cart'])) {
      return this.processCurrentSaleSummary();
    }

    return {
      success: false,
      message: 'Samahani, sikuelewi amri hiyo'
    };
  }

  private isSaleCommand(command: string) {
    return includesAny(command, ['uza', 'ongeza', 'weka', 'add', 'sell', 'jumuisha', 'weka kwenye mauzo']);
  }

  private isInventoryCommand(command: string) {
    return includesAny(command, [
      'hesabu', 'stock', 'hisa', 'imeisha', 'zimeisha', 'out of stock', 'low stock',
      'karibia kuisha', 'imebaki', 'baki', 'inventory', 'ghalani'
    ]);
  }

  private isReportCommand(command: string) {
    return includesAny(command, ['ripoti', 'report', 'mauzo ya leo', 'leo umeuza', 'sales ya leo', 'summary']);
  }

  private isCompleteSaleCommand(command: string) {
    return includesAny(command, ['kamilisha mauzo', 'maliza mauzo', 'complete sale', 'finish sale', 'lipa sasa']);
  }

  private isClearSaleCommand(command: string) {
    return includesAny(command, ['futa mauzo', 'ghairi mauzo', 'clear sale', 'cancel sale', 'ondoa mauzo yote']);
  }

  private isRemoveSaleCommand(command: string) {
    return includesAny(command, ['ondoa', 'toa', 'remove']) && includesAny(command, ['mauzo', 'sale', 'cart', 'basket']);
  }

  private extractQuantity(command: string) {
    const quantities: Record<string, number> = {
      moja: 1,
      mmoja: 1,
      mbili: 2,
      mbilii: 2,
      tatu: 3,
      nne: 4,
      tano: 5,
      sita: 6,
      saba: 7,
      nane: 8,
      tisa: 9,
      kumi: 10,
    };

    const numberMatch = command.match(/\d+/);
    if (numberMatch) {
      return Math.max(1, parseInt(numberMatch[0], 10));
    }

    for (const [word, quantity] of Object.entries(quantities)) {
      if (command.includes(word)) {
        return quantity;
      }
    }

    return 1;
  }

  private findProductMatch(command: string, sourceProducts = this.products) {
    const tokens = command.split(' ').filter((token) => token.length > 2);

    let bestMatch: any = null;
    let bestScore = 0;

    for (const product of sourceProducts) {
      const normalizedName = normalizeText(product.name || '');
      if (!normalizedName) continue;

      let score = 0;
      if (command.includes(normalizedName)) score += 5;
      if (product.barcode && command.includes(String(product.barcode).toLowerCase())) score += 5;

      for (const token of tokens) {
        if (normalizedName.includes(token)) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = product;
      }
    }

    return bestScore > 0 ? bestMatch : null;
  }

  private processSaleCommand(command: string): VoiceCommandResult {
    const quantity = this.extractQuantity(command);
    const product = this.findProductMatch(command);

    if (!product) {
      return {
        success: false,
        message: 'Bidhaa haijapatikana'
      };
    }

    if (product.stock_quantity < quantity) {
      return {
        success: false,
        message: `Huna stock ya kutosha. Una ${product.stock_quantity} tu`
      };
    }

    return {
      success: true,
      message: `Umeweka ${product.name} ${quantity} kwenye mauzo`,
      data: { action: 'add_to_sale', product, quantity }
    };
  }

  private processRemoveFromSaleCommand(command: string): VoiceCommandResult {
    if (this.currentSale.length === 0) {
      return {
        success: true,
        message: 'Hakuna bidhaa kwenye mauzo ya sasa.',
        data: { action: 'answer' }
      };
    }

    const saleProducts = this.currentSale.map((item) => item.product);
    const product = this.findProductMatch(command, saleProducts);
    const quantity = this.extractQuantity(command);

    if (!product) {
      return {
        success: true,
        message: 'Niambie bidhaa unayotaka kuondoa kwenye mauzo ya sasa.',
        data: { action: 'answer' }
      };
    }

    return {
      success: true,
      message: `Sawa, ninaondoa ${product.name} kwenye mauzo ya sasa.`,
      data: { action: 'remove_from_sale', product, quantity }
    };
  }

  private processInventoryCommand(command: string): VoiceCommandResult {
    const outOfStockProducts = this.products.filter((product) => Number(product.stock_quantity) <= 0);
    const lowStockProducts = this.products.filter((product) => {
      const threshold = Number(product.low_stock_threshold ?? 3);
      return Number(product.stock_quantity) > 0 && Number(product.stock_quantity) <= threshold;
    });

    if (includesAny(command, ['imeisha', 'zimeisha', 'out of stock', 'hakuna stock'])) {
      if (outOfStockProducts.length === 0) {
        return {
          success: true,
          message: 'Kwa sasa hakuna bidhaa iliyokwisha stock.',
          data: { action: 'answer' }
        };
      }

      return {
        success: true,
        message: `Bidhaa zilizokwisha ni ${outOfStockProducts.map((product) => product.name).join(', ')}.`,
        data: { action: 'answer', outOfStockProducts }
      };
    }

    if (includesAny(command, ['low stock', 'karibia kuisha', 'inaisha'])) {
      if (lowStockProducts.length === 0) {
        return {
          success: true,
          message: 'Kwa sasa hakuna bidhaa iliyo karibu kuisha.',
          data: { action: 'answer' }
        };
      }

      return {
        success: true,
        message: `Bidhaa zinazoelekea kuisha ni ${lowStockProducts.map((product) => `${product.name} baki ${product.stock_quantity}`).join(', ')}.`,
        data: { action: 'answer', lowStockProducts }
      };
    }

    const product = this.findProductMatch(command);

    if (!product) {
      const totalProducts = this.products.length;
      const totalValue = this.products.reduce((sum, p) => sum + (p.stock_quantity * p.price), 0);
      
      return {
        success: true,
        message: `Una bidhaa ${totalProducts} jumla, thamani ${totalValue.toLocaleString()} shilingi`,
        data: { action: 'answer', totalProducts, totalValue }
      };
    }

    return {
      success: true,
      message: `${product.name}: una ${product.stock_quantity} kwenye hifadhi`,
      data: { action: 'answer', product: product.name, stock: product.stock_quantity }
    };
  }

  private processSearchCommand(command: string): VoiceCommandResult {
    const searchTerm = command.replace('tafuta', '').replace('search', '').trim();
    const results = this.products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (results.length === 0) {
      return {
        success: false,
        message: 'Hakuna bidhaa iliyopatikana'
      };
    }

    const product = results[0];
    return {
      success: true,
      message: `${product.name}: Bei ${product.price} shilingi, Stock ${product.stock_quantity}`,
      data: { action: 'answer', results: results.length }
    };
  }

  private processCurrentSaleSummary(): VoiceCommandResult {
    if (this.currentSale.length === 0) {
      return {
        success: true,
        message: 'Hakuna bidhaa kwenye mauzo ya sasa.',
        data: { action: 'answer' }
      };
    }

    const totalAmount = this.currentSale.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
    const summary = this.currentSale
      .map((item) => `${item.product.name} mara ${item.quantity}`)
      .join(', ');

    return {
      success: true,
      message: `Kwenye mauzo ya sasa una ${summary}. Jumla ni shilingi ${totalAmount.toLocaleString()}.`,
      data: { action: 'answer', totalAmount }
    };
  }

  private async processReportCommand(command: string, userId: string): Promise<VoiceCommandResult> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySales, error } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('owner_id', userId)
        .gte('created_at', `${today}T00:00:00`);

      if (error) throw error;

      const totalSales = todaySales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const saleCount = todaySales?.length || 0;

      return {
        success: true,
        message: `Leo umefanya mauzo ${saleCount}, jumla ya shilingi ${totalSales.toLocaleString()}`,
        data: { action: 'answer', salesCount: saleCount, totalAmount: totalSales }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Imeshindwa kupata ripoti'
      };
    }
  }
}
