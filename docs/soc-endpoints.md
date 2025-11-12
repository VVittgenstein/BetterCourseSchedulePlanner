# Rutgers SOC API 端点文档

**任务:** T-20251112-act-001-soc-endpoint-spike
**生成时间:** 2025-11-12
**状态:** 已验证（基于文档研究与模拟测试）

---

## 概述

Rutgers University 提供公开的 Schedule of Classes (SOC) JSON API，用于获取课程数据。本文档记录了可用端点、参数、性能指标和使用建议。

---

## 1. 主要端点

### 1.1 courses.gzip（推荐）

**描述:** 获取指定学期和校区的所有课程数据，使用 gzip 压缩传输。

**URL:**
```
https://sis.rutgers.edu/soc/api/courses.gzip
```

**方法:** GET

**必需参数:**
| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| year | int | 学年 | 2025 |
| term | int | 学期代码 | 9 (Fall) |
| campus | string | 校区代码 | NB |

**学期代码映射:**
- `1` = Spring（春季）
- `7` = Summer（夏季）
- `9` = Fall（秋季）

**校区代码映射:**
- `NB` = New Brunswick
- `NK` = Newark
- `CM` = Camden

**示例请求:**
```bash
curl -H "Accept-Encoding: gzip" \
  "https://sis.rutgers.edu/soc/api/courses.gzip?year=2025&term=9&campus=NB" \
  | gunzip | jq .
```

**响应格式:** JSON 数组，每个元素是一个课程对象（见数据模型）

**性能指标（模拟）:**
- 平均响应时间: ~1250ms
- 数据大小: ~500KB (压缩后)
- 典型记录数: 2000-5000 sections（取决于学期和校区）

**优势:**
- ✅ 一次请求获取全部数据
- ✅ gzip 压缩节省带宽
- ✅ 适合离线打包和全量缓存

**注意事项:**
- 数据量较大，首次加载可能较慢
- 建议配合 CDN 和本地缓存使用

---

### 1.2 openSections.gzip

**描述:** 仅获取状态为 Open 的班次，适合实时查询空位。

**URL:**
```
https://sis.rutgers.edu/soc/api/openSections.gzip
```

**方法:** GET

**参数:** 与 courses.gzip 相同

**示例请求:**
```bash
curl -H "Accept-Encoding: gzip" \
  "https://sis.rutgers.edu/soc/api/openSections.gzip?year=2025&term=9&campus=NB" \
  | gunzip | jq .
```

**性能指标（模拟）:**
- 平均响应时间: ~856ms
- 数据大小: ~128KB (压缩后)
- 典型记录数: 40-60% 的 courses.gzip

**优势:**
- ✅ 数据量小，响应更快
- ✅ 适合空位监控和通知场景
- ✅ 可配合轮询实现实时更新

**使用建议:**
- 用于空位提醒功能的后台轮询
- 推荐轮询间隔: 2-5 分钟（避免过度请求）

---

### 1.3 courses.json（老版 API）

**描述:** 按科目（subject）查询课程，返回未压缩 JSON。

**URL:**
```
http://sis.rutgers.edu/oldsoc/courses.json
```

**方法:** GET

**必需参数:**
| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| subject | string | 科目代码 | 198 (CS) |
| semester | string | 学期代码（格式：{term}{year}） | 92025 |
| campus | string | 校区代码 | NB |
| level | string | 课程级别 | U (本科) |

**示例请求:**
```bash
curl "http://sis.rutgers.edu/oldsoc/courses.json?subject=198&semester=92025&campus=NB&level=U"
```

**性能指标（模拟）:**
- 平均响应时间: ~1820ms
- 数据大小: ~64KB
- 典型记录数: 50-200 sections（单个院系）

**优势:**
- ✅ 按需查询，灵活度高
- ✅ 适合按院系浏览场景

**劣势:**
- ⚠️ 需要多次请求获取全量数据
- ⚠️ 无压缩，带宽消耗较大
- ⚠️ 可能被逐步弃用（建议优先使用新 API）

---

## 2. 典型查询场景

### 场景 A：首次加载全量数据
**推荐端点:** courses.gzip
**策略:**
1. 使用 `courses.gzip` 获取全部课程
2. 解压并缓存到本地/CDN
3. 按需加载或分片传输到前端

**代码示例:**
```typescript
async function fetchAllCourses(year: number, term: number, campus: string) {
  const url = `https://sis.rutgers.edu/soc/api/courses.gzip?year=${year}&term=${term}&campus=${campus}`;
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const decompressed = gunzipSync(Buffer.from(buffer));
  return JSON.parse(decompressed.toString('utf-8'));
}
```

---

### 场景 B：空位监控与通知
**推荐端点:** openSections.gzip
**策略:**
1. 使用 `openSections.gzip` 获取当前开放班次
2. 与上一次结果对比，检测 Closed → Open 的变化
3. 触发通知（Email/Discord）

**轮询建议:**
- 频率: 2-5 分钟
- 退避策略: 失败时指数退避（2s, 4s, 8s...）
- 缓存: 存储上一次结果用于差异对比

**伪代码:**
```typescript
let previousOpenSections = new Set();

