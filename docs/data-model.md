# Rutgers SOC 数据模型文档

**任务:** T-20251112-act-001-soc-endpoint-spike
**生成时间:** 2025-11-12
**数据来源:** Rutgers SOC API (courses.gzip)

---

## 概述

本文档描述 Rutgers Schedule of Classes (SOC) API 返回的数据结构，包括字段定义、类型说明和使用建议。

---

## 数据层级

```
Response (Array)
└── Course (对象)
    ├── 课程元数据 (subject, courseNumber, title, etc.)
    └── sections[] (数组)
        └── Section (对象)
            ├── 班次元数据 (index, number, openStatus, etc.)
            └── sectionData (对象)
                ├── meetingTimes[] (上课时间)
                └── instructors[] (教师信息)
```

---

## 1. Course（课程对象）

### 1.1 核心字段

| 字段名 | 类型 | 必需 | 说明 | 示例 |
|--------|------|------|------|------|
| `subject` | string | ✓ | 学科代码 | `"198"` (CS) |
| `courseNumber` | string | ✓ | 课程编号 | `"111"` |
| `title` | string | ✓ | 课程简称 | `"Intro to Computer Science"` |
| `expandedTitle` | string | | 课程全称 | `"Introduction to Computer Science"` |
| `courseDescription` | string | | 课程描述（长文本） | `"This course covers..."` |
| `credits` | string | | 学分（注意是字符串） | `"3"`, `"4"`, `"1.5-3"` |

**注意事项:**
- `subject` 通常是 3 位数字字符串，但也可能是字母（如 `"CS"`）
- `credits` 是字符串类型，可能包含范围（如 `"1-4"`）或小数（如 `"1.5"`）

### 1.2 先修要求与备注

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `preReqNotes` | string | 先修课程要求文本 | `"01:198:111 or equivalent"` |
| `subjectGroupNotes` | string | 学科组备注 | `""` (通常为空) |
| `subjectNotes` | array | 学科备注数组 | `[]` |

### 1.3 校区与开课单位

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `campusCode` | string | 校区代码 | `"NB"`, `"NK"`, `"CM"` |
| `offeringUnitCode` | string | 开课单位代码 | `"01"` |
| `offeringUnitTitle` | string | 开课单位名称 | `"School of Arts and Sciences"` |

### 1.4 核心要求 (Core Codes)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `coreCodes` | array | 满足的核心要求数组 |

**CoreCode 对象结构:**
```typescript
{
  code: string;          // 核心代码，如 "CCO", "WCr"
  description: string;   // 说明
  effective: string;     // 生效学期，如 "202109"
}
```

**示例:**
```json
{
  "coreCodes": [
    {
      "code": "CCO",
      "description": "Core Code",
      "effective": "202109"
    }
  ]
}
```

### 1.5 其他元数据

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `synopsisUrl` | string | 课程大纲链接 | `"http://www.cs.rutgers.edu/courses/details/01:198:111"` |
| `openSections` | number | 当前开放的班次数量 | `5` |
| `sections` | array | **班次数组（重要）** | 见下文 |

---

## 2. Section（班次对象）

### 2.1 核心字段

| 字段名 | 类型 | 必需 | 说明 | 示例 |
|--------|------|------|------|------|
| `index` | string | ✓ | **班次唯一标识符**（5位数字） | `"12345"` |
| `number` | string | ✓ | 班次编号 | `"01"`, `"H1"`, `"90"` |
| `openStatus` | boolean | ✓ | **是否开放**（用于空位监控） | `true`, `false` |
| `sectionData` | object | ✓ | 班次详细数据（见下文） | `{...}` |

**重要:**
- `index` 是班次的唯一 ID，用于订阅和通知
- `openStatus` 是核心字段，`true` 表示有空位，`false` 表示已满

### 2.2 交叉列表 (Cross-Listed Sections)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `crossListedSections` | array | 交叉列表的其他课程 |

**CrossListedSection 对象结构:**
```typescript
{
  subject: string;        // 学科代码
  courseNumber: string;   // 课程编号
  sectionNumber: string;  // 班次编号
}
```

**使用场景:**
- 某些课程同时列在多个学科下（如 CS/ECE 合开课）
- UI 需要聚合展示，避免重复

**示例:**
```json
{
  "crossListedSections": [
    {
      "subject": "540",
      "courseNumber": "314",
      "sectionNumber": "01"
    }
  ]
}
```

### 2.3 考试与权限

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `examCode` | string | 考试代码（决定期末考试时间） | `"A"`, `"B"`, `""` |
| `specialPermissionRequired` | boolean | 是否需要特殊许可 | `true`, `false` |

### 2.4 其他字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `comments` | array | 班次备注数组 |
| `printed` | string | 是否打印 |
| `sessionDatePrintIndicator` | string | 学期日期打印指示符 |
| `unitMajor` | string | 单位主修 |
| `sessionDates` | object | 学期日期信息 |

