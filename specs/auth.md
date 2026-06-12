# Auth 规格

## 1. 目标

定义注册、登录、退出、会话恢复、当前账号上下文的实现边界，保证：

- 未登录用户无法进入业务路由
- 登录成功后进入总览页
- 刷新后可恢复会话
- 本地多账号密码不以明文或可逆形式保存

## 2. 模块归属

- 顶层模块：`Auth`
- 上游消费方：`App Shell`
- 下游依赖：`Shared Platform`、Auth adapter

## 3. 职责边界

`Auth` 负责：
- 注册
- 登录
- 退出
- 会话恢复
- 当前账号获取
- 登录态上下文暴露

`Auth` 不负责：
- RBAC
- 组织、多成员体系
- 业务数据读写

## 4. 对外接口

建议最小接口：

```ts
type Account = {
  id: string;
  username: string;
  createdAt: string;
};

type AccountCredential = {
  accountId: string;
  passwordVerifier: {
    algorithm: "PBKDF2-SHA-256";
    version: number;
    iterations: number;
    salt: string;
    digest: string;
  };
};

type RegisterInput = {
  username: string;
  password: string;
  confirmPassword: string;
};

type LoginInput = {
  username: string;
  password: string;
};

type AuthSession = {
  account: Account;
  issuedAt: string;
};

interface AuthService {
  register(input: RegisterInput): Promise<Account>;
  login(input: LoginInput): Promise<AuthSession>;
  logout(): Promise<void>;
  restoreSession(): Promise<AuthSession | null>;
  getCurrentAccount(): Promise<Account | null>;
}
```

## 5. 页面与路由规则

需要落地的页面：
- `/login`
- `/register`

路由规则：
- 未登录访问业务路由时跳到 `/login`
- 已登录访问 `/login` 或 `/register` 时跳到 `/overview`
- 刷新页面时先尝试 `restoreSession`
- 会话失效时清空登录态并回到 `/login`

## 6. 校验规则

注册：
- 用户名必填，长度 `4-30`
- 密码必填，长度 `6-30`
- 确认密码必填，且必须与密码一致
- 用户名不能重复

登录：
- 用户名必填
- 密码必填
- 用户名或密码错误时统一报错，不泄露更多细节

## 7. 状态模型

全局 Auth 状态至少包含：

```ts
type AuthStatus = "idle" | "restoring" | "authenticated" | "guest";

type AuthState = {
  status: AuthStatus;
  account: Account | null;
  error: string | null;
};
```

页面状态：
- 初始态
- 提交中
- 提交成功
- 字段错误
- 提交失败

## 8. 本地实现约束

- 账号与密码校验数据存入 IndexedDB，活动 session 与账号记录分开存储。
- 注册使用 Web Crypto 生成随机盐，并通过 PBKDF2-SHA-256 派生密码校验值。
- 迭代次数、盐、摘要、算法和参数版本随账号保存，不保存明文密码或可逆密钥。
- 页面只能通过 Auth adapter 登录或注册，不直接访问 IndexedDB、Web Crypto 或 session 存储。
- 业务 Repository 只能从有效 session 获取当前 `accountId`，调用方不能覆盖账号归属。
- `tradgio_passwords` 旧明文密码仅在用户成功输入原密码后迁移；成功后立即删除对应明文。
- 活动 session 不进入整机备份，恢复完成后必须重新登录。
- 忘记密码无法通过邮件或管理员找回，界面必须明确提示该限制。
- 无有效 session 时禁止业务数据和附件读写。
- 本地账号隔离不替代 Windows 账号、磁盘加密和系统锁屏。

## 9. 异常与反馈

需要覆盖：
- 必填未填
- 两次密码不一致
- 用户名重复
- 用户名或密码错误
- session 不存在
- session 数据损坏
- 密码参数版本不兼容
- 旧明文密码迁移失败

反馈规则：
- 字段错误就近展示
- 会话恢复失败时自动退回 guest，不阻塞页面

## 10. 验收标准

- 注册成功后可跳回登录页
- 登录成功后进入总览页
- 刷新后仍保持登录态
- 退出登录后不能继续访问业务页
- 业务页在未登录状态下会跳到登录页
- 页面不直接调用底层存储
- IndexedDB 和 localStorage 中不存在明文或可逆密码
- 备份包含账号校验数据但不包含活动 session

## 11. 后续扩展点

未来如通过新 ADR 切换外部身份服务，只应替换：
- `AuthService` 实现
- session/token 存取细节

不应重写：
- 页面表单
- 路由守卫逻辑
- 全局登录态消费方式
