export type DraftFormKey =
  | "product-new"
  | "counterparty-new"
  | "purchase-new"
  | "sales-new"
  | "quote-new"
  | "contract-new"

export type DraftRecord<T> = {
  accountId: string
  formKey: DraftFormKey
  data: T
  updatedAt: string
}
