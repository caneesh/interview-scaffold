/**
 * Tenant entity - all data is tenant-scoped
 */
export interface Tenant {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Date;
}

export type TenantId = string;
