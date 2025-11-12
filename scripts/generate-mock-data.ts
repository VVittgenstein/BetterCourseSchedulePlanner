#!/usr/bin/env node
/**
 * 生成模拟课程数据
 * 用于演示数据结构和字段分析（在网络不可用时）
 */

import * as fs from 'fs';
import * as path from 'path';

// 基于 Rutgers SOC API 的真实数据结构
function generateMockCourses(count: number = 30) {
  const subjects = [
    { code: '198', name: 'Computer Science' },
    { code: '640', name: 'Mathematics' },
    { code: '540', name: 'Electrical & Computer Engineering' }
  ];

  const courses = [];
  let indexCounter = 10000;

  for (let i = 0; i < count; i++) {
    const subject = subjects[i % subjects.length];
    const courseNum = 100 + (i * 10);

    // 每门课 3-10 个 sections
    const sectionCount = 3 + Math.floor(Math.random() * 8);
    const sections = [];

    for (let j = 0; j < sectionCount; j++) {
      const sectionNum = String(j + 1).padStart(2, '0');

      sections.push({
        number: sectionNum,
        index: String(indexCounter++),
        sectionData: {
          meetingTimes: [
            {
              meetingDay: 'M',
              startTime: '10:20',
              endTime: '11:40',
              pmCode: 'A',
              campusAbbrev: 'CAC',
              buildingCode: 'ARC',
              roomNumber: '103',
              campusName: 'College Avenue',
              buildingName: 'Arc Building'
            },
            {
              meetingDay: 'TH',
              startTime: '10:20',
              endTime: '11:40',
              pmCode: 'A',
              campusAbbrev: 'CAC',
              buildingCode: 'ARC',
              roomNumber: '103',
              campusName: 'College Avenue',
              buildingName: 'Arc Building'
            }
          ],
          instructors: [
            {
              name: 'Smith, John'
            }
          ]
        },
        openStatus: Math.random() > 0.5,
        crossListedSections: j === 0 && Math.random() > 0.7 ? [
          {
            subject: '540',
            courseNumber: String(courseNum),
            sectionNumber: sectionNum
          }
        ] : [],
        examCode: Math.random() > 0.5 ? 'A' : '',
        specialPermissionRequired: Math.random() > 0.8,
        comments: [],
        printed: 'Y',
        sessionDatePrintIndicator: 'Y',
        unitMajor: subject.name,
        sessionDates: {
          session: '1',
          sessionStartDate: '09/03/2025',
          sessionEndDate: '12/20/2025'
        }
      });
    }

    courses.push({
      subject: subject.code,
      courseNumber: String(courseNum),
      title: `${subject.name} ${courseNum}`,
      expandedTitle: `Introduction to ${subject.name} ${courseNum}`,
      courseDescription: `This course covers fundamental concepts in ${subject.name.toLowerCase()}, including theoretical foundations and practical applications.`,
      credits: Math.random() > 0.5 ? '3' : '4',
      preReqNotes: i % 3 === 0 ? '01:198:111 or equivalent' : '',
      campusCode: 'NB',
      sections: sections,
      synopsisUrl: `http://www.cs.rutgers.edu/courses/details/${subject.code}:${courseNum}`,
      coreCodes: i % 4 === 0 ? [
        {
          code: 'CCO',
          description: 'Core Code',
          effective: '202109'
        }
      ] : [],
      offeringUnitCode: '01',
      offeringUnitTitle: 'School of Arts and Sciences',
      subjectGroupNotes: '',
      subjectNotes: [],
      openSections: sections.filter(s => s.openStatus).length
    });
  }

  return courses;
}

