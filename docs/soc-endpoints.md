# Rutgers Schedule of Classes (SOC) JSON API 文档

## 概述

Rutgers University 提供了 Schedule of Classes (SOC) JSON API，允许程序化访问课程信息。本文档记录了如何使用这些 API 端点。

## API 端点

### 1. 主要端点（当前版本）

#### 获取完整课程信息
```
https://sis.rutgers.edu/soc/api/courses.json
```
或者
```
https://classes.rutgers.edu/soc/api/courses.json
```

**说明**: 返回指定学期和校区的完整课程目录，包含详细的课程信息。

#### 获取开放课程
```
https://sis.rutgers.edu/soc/api/openSections.json
```
或者
```
https://classes.rutgers.edu/soc/api/openSections.json
```

**说明**: 返回有可用名额的课程索引的扁平数组。

#### 压缩版本
```
https://sis.rutgers.edu/soc/api/courses.gzip
https://sis.rutgers.edu/soc/api/openSections.gzip
```

**说明**: 相同的数据，但使用 gzip 压缩格式，适合大量数据传输。

### 2. 旧版端点（Legacy API）

```
http://sis.rutgers.edu/oldsoc/courses.json
```

**注意**: 这是较旧的 API 版本，使用不同的参数结构。

## 必要参数

### 当前 API 参数

| 参数名 | 类型 | 必需 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `year` | Integer | 是 | 学年 | `2025` |
| `term` | Integer | 是 | 学期代码 | `9` (Fall) |
| `campus` | String | 是 | 校区代码 | `NB` (New Brunswick) |

### 旧版 API 参数

| 参数名 | 类型 | 必需 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `subject` | String | 是 | 课程科目代码 | `198` (Computer Science) |
| `semester` | String | 是 | 学期标识符 | `92025` |
| `campus` | String | 是 | 校区代码 | `NB` |
| `level` | String | 是 | 课程等级 | `U` (Undergraduate), `G` (Graduate) |

## 学期代码与校区映射

### 学期代码 (Term Codes)

| 代码 | 学期 | 英文 |
|------|------|------|
| `0` | 冬季学期 | Winter |
| `1` | 春季学期 | Spring |
| `7` | 夏季学期 | Summer |
| `9` | 秋季学期 | Fall |

### 校区代码 (Campus Codes)

| 代码 | 校区名称 | 说明 |
|------|----------|------|
| `NB` | New Brunswick | 新布朗斯维克校区 |
| `NK` | Newark | 纽瓦克校区 |
| `CM` | Camden | 卡姆登校区 |
| `ONLINE_NB` | New Brunswick Online | 新布朗斯维克在线课程 |
| `ONLINE_NK` | Newark Online | 纽瓦克在线课程 |
| `ONLINE_CM` | Camden Online | 卡姆登在线课程 |

### 学期标识符构成（旧版 API）

学期标识符格式: `[term][year]`

示例:
- `92025` = Fall 2025（秋季 2025）
- `12025` = Spring 2025（春季 2025）
- `72025` = Summer 2025（夏季 2025）
- `02025` = Winter 2025（冬季 2025）

## API 使用示例

### 示例 1: 获取 2025 秋季新布朗斯维克校区所有课程

```bash
curl "https://sis.rutgers.edu/soc/api/courses.json?year=2025&term=9&campus=NB"
```

### 示例 2: 获取开放课程

```bash
curl "https://sis.rutgers.edu/soc/api/openSections.json?year=2025&term=9&campus=NB"
```

### 示例 3: 使用旧版 API 获取计算机科学本科课程

```bash
curl "http://sis.rutgers.edu/oldsoc/courses.json?subject=198&semester=92025&campus=NB&level=U"
```

### 示例 4: 下载压缩数据

```bash
curl "https://sis.rutgers.edu/soc/api/courses.gzip?year=2025&term=9&campus=NB" -o courses.gzip
gunzip courses.gzip
```

## 响应数据结构

### courses.json 结构

返回的 JSON 是一个数组，包含多个学科（subject），每个学科包含多个课程（course），每个课程包含多个课节（section）。

```json
[
  {
    "subject": "01:198",
    "subjectDescription": "Computer Science",
    "courses": [
      {
        "courseNumber": "111",
        "title": "Introduction to Computer Science",
        "credits": "4",
        "sections": [
          {
            "index": "12345",
            "sectionNumber": "01",
            "instructors": [...],
            "meetingTimes": [...],
            "openStatus": true,
            ...
          }
        ]
      }
    ]
  }
]
```

### openSections.json 结构

返回一个简单的字符串数组，包含所有有空位的课节索引号：

```json
["12345", "12346", "12347", ...]
```

## 数据字段说明

### Subject 级别字段
- `subject`: 学科代码（如 "01:198"）
- `subjectDescription`: 学科完整名称（如 "Computer Science"）
- `courses`: 该学科下的课程数组

### Course 级别字段
- `courseNumber`: 课程编号（如 "111", "112"）
- `title`: 课程标题
- `credits`: 学分数
- `sections`: 该课程的所有课节数组

### Section 级别字段（详见 field-descriptions.md）
- `index`: 课节注册索引号（唯一标识符）
- `sectionNumber`: 课节编号
- `openStatus`: 是否有空位（boolean）
- `instructors`: 教师信息数组
- `meetingTimes`: 上课时间和地点信息数组
- `crossListedSections`: 交叉列出的课节信息

## 访问限制和注意事项

1. **访问控制**: 某些端点可能有访问限制或需要特定的请求头（如 User-Agent）
2. **速率限制**: 建议合理控制请求频率，避免过度访问
3. **数据可用性**: 未来学期的数据可能尚未发布，请求时会返回空数据或错误
4. **HTTPS vs HTTP**: 新版 API 使用 HTTPS，旧版使用 HTTP

## 相关资源

- Rutgers Schedule of Classes 官方网站: https://classes.rutgers.edu/soc/
- API Documentation Hub: https://api-docs.rutgers.edu/

## 更新日期

本文档最后更新: 2025-11-12

## 下一步

查看 [field-descriptions.md](./field-descriptions.md) 了解详细的 JSON 字段说明。
