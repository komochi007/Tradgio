export type CounterpartyType = "customer" | "supplier"

export type CounterpartyStatus = "active" | "inactive"

export type Counterparty = {
  id: string
  name: string
  type: CounterpartyType
  contactPerson: string
  phone: string
  address: string
  notes: string
  status: CounterpartyStatus
  createdAt: string
  updatedAt: string
}

export type CounterpartyFormData = {
  name: string
  type: CounterpartyType
  contactPerson: string
  phone: string
  address: string
  notes: string
}

export function validateCounterpartyForm(data: CounterpartyFormData): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.name.trim()) {
    errors.name = "请输入单位名称"
  } else if (data.name.length > 50) {
    errors.name = "单位名称不能超过 50 个字"
  }

  if (!data.type) {
    errors.type = "请选择单位类型"
  }

  if (data.contactPerson.length > 20) {
    errors.contactPerson = "联系人不能超过 20 个字"
  }

  if (data.phone.length > 20) {
    errors.phone = "联系电话不能超过 20 个字"
  }

  if (data.address.length > 100) {
    errors.address = "地址不能超过 100 个字"
  }

  if (data.notes.length > 200) {
    errors.notes = "备注不能超过 200 个字"
  }

  return errors
}

export function emptyCounterpartyForm(): CounterpartyFormData {
  return {
    name: "",
    type: "" as CounterpartyType,
    contactPerson: "",
    phone: "",
    address: "",
    notes: "",
  }
}

export function counterpartyToFormData(c: Counterparty): CounterpartyFormData {
  return {
    name: c.name,
    type: c.type,
    contactPerson: c.contactPerson,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
  }
}
