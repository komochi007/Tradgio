# Auth 规格

## 1. 目标

定义注册、登录、退出、会话恢复、当前账号上下文的实现边界，保证：

- 未登录用户无法进入业务路由
- 登录成功后进入总览页
- 刷新后可恢复会话
- 后续可从 mock / local 实现切换到真实托管 Auth

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
  token: string;
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

开发阶段允许使用：
- localStorage 维护账户列表
- localStorage 维护当前 session

约束：
- 必须通过 Auth adapter 暴露，不允许页面直接操作 localStorage
- session 与 account 分开存储
- 为真实托管 Auth 预留替换点
- 业务 Repository 只能从有效 session 获取当前 `accountId`
- 登录和会话恢复会触发一次性账号归属迁移
- 无有效 session 时禁止业务数据读写

## 9. 异常与反馈

需要覆盖：
- 必填未填
- 两次密码不一致
- 用户名重复
- 用户名或密码错误
- session 不存在
- session 数据损坏

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

## 11. 后续扩展点

后续替换真实托管 Auth 时，只应替换：
- `AuthService` 实现
- session/token 存取细节

不应重写：
- 页面表单
- 路由守卫逻辑
- 全局登录态消费方式
