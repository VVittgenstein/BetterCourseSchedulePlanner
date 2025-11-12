# Rutgers SOC JSON 字段说明文档

本文档详细说明 Rutgers Schedule of Classes (SOC) JSON API 返回数据中的各个字段含义。

## 数据层级结构

```
Root Array
└── Subject Object
    └── courses Array
        └── Course Object
            └── sections Array
                └── Section Object
                    ├── instructors Array
                    ├── meetingTimes Array
                    └── crossListedSections Array
```

## Subject（学科）级别字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `subject` | String | 学科代码，通常包含学院和专业代码 | `"01:198"` (Computer Science) |
| `subjectDescription` | String | 学科完整名称 | `"Computer Science"` |
| `subjectNotes` | String | 学科相关的注释或说明 | `""` (可能为空) |
| `courses` | Array | 该学科下的所有课程数组 | `[...]` |

### Subject 代码说明

Subject 代码格式通常为 `学院代码:专业代码`，例如：
- `01:198` - School of Arts and Sciences: Computer Science
- `14:332` - School of Arts and Sciences: Cognitive Science
- `33:136` - School of Communication and Information: Information Technology

## Course（课程）级别字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `courseNumber` | String | 课程编号 | `"111"`, `"344"` |
| `subject` | String | 所属学科代码 | `"01:198"` |
| `courseString` | String | 完整的课程标识符 | `"01:198:111"` |
| `campusCode` | String | 校区代码 | `"NB"` (New Brunswick) |
| `title` | String | 课程标题 | `"Introduction to Computer Science"` |
| `credits` | String | 学分数（可能是范围） | `"4"`, `"3-4"` |
| `preReqNotes` | String | 先修课程要求说明 | `"Prerequisite: 01:198:111"` |
| `courseDescription` | String | 课程描述 | `"This course covers..."` |
| `sections` | Array | 该课程的所有课节（section）数组 | `[...]` |

### Course Number 说明

课程编号通常遵循以下规则：
- `0xx` - 100 以下：预备课程或入门课程
- `1xx` - 100-199：基础课程
- `2xx` - 200-299：中级课程
- `3xx` - 300-399：高级本科课程
- `4xx` - 400-499：高级本科/研究生课程
- `5xx` 及以上：研究生课程

## Section（课节）级别字段

### 基本信息字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `number` | String | 课节编号 | `"01"`, `"H1"` (H 表示荣誉课程) |
| `index` | String | **课节注册索引号**（唯一标识符，用于选课） | `"10000"`, `"12345"` |
| `sectionNotes` | String | 课节特别说明或注释 | `"This section is for honors students only"` |
| `examCode` | String | 考试代码，用于安排期末考试时间 | `"A"`, `"B"`, `"N"` (N=无考试) |
| `sessionDatePrintIndicator` | String | 是否打印课程日期的指示符 | `"Y"`, `"N"` |
| `subtopic` | String | 子主题（某些课程有多个主题） | `"Machine Learning"` |
| `subtopicNotes` | String | 子主题说明 | `""` |
| `printed` | String | 是否在印刷版课表中显示 | `"Y"`, `"N"` |
| `sessionDates` | String | 特殊的课程日期范围（如果与学期不同） | `"06/01-07/15"` |

### Index（注册索引号）

**重要性**: `index` 是最关键的字段之一！

- **唯一性**: 每个 section 都有唯一的 index 号
- **用途**: 学生选课时使用这个号码进行注册
- **格式**: 通常是 5 位数字字符串
- **示例**: `"10000"`, `"12345"`, `"67890"`

在 Rutgers 选课系统中，学生输入这个 index 号来注册特定的课节。

### 状态相关字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `openStatus` | Boolean | **课程是否有空位**（开放状态） | `true`, `false` |
| `openStatusText` | String | 开放状态的文本描述 | `"Open"`, `"Closed"`, `"OPEN"`, `"CLOSED"` |

### Status（状态）说明

- **`openStatus: true` / `"Open"`**: 课程有空位，可以注册
- **`openStatus: false` / `"Closed"`**: 课程已满，无法注册（可能需要加入 waitlist）

某些情况下还可能有其他状态：
- `"Wait List"`: 有等待列表
- `"Permission Required"`: 需要教授或系主任批准

### 教师信息字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `instructorsText` | String | 教师姓名的文本形式（可能包含多个教师） | `"Tarjan, Robert"`, `"TBA"` (待定) |
| `instructors` | Array | 教师信息对象数组 | `[{"name": "Tarjan, Robert"}]` |

**Instructors 数组对象结构**:
```json
{
  "name": "Tarjan, Robert"
}
```

**注意**: 如果教师尚未确定，可能显示为 `"TBA"` (To Be Announced)。

### 上课时间和地点（meetingTimes）

`meetingTimes` 是一个数组，因为一门课可能有多个上课时间（如 lecture + recitation）。

**meetingTimes 数组对象字段**:

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `meetingDay` | String | **上课日期**（星期几） | `"M"`, `"TH"`, `"MTH"`, `"TF"` |
| `startTime` | String | 开始时间（4 位数字，HHMM 格式） | `"0940"` (9:40 AM), `"0200"` (2:00 PM) |
| `endTime` | String | 结束时间（4 位数字，HHMM 格式） | `"1100"` (11:00 AM), `"0320"` (3:20 PM) |
| `pmCode` | String | 上午/下午标识 | `"A"` (AM), `"P"` (PM) |
| `meetingModeCode` | String | 上课模式代码 | `"02"` (Lecture), `"30"` (Recitation) |
| `meetingModeDesc` | String | 上课模式描述 | `"LECTURE"`, `"RECITATION"`, `"LAB"` |
| `buildingCode` | String | 建筑代码 | `"HLL"`, `"ARC"`, `"SEC"` |
| `roomNumber` | String | 教室号码 | `"114"`, `"205"` |
| `campusAbbrev` | String | 校区缩写（全大写） | `"BUSCH"`, `"COLLEGE AVENUE"` |
| `campusName` | String | 校区全名 | `"Busch"`, `"College Avenue"` |

