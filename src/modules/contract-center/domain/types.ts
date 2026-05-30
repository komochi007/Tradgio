export type ContractAttachment = {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  dataUrl: string
  uploadedAt: string
}

export type ContractRecord = {
  id: string
  contractNo: string
  title: string
  customerId: string
  customerName: string
  signDate: string
  remark: string
  attachments: ContractAttachment[]
  createdAt: string
  updatedAt: string
}

export type ContractFormData = {
  contractNo: string
  title: string
  customerId: string
  customerName: string
  signDate: string
  remark: string
}

export type ContractFileEntry = {
  file: File
  previewId: string
}

export function validateContractForm(data: ContractFormData): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!data.contractNo.trim()) {
    errors.contractNo = "请输入合同编号"
  }

  if (!data.title.trim()) {
    errors.title = "请输入合同标题"
  } else if (data.title.length > 100) {
    errors.title = "合同标题不能超过 100 个字"
  }

  if (!data.customerId) {
    errors.customerId = "请选择客户"
  }

  if (!data.signDate) {
    errors.signDate = "请选择签订日期"
  }

  if (data.remark.length > 500) {
    errors.remark = "备注不能超过 500 个字"
  }

  return errors
}

export function validateFile(file: File): string | null {
  const maxSize = 20 * 1024 * 1024
  if (file.size > maxSize) {
    return "单个文件不能超过 20MB"
  }

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]
  if (!allowedTypes.includes(file.type)) {
    return "仅支持 PDF、图片（JPG/PNG/GIF）、Word、Excel 格式"
  }

  return null
}

export function emptyContractForm(): ContractFormData {
  return {
    contractNo: "",
    title: "",
    customerId: "",
    customerName: "",
    signDate: new Date().toISOString().slice(0, 10),
    remark: "",
  }
}

export function contractToFormData(record: ContractRecord): ContractFormData {
  return {
    contractNo: record.contractNo,
    title: record.title,
    customerId: record.customerId,
    customerName: record.customerName,
    signDate: record.signDate.slice(0, 10),
    remark: record.remark,
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