function main() {
  console.log('生成模拟课程数据...\n');

  const courses = generateMockCourses(35);
  const totalSections = courses.reduce((sum, c) => sum + c.sections.length, 0);

  console.log(`✓ 生成了 ${courses.length} 门课程`);
  console.log(`✓ 总计 ${totalSections} 个班次`);

  const metadata = {
    source: 'Mock Data (Generated for Testing)',
    campus: 'NB',
    term: 9,
    year: 2025,
    generatedAt: new Date().toISOString(),
    totalCourses: courses.length,
    totalSections: totalSections,
    subjects: ['198 (CS)', '640 (MATH)', '540 (ECE)'],
    note: 'This is mock data generated for demonstration purposes due to network limitations.'
  };

  const output = {
    metadata,
    courses
  };

  // 保存到文件
  const dataDir = path.join(process.cwd(), 'data', 'samples');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filepath = path.join(dataDir, 'nb-cs.json');
  fs.writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n✓ 已保存: ${filepath}`);
  console.log('\n数据结构预览:');
  console.log('- metadata: 元数据信息');
  console.log('- courses[]: 课程数组');
  console.log('  - subject: 学科代码');
  console.log('  - courseNumber: 课程编号');
  console.log('  - title: 课程标题');
  console.log('  - sections[]: 班次数组');
  console.log('    - index: 班次索引号');
  console.log('    - openStatus: 是否开放');
  console.log('    - sectionData.meetingTimes[]: 上课时间');
  console.log('    - sectionData.instructors[]: 教师');
  console.log('    - crossListedSections[]: 交叉列表');

  // 生成字段分析
  const sampleCourse = courses[0];
  const sampleSection = sampleCourse.sections[0];

  const fieldAnalysis = {
    timestamp: new Date().toISOString(),
    courseFields: Object.keys(sampleCourse).map(key => ({
      field: key,
      type: typeof sampleCourse[key],
      isArray: Array.isArray(sampleCourse[key])
    })),
    sectionFields: Object.keys(sampleSection).map(key => ({
      field: key,
      type: typeof sampleSection[key],
      isArray: Array.isArray(sampleSection[key])
    })),
    sampleCourse,
    sampleSection
  };

  const fieldPath = path.join(dataDir, 'field-samples.json');
  fs.writeFileSync(fieldPath, JSON.stringify(fieldAnalysis, null, 2), 'utf-8');
  console.log(`✓ 已保存字段分析: ${fieldPath}`);

  // 生成探测报告
  const probeReport = {
    timestamp: new Date().toISOString(),
    environment: 'Mock/Offline',
    note: 'Network access unavailable. This report simulates expected results from actual API testing.',
    testResults: [
      {
        endpoint: 'courses.gzip (全校区课程)',
        success: true,
        responseTime: 1250,
        statusCode: 200,
        dataSize: 524288,
        recordCount: totalSections,
        timestamp: new Date().toISOString(),
        note: '(Simulated) 实际环境下应能获取完整课程数据'
      },
      {
        endpoint: 'openSections.gzip (开放班次)',
        success: true,
        responseTime: 856,
        statusCode: 200,
        dataSize: 131072,
        recordCount: Math.floor(totalSections * 0.6),
        timestamp: new Date().toISOString(),
        note: '(Simulated) 仅返回状态为 Open 的班次，数据量更小'
      },
      {
        endpoint: 'courses.json (老API按科目)',
        success: true,
        responseTime: 1820,
        statusCode: 200,
        dataSize: 65536,
        recordCount: Math.floor(totalSections / 3),
        timestamp: new Date().toISOString(),
        note: '(Simulated) 按科目查询，返回单个院系数据'
      }
    ],
    metrics: {
      totalTests: 3,
      successfulTests: 3,
      failedTests: 0,
      successRate: 100,
      avgResponseTime: 1308.67,
      minResponseTime: 856,
      maxResponseTime: 1820
    },
    endpoints: [
      {
        name: 'courses.gzip (全校区课程)',
        url: 'https://sis.rutgers.edu/soc/api/courses.gzip?year=2025&term=9&campus=NB',
        description: '获取指定校区和学期的所有课程数据（gzip 压缩）'
      },
      {
        name: 'openSections.gzip (开放班次)',
        url: 'https://sis.rutgers.edu/soc/api/openSections.gzip?year=2025&term=9&campus=NB',
        description: '仅获取状态为 Open 的班次'
      },
      {
        name: 'courses.json (老API按科目)',
        url: 'http://sis.rutgers.edu/oldsoc/courses.json?subject=198&semester=92025&campus=NB&level=U',
        description: '老版 API，按科目查询课程'
      }
    ]
  };

  const reportPath = path.join(dataDir, 'probe-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(probeReport, null, 2), 'utf-8');
  console.log(`✓ 已保存探测报告: ${reportPath}`);

  console.log('\n✅ 完成！');
}

main();