**SessionDates 对象结构:**
```typescript
{
  session: string;           // 学期编号
  sessionStartDate: string;  // 开始日期（格式：MM/DD/YYYY）
  sessionEndDate: string;    // 结束日期
}
```

---

## 3. SectionData（班次详细数据）

### 3.1 meetingTimes（上课时间）

**类型:** `array`

**MeetingTime 对象结构:**
```typescript
{
  meetingDay: string;      // 星期几：M, T, W, TH, F
  startTime: string;       // 开始时间（HH:MM 24小时制）
  endTime: string;         // 结束时间
  pmCode: string;          // AM/PM 标识：A, P
  campusAbbrev: string;    // 校区缩写
  buildingCode: string;    // 建筑代码
  roomNumber: string;      // 教室号
  campusName: string;      // 校区全名
  buildingName: string;    // 建筑全名
}
```

**重要说明:**
- `meetingDay` 使用缩写：
  - `M` = Monday
  - `T` = Tuesday
  - `W` = Wednesday
  - `TH` = Thursday
  - `F` = Friday
- `startTime`/`endTime` 是 24 小时制字符串（如 `"14:30"`）
- 一个班次可能有多个 `meetingTimes`（如周一/周四上课）

**示例:**
```json
{
  "meetingTimes": [
    {
      "meetingDay": "M",
      "startTime": "10:20",
      "endTime": "11:40",
      "pmCode": "A",
      "campusAbbrev": "CAC",
      "buildingCode": "ARC",
      "roomNumber": "103",
      "campusName": "College Avenue",
      "buildingName": "Arc Building"
    },
    {
      "meetingDay": "TH",
      "startTime": "10:20",
      "endTime": "11:40",
      "pmCode": "A",
      "campusAbbrev": "CAC",
      "buildingCode": "ARC",
      "roomNumber": "103",
      "campusName": "College Avenue",
      "buildingName": "Arc Building"
    }
  ]
}
```

### 3.2 instructors（教师信息）

**类型:** `array`

**Instructor 对象结构:**
```typescript
{
  name: string;  // 教师姓名（格式：LastName, FirstName）
}
```

**示例:**
```json
{
  "instructors": [
    {
      "name": "Smith, John"
    },
    {
      "name": "Doe, Jane"
    }
  ]
}
```

**注意事项:**
- 一个班次可能有多位教师（如讲座+实验）
- 部分班次可能没有教师信息（`[]` 空数组）

---

## 4. 完整示例

### 4.1 Course 对象完整示例

```json
{
  "subject": "198",
  "courseNumber": "111",
  "title": "Intro to Computer Science",
  "expandedTitle": "Introduction to Computer Science",
  "courseDescription": "An introduction to programming and problem solving...",
  "credits": "4",
  "preReqNotes": "",
  "campusCode": "NB",
  "synopsisUrl": "http://www.cs.rutgers.edu/courses/details/01:198:111",
  "coreCodes": [
    {
      "code": "CCO",
      "description": "Core Code",
      "effective": "202109"
    }
  ],
  "offeringUnitCode": "01",
  "offeringUnitTitle": "School of Arts and Sciences",
  "subjectGroupNotes": "",
  "subjectNotes": [],
  "openSections": 3,
  "sections": [
    {
      "number": "01",
      "index": "12345",
      "openStatus": true,
      "crossListedSections": [],
      "examCode": "A",
      "specialPermissionRequired": false,
      "comments": [],
      "printed": "Y",
      "sessionDatePrintIndicator": "Y",
      "unitMajor": "Computer Science",
      "sessionDates": {
        "session": "1",
        "sessionStartDate": "09/03/2025",
        "sessionEndDate": "12/20/2025"
      },
      "sectionData": {
        "meetingTimes": [
          {
            "meetingDay": "M",
            "startTime": "10:20",
            "endTime": "11:40",
            "pmCode": "A",
            "campusAbbrev": "CAC",
            "buildingCode": "ARC",
            "roomNumber": "103",
            "campusName": "College Avenue",
            "buildingName": "Arc Building"
          },
          {
            "meetingDay": "TH",
            "startTime": "10:20",
            "endTime": "11:40",
            "pmCode": "A",
            "campusAbbrev": "CAC",
            "buildingCode": "ARC",
            "roomNumber": "103",
            "campusName": "College Avenue",
            "buildingName": "Arc Building"
          }
        ],
        "instructors": [
          {
            "name": "Smith, John"
          }
        ]
      }
    }
  ]
}
```

---

## 5. TypeScript 类型定义

