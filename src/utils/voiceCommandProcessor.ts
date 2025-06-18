
import { supabase } from '@/integrations/supabase/client';

export interface VoiceCommandResult {
  success: boolean;
  message: string;
  data?: any;
}

export class VoiceCommandProcessor {
  private products: any[] = [];
  private currentSale: any[] = [];

  constructor(products: any[], currentSale: any[]) {
    this.products = products;
    this.currentSale = currentSale;
  }

  async processCommand(command: string, userId: string): Promise<VoiceCommandResult> {
    const lowerCommand = command.toLowerCase();

    // Sales commands
    if (lowerCommand.includes('uza') || lowerCommand.includes('nunua')) {
      return this.processSaleCommand(lowerCommand);
    }

    // Inventory commands
    if (lowerCommand.includes('hesabu') || lowerCommand.includes('stock') || lowerCommand.includes('hisa')) {
      return this.processInventoryCommand(lowerCommand);
    }

    // Search commands
    if (lowerCommand.includes('tafuta') || lowerCommand.includes('search')) {
      return this.processSearchCommand(lowerCommand);
    }

    // Report commands
    if (lowerCommand.includes('ripoti') || lowerCommand.includes('report')) {
      return this.processReportCommand(lowerCommand, userId);
    }

    return {
      success: false,
      message: 'Samahani, sikuelewi amri hiyo'
    };
  }

  private processSaleCommand(command: string): VoiceCommandResult {
    const quantities = {
      'moja': 1, 'mmoja': 1, 'mwili': 2, 'miwili': 2, 'mitatu': 3, 
      'mine': 4, 'mitano': 5, 'sita': 6, 'saba': 7, 'nane': 8, 
      'tisa': 9, 'kumi': 10
    };

    let quantity = 1;
    
    // Extract quantity from Swahili numbers
    for (const [word, num] of Object.entries(quantities)) {
      if (command.includes(word)) {
        quantity = num;
        break;
      }
    }

    // Extract numbers
    const numberMatch = command.match(/\d+/);
    if (numberMatch) {
      quantity = parseInt(numberMatch[0]);
    }

    // Find product by name (fuzzy search)
    const product = this.products.find(p => 
      command.includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(command.split(' ').find(word => word.length > 3) || '')
    );

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
      data: { product, quantity }
    };
  }

  private processInventoryCommand(command: string): VoiceCommandResult {
    const product = this.products.find(p => 
      command.includes(p.name.toLowerCase())
    );

    if (!product) {
      const totalProducts = this.products.length;
      const totalValue = this.products.reduce((sum, p) => sum + (p.stock_quantity * p.price), 0);
      
      return {
        success: true,
        message: `Una bidhaa ${totalProducts} jumla, thamani ${totalValue.toLocaleString()} shilingi`,
        data: { totalProducts, totalValue }
      };
    }

    return {
      success: true,
      message: `${product.name}: una ${product.stock_quantity} kwenye hifadhi`,
      data: { product: product.name, stock: product.stock_quantity }
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
      data: { results: results.length }
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
        data: { salesCount: saleCount, totalAmount: totalSales }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Imeshindwa kupata ripoti'
      };
    }
  }
}
