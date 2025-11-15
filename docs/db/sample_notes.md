# Spring 2026 SOC 原始样本

> 生成时间：2025-11-15 20:00 UTC；脚本：`scripts/fetch_spring_2026_samples.py`（`python3 scripts/fetch_spring_2026_samples.py --year 2026 --term 1 --campuses NB,NK,CM`）

## 1. 样本概览

- 路径：`data/raw/spring-2026-{campus}-{endpoint}.json.gz` + `.metadata.json`
- 筛选：`year=2026`、`term=1`（Spring）、`campus ∈ {NB, NK, CM}`
- metadata 文件包含请求 URL、响应头、下载耗时、payload 字节、gz 大小、sha256，以及课程/section 数量或空位 index 数量

| Campus | courses_count | sections_count | open_section_count | courses.gz (KB) | openSections.gz (KB) |
| --- | --- | --- | --- | --- | --- |
| NB | 4,608 | 11,680 | 13,781 | 811 | 31 |
| NK | 1,210 | 2,397 | 13,781 | 161 | 31 |
| CM | 963 | 1,752 | 13,781 | 141 | 31 |

## 2. 观察 & 注意事项

1. `courses.json` 端点严格按 campus 过滤，不同校区的课程/section 数量差异明显，同时 `Cache-Control: max-age=900`，响应体 gzip 后 141–811 KB。
2. `openSections.json` 当前在 Spring 2026 term 下**无视 campus** 参数：NB/NK/CM 三个请求返回完全相同的 payload（`sha256=5b089a...19d`，`open_section_count=13,781`，`Cache-Control: max-age=30`）。后续轮询或 schema 设计应假设 open sections 仅按 `term+year` 生效，或者针对不同 campus 做本地过滤。
3. 服务端 `Content-Encoding=gzip`，storage 端保持 gzip 原始字节，确保可复用 `ETag`/`Content-Length`。metadata 中的 `payload_bytes` 为解压后的 JSON 大小，可用于预估 SQLite 导入体积。
4. `openSections` 响应大小稳定（32 KB gzip），即使不同 campus 返回相同内容，也可通过 metadata 的 `ETag`/`Set-Cookie` 对应单次抓取，方便后续排查。

## 3. 下一步建议

- 在 `docs/db/field_dictionary.md` 中基于这些样本提取字段稀疏度与嵌套关系。
- 在增量更新策略中明确：当 openSections 被检测为 campus 无差异时，应在本地对课程数据按 campus 关联，否则 NB 数据即可覆盖 NK/CM。
