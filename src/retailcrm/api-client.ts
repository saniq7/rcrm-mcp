import axios, { AxiosInstance } from 'axios';

export interface RetailCRMConfig {
  baseUrl: string;
  apiKey: string;
}

export interface Order {
  id: number;
  externalId?: string;
  number: string;
  createdAt: string;
  source?: {
    code: string;
    name: string;
  };
  orderMethod?: {
    code: string;
    name: string;
  };
  sum: number;
  status?: {
    code: string;
    name: string;
  };
  customer?: {
    id: number;
    externalId?: string;
  };
  customFields?: Record<string, any>;
  [key: string]: any;
}

export interface Customer {
  id: number;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  createdAt: string;
  customFields?: Record<string, any>;
  [key: string]: any;
}

export interface ApiResponse<T> {
  success: boolean;
  orders?: T; // For /orders endpoint
  customers?: T; // For /customers endpoint
  [key: string]: any; // For dynamic reference responses
  pagination?: {
    limit: number;
    totalCount: number;
    currentPage: number;
    totalPageCount: number;
  };
  errors?: string[];
}

export class RetailCRMClient {
  private client: AxiosInstance;

  constructor(config: RetailCRMConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'X-API-KEY': config.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
    });
  }

  /**
   * Generic request method
   */
  private async request(endpoint: string, params: any = {}) {
    try {
      const response = await this.client.get(endpoint, { params });
      if (!response.data.success) {
        throw new Error(JSON.stringify(response.data.errors || 'Unknown error'));
      }
      return response.data;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`RetailCRM API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Get orders with flexible filtering
   */
  async getOrders(filter: any = {}, limit: number = 20, page: number = 1) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('page', page.toString());
    
    this.appendFilterParams(params, filter);

    const response = await this.request('/api/v5/orders', params);
    return {
      orders: response.orders || [],
      pagination: response.pagination
    };
  }

  /**
   * Get customers with flexible filtering
   */
  async getCustomers(filter: any = {}, limit: number = 20, page: number = 1) {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('page', page.toString());
    
    this.appendFilterParams(params, filter);

    const response = await this.request('/api/v5/customers', params);
    return {
      customers: response.customers || [],
      pagination: response.pagination
    };
  }

  /**
   * Get reference data (dictionaries)
   */
  async getReference(dictionary: string) {
    const endpoints: Record<string, string> = {
      'statuses': '/api/v5/reference/statuses',
      'order-types': '/api/v5/reference/order-types',
      'payment-types': '/api/v5/reference/payment-types',
      'delivery-types': '/api/v5/reference/delivery-types',
      'sites': '/api/v5/reference/sites',
      'order-methods': '/api/v5/reference/order-methods',
      'custom-fields': '/api/v5/custom-fields',
    };

    const endpoint = endpoints[dictionary];
    if (!endpoint) {
      throw new Error(`Unknown dictionary: ${dictionary}. Allowed: ${Object.keys(endpoints).join(', ')}`);
    }

    const response = await this.request(endpoint);
    
    // Different endpoints return data in different keys
    if (dictionary === 'custom-fields') {
      return response.customFields || [];
    }
    
    // Most reference endpoints return data in a key matching the dictionary name (e.g. "statuses")
    // or sometimes just a map. We try to find the relevant data key.
    const dataKey = Object.keys(response).find(k => k !== 'success' && k !== 'pagination');
    return response[dataKey || ''] || response;
  }

  /**
   * Helper to serialize nested filter objects for RetailCRM API
   * RetailCRM expects filter[name]=value, filter[customFields][code]=value
   */
  private appendFilterParams(params: URLSearchParams, filter: any, prefix: string = 'filter') {
    if (!filter) return;
    
    Object.entries(filter).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (typeof value === 'object' && !Array.isArray(value)) {
        this.appendFilterParams(params, value, `${prefix}[${key}]`);
      } else {
        params.append(`${prefix}[${key}]`, String(value));
      }
    });
  }
}
