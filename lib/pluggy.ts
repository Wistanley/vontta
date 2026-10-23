export interface BankAccount {
  id: string;
  itemId: string;
  name: string;
  institution: string;
  type: 'BANK' | 'CREDIT';
  number: string;
  balance: number;
  currencyCode: string;
  creditLimit?: number;
  availableCreditLimit?: number;
  balanceDueDate?: string;
  balanceCloseDate?: string;
  syncedAt?: string;
}
export interface PluggyState {
  configured: boolean;
  storageReady: boolean;
  clientId: string;
  itemIds: string[];
  accounts: BankAccount[];
}
