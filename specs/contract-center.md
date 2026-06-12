# Contract Center 规格

## 1. 目标

定义合同记录、附件元数据、上传下载和按客户查询规则，保证：

- 合同信息集中管理
- 元数据与二进制分离
- 上传失败不留半成品
- 可被搜索模块消费

## 2. 模块归属

- 顶层模块：`Contract Center`
- 上游消费方：`Search`、`App Shell`
- 下游依赖：`Shared Platform`、文件存储 adapter

## 3. 职责边界

账号约束：
- 合同记录必须包含 `accountId`
- 列表、详情、修改、删除和附件操作只能作用于当前账号
- 保存时必须校验客户属于当前账号

负责：
- 合同列表
- 合同详情
- 合同记录新增 / 编辑
- 附件上传
- 附件下载
- 按客户查询

不负责：
- 合同正文生成
- 库存管理
- 单据导出

## 4. 领域对象

```ts
type ContractAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
};

type ContractRecord = {
  id: string;
  contractNo: string;
  title: string;
  customerId: string;
  customerName: string;
  signDate: string;
  remark: string;
  attachments: ContractAttachment[];
  createdAt: string;
  updatedAt: string;
};
```

## 5. 对外接口

```ts
createContractRecord(input, files)
updateContractRecord(id, input, files?)
listContractRecords(query?)
getContractRecord(id)
downloadAttachment(attachmentId)
```

## 6. 表单字段建议

至少包含：
- 合同编号
- 合同标题
- 客户
- 签订日期
- 备注
- 附件

其中：
- 客户应从 `Master Data` 引用
- 附件支持 1 个或多个文件

## 7. 上传规则

标准流程：

```text
校验字段与文件
-> 读取文件为 Blob
-> 通过 File Adapter 写入附件 Blob store
-> 写入 ContractRecord 与附件元数据
```

约束：
- 文件二进制与元数据分开处理
- 合同、附件元数据和 Blob 使用同一个 IndexedDB transaction 提交
- 保存失败不能留下只写一半的数据或孤儿 Blob
- 页面不直接操作 IndexedDB 或 Blob store
- 附件默认单文件上限 20 MB
- Storage API 使用率达到 70% 时提醒，达到 85% 时阻止继续写入附件
- 浏览器无法返回可靠容量时仍执行单文件限制，并提示用户备份和清理

## 8. 页面结构建议

列表页：
- 搜索框
- 客户筛选
- 合同表格
- 上传入口

上传页 / 编辑页：
- 元数据表单区
- 附件选择区
- 提交操作区

详情页：
- 基本信息区
- 附件列表区
- 下载入口

## 9. 页面状态

至少覆盖：
- 初始态
- 加载态
- 空态
- 错误态
- 上传中
- 上传失败
- 正常态

## 10. 校验规则

- 合同编号由系统按 `HT + YYMM + 两位流水号` 自动生成，编辑时不可修改
- 编号按当前账号和月份读取最大流水号后递增，不复用缺号
- 保存时再次校验当前账号内合同编号唯一，当月达到 `99` 后阻止创建
- IndexedDB 必须建立账号与合同编号的复合唯一索引
- 标题必填
- 客户必选
- 签订日期必填
- 文件格式和数量需有基础约束
- 单个文件不得超过 20 MB

MVP 阶段可先不做复杂格式白名单，但要保留校验入口。

## 11. 与搜索模块的协作

至少暴露给搜索模块：
- 合同标题
- 合同编号
- 客户名称
- 签订日期
- 合同详情跳转标识

## 12. 验收标准

- 可创建合同记录
- 可上传附件并保存附件元数据
- 合同详情页可看到附件列表
- 可按客户筛选合同
- 上传失败时不留下半成品记录
- 删除附件后不留下孤儿 Blob
- 附件进入整机加密备份并可完整恢复
