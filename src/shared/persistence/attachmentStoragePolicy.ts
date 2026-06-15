export const ATTACHMENT_MAX_FILE_SIZE = 20 * 1024 * 1024
export const ATTACHMENT_STORAGE_WARNING_RATIO = 0.7
export const ATTACHMENT_STORAGE_BLOCK_RATIO = 0.85

export type AttachmentStorageStatus = {
  usage: number | null
  quota: number | null
  projectedUsageRatio: number | null
  level: "normal" | "warning" | "blocked" | "unknown"
  message: string | null
}

export async function estimateAttachmentStorage(
  additionalBytes: number,
  storageManager?: Pick<StorageManager, "estimate">
): Promise<AttachmentStorageStatus> {
  const manager =
    storageManager ?? (typeof navigator === "undefined" ? undefined : navigator.storage)
  if (!manager?.estimate) {
    return {
      usage: null,
      quota: null,
      projectedUsageRatio: null,
      level: "unknown",
      message: "浏览器无法提供可靠容量信息，请及时备份并清理站点数据",
    }
  }

  let estimate: StorageEstimate
  try {
    estimate = await manager.estimate()
  } catch {
    return {
      usage: null,
      quota: null,
      projectedUsageRatio: null,
      level: "unknown",
      message: "浏览器无法提供可靠容量信息，请及时备份并清理站点数据",
    }
  }
  if (!estimate.quota || estimate.usage === undefined) {
    return {
      usage: estimate.usage ?? null,
      quota: estimate.quota ?? null,
      projectedUsageRatio: null,
      level: "unknown",
      message: "浏览器无法提供可靠容量信息，请及时备份并清理站点数据",
    }
  }

  const projectedUsageRatio = (estimate.usage + additionalBytes) / estimate.quota
  if (projectedUsageRatio >= ATTACHMENT_STORAGE_BLOCK_RATIO) {
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      projectedUsageRatio,
      level: "blocked",
      message: "本地存储预计达到 85%，请先备份并清理空间后再上传附件",
    }
  }
  if (projectedUsageRatio >= ATTACHMENT_STORAGE_WARNING_RATIO) {
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      projectedUsageRatio,
      level: "warning",
      message: "本地存储预计达到 70%，建议尽快备份并清理空间",
    }
  }

  return {
    usage: estimate.usage,
    quota: estimate.quota,
    projectedUsageRatio,
    level: "normal",
    message: null,
  }
}