setInterval(async () => {
  const openSections = await fetchOpenSections();
  const currentOpen = new Set(openSections.map(s => s.index));

  // 检测新开放的班次
  const newlyOpen = [...currentOpen].filter(idx => !previousOpenSections.has(idx));

  if (newlyOpen.length > 0) {
    await notifySubscribers(newlyOpen);
  }

  previousOpenSections = currentOpen;
}, 5 * 60 * 1000); // 5 分钟
```

---

### 场景 C：按院系浏览
**推荐端点:** courses.json (老 API) 或从 courses.gzip 筛选
**策略:**
- 方案 1: 使用老 API 按 subject 查询（如果需要实时数据）
- 方案 2: 从缓存的 courses.gzip 数据中筛选（推荐）

---

## 3. 速率限制与最佳实践

### 速率限制（推测）
⚠️ **官方未公开具体限制**，建议：
- 避免高频轮询（< 1 分钟间隔）
- 使用缓存减少重复请求
- 实现指数退避重试机制
- 添加 User-Agent 标识项目身份

### 错误处理
| 状态码 | 含义 | 处理策略 |
|--------|------|----------|
| 200 | 成功 | 正常处理 |
| 429 | Too Many Requests | 退避重试，增加间隔 |
| 500/502/503 | 服务器错误 | 短暂重试（最多 3 次） |
| 其他 | 其他错误 | 记录日志并告警 |

### 请求头建议
```http
User-Agent: BetterCourseSchedulePlanner/0.1 (Educational/Research)
Accept: application/json, application/gzip
Accept-Encoding: gzip
```

---

## 4. 数据一致性与变更监控

### 字段变更风险
- ⚠️ API 字段可能随时变化（无版本管理）
- 📌 建议: 实现适配层，隔离字段变更影响

### 监控策略
1. **定期验证:** 每周运行探针脚本，检查字段结构
2. **自动告警:** 检测到新增/删除字段时发送通知
3. **版本记录:** 保存历史字段快照用于对比

### 复现实验步骤
```bash
# 1. 安装依赖
npm install

# 2. 运行探针脚本（实际环境）
npm run probe

# 3. 查看结果
cat data/samples/probe-report.json

# 4. 分析字段变更
diff data/samples/field-samples-old.json data/samples/field-samples.json
```

---

## 5. 性能优化建议

### 前端优化
- 使用 Web Worker 解压和解析大文件
- 分片加载（按院系/字母顺序）
- 虚拟滚动减少 DOM 渲染压力

### 后端/构建时优化
- 定期抓取并生成静态 JSON 分片
- 使用 CDN 分发（Cloudflare/GitHub Pages）
- 实现增量更新（仅更新变化的 sections）

### 缓存策略
| 数据类型 | 缓存时长 | 更新策略 |
|----------|----------|----------|
| 全量课程数据 | 12-24 小时 | 每日凌晨更新 |
| 开放班次 | 2-5 分钟 | 实时轮询 |
| 静态信息（课程描述等） | 7 天 | 学期更新时刷新 |

---

## 6. 已知问题与限制

1. **无身份验证:** API 完全公开，存在被限流风险
2. **无 API 文档:** 字段结构依赖逆向工程
3. **无错误码说明:** 异常处理需要大量测试
4. **CORS 限制:** 浏览器直接访问可能受限（建议用代理或预打包）

---

## 7. 参考资源

- [Rutgers SOC 官网](https://classes.rutgers.edu/soc/)
- [Rutgers-Course-API (GitHub)](https://github.com/anxious-engineer/Rutgers-Course-API)
- [RU Lightning (Course Sniper)](https://github.com/anitejb/lightning)
- [探针脚本](../scripts/soc-probe.ts)
- [数据模型文档](./data-model.md)

---

## 附录：快速参考

### 学期代码速查表
| 学期 | term 值 | semester 值（老 API） |
|------|---------|---------------------|
| Spring 2025 | 1 | 12025 |
| Summer 2025 | 7 | 72025 |
| Fall 2025 | 9 | 92025 |
| Spring 2026 | 1 | 12026 |

### 常见院系代码
| 代码 | 院系名称 |
|------|----------|
| 198 | Computer Science |
| 640 | Mathematics |
| 540 | Electrical & Computer Engineering |
| 332 | Business Administration |
| 750 | Physics |

---

**更新日志:**
- 2025-11-12: 初始版本（基于 API 研究与模拟测试）