#### meetingDay（星期几）代码

| 代码 | 含义 |
|------|------|
| `M` | Monday（星期一） |
| `T` | Tuesday（星期二） |
| `W` | Wednesday（星期三） |
| `TH` | Thursday（星期四） |
| `F` | Friday（星期五） |
| `S` | Saturday（星期六） |
| `MTH` | Monday and Thursday |
| `TF` | Tuesday and Friday |
| `MW` | Monday and Wednesday |
| `WF` | Wednesday and Friday |

#### meetingModeCode（上课模式）

| 代码 | 描述 |
|------|------|
| `02` | LECTURE（讲座） |
| `30` | RECITATION（习题课/讨论课） |
| `03` | LABORATORY（实验课） |
| `05` | SEMINAR（研讨会） |
| `11` | INDEPENDENT STUDY（独立研究） |
| `90` | ONLINE（在线课程） |

#### 建筑代码示例

常见的 Rutgers New Brunswick 建筑代码：

| 代码 | 建筑名称 | 校区 |
|------|----------|------|
| `HLL` | Hill Center | Busch |
| `ARC` | Allison Road Classroom | Busch |
| `SEC` | Science and Engineering Center | Busch |
| `BE` | Beck Hall | College Avenue |
| `TIL` | Tillett Hall | Livingston |
| `AB` | Academic Building | College Avenue |

#### 时间格式说明

- **startTime/endTime**: 使用 24 小时制的 4 位数字
  - `"0940"` = 9:40 AM
  - `"1140"` = 11:40 AM
  - `"0200"` = 2:00 PM (14:00)
  - `"0630"` = 6:30 PM (18:30)

- **pmCode**: 辅助标识上午/下午
  - `"A"` = AM（上午）
  - `"P"` = PM（下午）

### 交叉列出课程（crossListedSections）

**crossListedSections** 是一个数组，包含与当前课节交叉列出的其他课程。

交叉列出意味着同一门课在多个学科下列出，学生可以选择任一学科的编号注册，但上的是同一个班。

**crossListedSections 数组对象字段**:

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `sectionIndex` | String | 交叉列出课节的 index | `"15000"` |
| `courseString` | String | 交叉列出课程的完整标识符 | `"14:332:440"` |
| `subject` | String | 交叉列出课程的学科代码 | `"14:332"` |
| `subjectDescription` | String | 交叉列出课程的学科名称 | `"Cognitive Science"` |
| `courseNumber` | String | 课程编号 | `"440"` |
| `sectionNumber` | String | 课节编号 | `"01"` |

#### crossListedSections 使用场景示例

例如，"Introduction to Artificial Intelligence" 可能同时列在：
- `01:198:440` (Computer Science)
- `14:332:440` (Cognitive Science)

两个编号的学生上同一个班，由同一位教师授课，在同一时间和地点。

### 其他数组字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `unitMajors` | Array | 限定专业（如果该课程仅对特定专业开放） | `["COMP", "MATH"]` |

## 完整示例

以下是一个完整的 section 对象示例：

```json
{
  "number": "01",
  "sectionNotes": "",
  "instructorsText": "Tarjan, Robert",
  "instructors": [
    {
      "name": "Tarjan, Robert"
    }
  ],
  "openStatus": true,
  "openStatusText": "Open",
  "index": "12345",
  "examCode": "A",
  "sessionDatePrintIndicator": "Y",
  "subtopic": "",
  "subtopicNotes": "",
  "printed": "Y",
  "sessionDates": "",
  "unitMajors": [],
  "crossListedSections": [
    {
      "sectionIndex": "17345",
      "courseString": "14:332:440",
      "subject": "14:332",
      "subjectDescription": "Cognitive Science",
      "courseNumber": "440",
      "sectionNumber": "01"
    }
  ],
  "meetingTimes": [
    {
      "meetingDay": "MTH",
      "startTime": "0940",
      "endTime": "1100",
      "pmCode": "A",
      "meetingModeCode": "02",
      "meetingModeDesc": "LECTURE",
      "buildingCode": "HLL",
      "roomNumber": "114",
      "campusAbbrev": "BUSCH",
      "campusName": "Busch"
    }
  ]
}
```

## 关键字段总结

以下是选课系统最重要的字段：

1. **index**: 课节唯一标识符，用于选课注册
2. **openStatus**: 课程是否有空位
3. **meetingTimes**: 上课时间和地点信息
   - meetingDay: 星期几
   - startTime/endTime: 开始和结束时间
   - buildingCode/roomNumber: 建筑和教室
4. **instructors**: 教师信息
5. **crossListedSections**: 交叉列出的课程信息

## 数据文件位置

样本数据文件: `data/samples/nb-cs.json`

该文件包含 2025 年秋季学期 New Brunswick 校区 Computer Science 专业的 **213 个课节** 数据，涵盖 25 门不同的课程。

## 相关文档

- [API 端点文档](./soc-endpoints.md) - 了解如何调用 API
- [样本数据](../data/samples/nb-cs.json) - 查看完整的样本数据

## 更新日期

本文档最后更新: 2025-11-12
