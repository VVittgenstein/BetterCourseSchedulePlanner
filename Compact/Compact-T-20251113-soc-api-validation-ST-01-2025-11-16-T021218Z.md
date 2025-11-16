# Compact – 实现 SOC API 探测 CLI 并生成原始快照 (T-20251113-soc-api-validation-ST-01)

## Scope Alignment
- 面向 Rutgers SOC 公开 API，提供 scripts/soc_probe.ts CLI、示例配置与最小测试以生成 `data/raw/<term>-<campus>.json` 快照并记录请求日志，record.json:77-120 标记该子任务完成。

## Confirmed Facts（已实现且具备代码覆盖，但 **尚未运行本地测试**，需后续验证）
- CLI：`scripts/soc_probe.ts` 装载 `--config` JSON（默认 `configs/soc_probe.sample.json`），按 term/campus/subject 组合调用 SOC `courses.json`，聚合结果写入 `data/raw/<term>-<campus>.json`，并把每次请求的状态码、耗时、记录数追加到 `logs/soc_probe.log`。失败请求会写日志并抛错以便 CI 失败。
- 配置示例：`configs/soc_probe.sample.json` 定义 `baseUrl`、`endpoint`、`outputDir`、`logFile`、`requestIntervalMs` 等字段，并列出 term/campus/subjects 组合，可直接被 CLI 使用。
- 日志 / 快照目录通过 `.gitignore` + `.gitkeep` 保留结构但忽略实际输出文件；README 记录前置条件 (Node 18+/pnpm 9)、安装步骤、CLI/测试命令。
- 回归测试：`tests/soc_probe.spec.ts` 使用 Vitest + Nock，覆盖成功聚合与失败冒泡逻辑；`package.json`/`tsconfig.json`/`vitest.config.ts` 配置 TypeScript、ts-node、Vitest 运行环境，并新增 axios、zod、nock 等依赖。

## Interface / Behavior Changes
- 新增 `pnpm ts-node scripts/soc_probe.ts --config <file>` 命令（README.md:4-38），以及 `pnpm test` / `pnpm install` 指南，影响后续自动化脚本与CI。
- `record.json` 将 ST-01 状态设为 `done`，并将交付产物列为 `scripts/soc_probe.ts`、`configs/soc_probe.sample.json`、`tests/soc_probe.spec.ts`、`README.md`。

## Risks / TODO
- CLI 与测试均未实际运行：当前环境缺少 Node.js/pnpm（自测说明指出需安装 Node 18+ 与 pnpm 后执行 `pnpm install && pnpm test && pnpm ts-node ...`），所有行为仍需真实依赖验证。
- `scripts/soc_probe.ts` 目前串行请求且没有限流/重试策略，若 SOC API 易限流需在后续任务中扩展。

## Testing
- **未执行**：编码代理因缺少 Node.js/pnpm 无法运行 `pnpm install/test` 或真实 CLI；需要在具备依赖的环境补跑。
