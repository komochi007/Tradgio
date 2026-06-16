# Windows 恢复演练执行包

本文用于补齐任务 45/46 的目标 Windows Chrome/Edge 全新配置恢复证据。执行过程中不要把备份密码、派生密钥、附件内容或真实业务正文写入记录。

## 1. 演练目标

- 在目标 Windows 的 Chrome 最新稳定版中，用全新浏览器配置恢复 `.tradgio-backup`。
- 在目标 Windows 的 Edge 最新稳定版中，用全新浏览器配置恢复同一类备份。
- 恢复后核对账号、货品、往来单位、进货、出货、报价、合同、库存、搜索和附件下载。
- 保存恢复报告、恢复前快照和人工核对记录。

## 2. 准备材料

- 正式地址：`https://komochi007.github.io/Tradgio/`
- 应用版本：`0.1.0`
- IndexedDB schema 版本：`1`
- 备份文件：`.tradgio-backup`
- 备份文件 SHA-256：在 Windows PowerShell 中执行：

```powershell
Get-FileHash "D:\path\to\backup.tradgio-backup" -Algorithm SHA256
```

- 备份密码：仅由操作者在浏览器中输入，不记录、不发送。
- 核对基准：源电脑备份预览或源系统中可见的账号数、货品数、单位数、单据数、合同数、库存摘要和附件数量。

## 3. Chrome 全新配置恢复

1. 关闭所有 Chrome 窗口。
2. 在 Windows 运行窗口或 PowerShell 打开全新临时配置：

```powershell
& "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" --user-data-dir="$env:TEMP\tradgio-chrome-recovery" --no-first-run "https://komochi007.github.io/Tradgio/"
```

3. 确认页面可打开，并显示登录或应用入口。
4. 打开“数据备份”页，选择 `.tradgio-backup`。
5. 输入备份密码，点击“检查备份并预览”。
6. 核对预览中的账号、记录统计、金额、库存和附件统计。
7. 勾选整机替换确认，点击“保存恢复前快照并恢复”。
8. 确认下载了 `.pre-restore.tradgio-backup` 和 `tradgio-restore-report-*`。
9. 恢复后重新登录，执行第 5 节核对清单。

## 4. Edge 全新配置恢复

1. 关闭所有 Edge 窗口。
2. 在 Windows 运行窗口或 PowerShell 打开全新临时配置：

```powershell
& "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe" --user-data-dir="$env:TEMP\tradgio-edge-recovery" --no-first-run "https://komochi007.github.io/Tradgio/"
```

如果 Edge 安装在 `ProgramFiles`，将路径改为：

```powershell
& "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe" --user-data-dir="$env:TEMP\tradgio-edge-recovery" --no-first-run "https://komochi007.github.io/Tradgio/"
```

3. 按 Chrome 同样步骤完成恢复、下载报告、重新登录和核对。

## 5. 核对清单

每个浏览器都需要记录通过或失败：

| 核对项 | Chrome | Edge | 备注 |
|---|---|---|---|
| 全新配置打开正式地址 |  |  |  |
| 备份文件 SHA-256 已记录 |  |  |  |
| 恢复预览可显示 |  |  |  |
| 恢复前快照已下载 |  |  |  |
| 恢复报告已下载 |  |  |  |
| 恢复后可重新登录 |  |  |  |
| 货品数量和关键货品一致 |  |  |  |
| 往来单位数量和关键单位一致 |  |  |  |
| 进货单数量、金额和详情一致 |  |  |  |
| 出货单数量、金额、库存影响一致 |  |  |  |
| 报价单数量、金额和导出入口一致 |  |  |  |
| 合同数量和关键合同一致 |  |  |  |
| 合同附件可下载，文件名和大小一致 |  |  |  |
| 库存摘要一致，无异常负库存 |  |  |  |
| 搜索可找到关键货品、单位、单据和合同 |  |  |  |
| 控制台无 error |  |  |  |

## 6. 记录模板

将以下内容填入任务验收记录，不要填写密码。

```text
演练日期：
Windows 版本：
网络环境：
正式地址：
应用版本：
IndexedDB schema 版本：
备份文件名：
备份文件 SHA-256：

Chrome 版本：
Chrome 全新配置路径：
Chrome 恢复时间：
Chrome 恢复前快照文件名：
Chrome 恢复报告文件名：
Chrome 核对结论：通过 / 不通过
Chrome 问题记录：

Edge 版本：
Edge 全新配置路径：
Edge 恢复时间：
Edge 恢复前快照文件名：
Edge 恢复报告文件名：
Edge 核对结论：通过 / 不通过
Edge 问题记录：

人工核对摘要：
- 账号：
- 货品：
- 往来单位：
- 进货：
- 出货：
- 报价：
- 合同：
- 附件：
- 库存：
- 搜索：
- 导出：

最终结论：通过 / 不通过
操作者确认：
```

## 7. 失败处理

- 预览统计不一致：取消恢复，保留备份文件和截图，不继续写入。
- 未下载恢复前快照：不执行恢复。
- 恢复后无法登录：保留恢复报告，回到源环境重新生成备份后再试。
- 附件下载失败或数量不一致：停止上线验收，保留恢复报告和问题截图。
- 控制台出现 error：记录完整错误文本和触发页面，不进入允许上线结论。
