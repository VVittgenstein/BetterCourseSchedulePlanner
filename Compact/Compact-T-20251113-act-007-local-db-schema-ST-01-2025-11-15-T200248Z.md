# Compact · T-20251113-act-007-local-db-schema-ST-01 (2025-11-15T20:02:48Z)

## Confirmed Facts
- 新增 `scripts/fetch_spring_2026_samples.py`，支持按 `year/term/campus` 依次请求 `courses` 与 `openSections`，保留服务器返回的 gzip 字节、写入 `.json.gz`，并输出含 headers、duration、payload/课程计数的 `.metadata.json`（含 sha256 校验值） (`scripts/fetch_spring_2026_samples.py:1-188`).
- 运行脚本获取了 NB/NK/CM 三个校区 Spring 2026 样本：NB `courses_count=4608 / sections_count=11680` (`data/raw/spring-2026-NB-courses.metadata.json:1-26`)、`open_section_count=13781` (`data/raw/spring-2026-NB-openSections.metadata.json:1-25`)，NK/CM 同样生成各自的课程统计与 gzip 大小元数据 (`data/raw/spring-2026-NK-courses.metadata.json:1-26`, `data/raw/spring-2026-CM-courses.metadata.json:1-26`).
- `docs/db/sample_notes.md` 汇总了样本目录、gzip 大小、校区覆盖，并记录 `openSections.json` 在 Spring 2026 term 下对 NB/NK/CM 返回完全相同 payload（同一 sha256），提示后续需要在本地按 campus 过滤 (`docs/db/sample_notes.md:1-23`).
- `record.json` 中该子任务被标记为 `status=done`，并登记了脚本与所有样本文件作为产出 (`record.json:322-374`).

## Interface / Behavior Impact
- 提供 `scripts/fetch_spring_2026_samples.py` 以及 `data/raw/spring-2026-*.json.gz(.metadata)`，为数据库建模与增量策略提供固定输入样本；`sample_notes` 明确 openSections 的 campus 行为，可影响后续轮询/匹配逻辑 (`scripts/fetch_spring_2026_samples.py:1-188`, `docs/db/sample_notes.md:1-27`).

## Risks / TODO
- `openSections` 当前忽略 campus，仅按 term/year 返回；若后续学期行为不同须重新抓样本或在文档中注明条件，否则可能导致数据关联混淆 (`docs/db/sample_notes.md:17-22`).
- 抓取脚本在任意一次请求失败时直接退出（顺序执行，无重试/跳过），运行环境需要稳定网络；若要自动化 cron 抓取需补充容错与重试策略 (`scripts/fetch_spring_2026_samples.py:162-183`).

## Self-Test Evidence
- `python3 scripts/fetch_spring_2026_samples.py`：串行抓取 NB/NK/CM `courses` 与 `openSections`，命令行输出 `[OK]` 记录并填充 `data/raw` 目录 (execution log).
