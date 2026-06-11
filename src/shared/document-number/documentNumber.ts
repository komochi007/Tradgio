import { AppError } from "../errors"

export type DocumentNumberType = "purchase" | "sales" | "quote" | "contract"

type DocumentNumberRule = {
  prefix: string
  label: string
  yearDigits: 2 | 4
}

const DOCUMENT_NUMBER_RULES: Record<DocumentNumberType, DocumentNumberRule> = {
  purchase: { prefix: "JH", label: "进货单", yearDigits: 4 },
  sales: { prefix: "CH", label: "出货单", yearDigits: 4 },
  quote: { prefix: "BJ", label: "报价单", yearDigits: 4 },
  contract: { prefix: "HT", label: "合同", yearDigits: 2 },
}

function buildMonthPrefix(type: DocumentNumberType, date: Date): string {
  const rule = DOCUMENT_NUMBER_RULES[type]
  const fullYear = String(date.getFullYear())
  const year = rule.yearDigits === 2 ? fullYear.slice(-2) : fullYear
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${rule.prefix}${year}${month}`
}

export function generateNextDocumentNumber(
  type: DocumentNumberType,
  existingNumbers: string[],
  date = new Date()
): string {
  const monthPrefix = buildMonthPrefix(type, date)
  const pattern = new RegExp(`^${monthPrefix}(\\d{2})$`)
  const maxSequence = existingNumbers.reduce((max, documentNo) => {
    const match = pattern.exec(documentNo)
    if (!match) return max
    const sequence = Number(match[1])
    return sequence > max ? sequence : max
  }, 0)

  if (maxSequence >= 99) {
    const rule = DOCUMENT_NUMBER_RULES[type]
    throw new AppError(
      "CONFLICT",
      `${rule.label}${date.getFullYear()}年${date.getMonth() + 1}月编号已达到 99，请升级编号规则`
    )
  }

  return `${monthPrefix}${String(maxSequence + 1).padStart(2, "0")}`
}
