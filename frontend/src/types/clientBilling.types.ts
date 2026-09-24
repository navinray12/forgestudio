export interface ClientBillingConfig {
  enabled: boolean;
  clientEmail: string;
  clientName: string;
  currency: string;             // 'USD', 'EUR', 'INR', 'GBP', etc.
  baseCostMonthly: number;       // Platform base fee, e.g. 15
  clientPriceMonthly: number;    // Agency price to client, e.g. 49
  marginMonthly: number;         // Computed profit, e.g. 34
  billingInterval: 'month' | 'year';
  stripeConnectedAccountId?: string;
  subscriptionStatus: 'UNBILLED' | 'PENDING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  clientInvoiceUrl?: string;
  lastBilledAt?: string;
}

export interface ClientBillingSummary {
  config: ClientBillingConfig;
  annualProjectedRevenue: number;
  annualProjectedProfit: number;
  hasStripeConnect: boolean;
}