```typescript
// 课程对象
interface Course {
  subject: string;
  courseNumber: string;
  title: string;
  expandedTitle?: string;
  courseDescription?: string;
  credits?: string;
  preReqNotes?: string;
  campusCode: string;
  sections: Section[];
  synopsisUrl?: string;
  coreCodes?: CoreCode[];
  offeringUnitCode?: string;
  offeringUnitTitle?: string;
  subjectGroupNotes?: string;
  subjectNotes?: any[];
  openSections?: number;
}

// 核心要求
interface CoreCode {
  code: string;
  description: string;
  effective: string;
}

// 班次对象
interface Section {
  number: string;
  index: string;
  openStatus: boolean;
  sectionData: SectionData;
  crossListedSections?: CrossListedSection[];
  examCode?: string;
  specialPermissionRequired?: boolean;
  comments?: any[];
  printed?: string;
  sessionDatePrintIndicator?: string;
  unitMajor?: string;
  sessionDates?: SessionDates;
}

// 交叉列表
interface CrossListedSection {
  subject: string;
  courseNumber: string;
  sectionNumber: string;
}

// 学期日期
interface SessionDates {
  session: string;
  sessionStartDate: string;
  sessionEndDate: string;
}

// 班次详细数据
interface SectionData {
  meetingTimes: MeetingTime[];
  instructors: Instructor[];
}

// 上课时间
interface MeetingTime {
  meetingDay: string;        // M, T, W, TH, F
  startTime: string;         // HH:MM
  endTime: string;           // HH:MM
  pmCode: string;            // A, P
  campusAbbrev: string;
  buildingCode: string;
  roomNumber: string;
  campusName: string;
  buildingName: string;
}

// 教师
interface Instructor {
  name: string;
}
```

---

## 6. 筛选与查询建议

### 6.1 核心字段索引

以下字段应建立索引以提升筛选性能：

| 字段 | 用途 | 索引类型 |
|------|------|----------|
| `subject` | 按院系筛选 | Hash |
| `courseNumber` | 按课程号筛选 | Hash |
| `index` | 班次唯一查找 | Primary Key |
| `openStatus` | 空位过滤 | Boolean |
| `credits` | 按学分筛选 | Range |
| `meetingDay` | 按星期筛选 | Multi-value |

### 6.2 常见查询模式

#### 查询 1: 查找所有开放的 CS 课程
```typescript
courses
  .filter(c => c.subject === '198')
  .flatMap(c => c.sections)
  .filter(s => s.openStatus === true)
```

#### 查询 2: 查找周一有课的所有班次
```typescript
courses
  .flatMap(c => c.sections)
  .filter(s =>
    s.sectionData.meetingTimes.some(mt => mt.meetingDay === 'M')
  )
```

#### 查询 3: 查找 3 学分的课程
```typescript
courses.filter(c => c.credits === '3')
```

#### 查询 4: 查找交叉列表课程
```typescript
courses.filter(c =>
  c.sections.some(s => s.crossListedSections && s.crossListedSections.length > 0)
)
```

---

## 7. 数据质量注意事项

### 7.1 可能为空的字段

以下字段可能为空或缺失，需要防御性编程：

- `expandedTitle`
- `courseDescription`
- `credits`（可能为空字符串）
- `preReqNotes`
- `examCode`
- `instructors`（可能是空数组）
- `crossListedSections`（可能是空数组）

### 7.2 数据异常情况

| 情况 | 说明 | 处理建议 |
|------|------|----------|
| `credits` 为空 | 某些课程无学分信息 | 显示为 "TBA" |
| `meetingTimes` 为空 | 在线课程或待定 | 显示为 "Online/TBA" |
| `instructors` 为空 | 教师未分配 | 显示为 "Staff" |
| `openStatus` 变化频繁 | 实时状态 | 定期轮询更新 |

### 7.3 时间解析注意事项

- `startTime`/`endTime` 是字符串，需要解析为 Date 对象
- 注意 `pmCode` 可能与时间不一致（历史遗留）
- 跨午夜的课程（如 23:00-01:00）需要特殊处理

**时间解析示例:**
```typescript
function parseTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}
```

---

## 8. 数据更新与同步

### 8.1 更新频率

| 数据类型 | 更新频率 | 说明 |
|----------|----------|------|
| 课程基本信息 | 每学期 | 标题、描述、学分等 |
| 班次信息 | 每日 | 新增/删除班次 |
| `openStatus` | 实时 | 每 2-5 分钟变化 |

### 8.2 增量更新策略

1. **全量更新:** 每日凌晨 2:00 抓取 `courses.gzip`
2. **状态更新:** 每 2-5 分钟抓取 `openSections.gzip`
3. **差异对比:** 仅更新变化的班次，减少写入

---

## 9. 参考资源

- [端点文档](./soc-endpoints.md)
- [探针脚本](../scripts/soc-probe.ts)
- [样本数据](../data/samples/nb-cs.json)
- [字段样本](../data/samples/field-samples.json)

---

**更新日志:**
- 2025-11-12: 初始版本（基于 223 条样本数据分析）
