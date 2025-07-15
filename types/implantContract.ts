export interface ProductPrice {
  productName: string;
  specification: string;
  price: number;
}

export interface ImplantContract {
  _id: string;
  companyName: string;
  contractDate: string;
  promotionAmount: number;
  markupRate: number;
  paymentMethod: string;
  paymentTerms: string;
  benefits: string;
  productPrices: ProductPrice[];
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImplantContractFormData {
  companyName: string;
  contractDate: string;
  promotionAmount: number;
  markupRate: number;
  paymentMethod: string;
  paymentTerms: string;
  benefits: string;
  productPrices: ProductPrice[];
  isActive: boolean;
}