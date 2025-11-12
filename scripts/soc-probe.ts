#!/usr/bin/env node
/**
 * Rutgers SOC API 探针脚本
 *
 * 功能：
 * 1. 测试多种 API 端点的可用性
 * 2. 收集性能指标（响应时间、成功率）
 * 3. 抓取 NB 本科课程样本数据（≥200条）
 * 4. 分析字段结构并生成文档
 *
 * 使用方法：
 *   npm run probe              # 执行探测并保存数据
 *   npm run probe:report       # 生成详细报告
 */

import * as fs from 'fs';
import * as path from 'path';
import { gunzipSync } from 'zlib';

// ============ 类型定义 ============

interface EndpointTest {
  name: string;
  url: string;
  description: string;
  params?: Record<string, string | number>;
}

interface TestResult {
  endpoint: string;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  dataSize?: number;
  recordCount?: number;
  timestamp: string;
}

interface PerformanceMetrics {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  successRate: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
}

interface CourseSection {
  index: string;
  number: string;
  sectionData?: any;
  meetingTimes?: any[];
  instructors?: any[];
  [key: string]: any;
}

interface CourseListing {
  courseNumber: string;
  subject: string;
  title: string;
  sections?: CourseSection[];
  credits?: number;
  [key: string]: any;
}

// ============ 配置 ============

const BASE_URL_NEW = 'https://sis.rutgers.edu/soc/api';
const BASE_URL_OLD = 'http://sis.rutgers.edu/oldsoc';

// 当前学期参数 (2025 Fall)
const CURRENT_TERM = {
  year: 2025,
  term: 9,  // 9 = Fall, 1 = Spring, 7 = Summer
  campus: 'NB',
  level: 'U'
};

// 测试的院系列表（Computer Science 等）
const TEST_SUBJECTS = [
  { code: '198', name: 'Computer Science' },
  { code: '640', name: 'Mathematics' },
  { code: '540', name: 'Electrical & Computer Engineering' }
];

// 学期代码映射（老API格式：{term}{year}，如 92025 = Fall 2025）
const SEMESTER_CODE = `${CURRENT_TERM.term}${CURRENT_TERM.year}`;

// ============ 端点定义 ============

const ENDPOINTS: EndpointTest[] = [
  {
    name: 'courses.gzip (全校区课程)',
    url: `${BASE_URL_NEW}/courses.gzip`,
    description: '获取指定校区和学期的所有课程数据（gzip 压缩）',
    params: {
      year: CURRENT_TERM.year,
      term: CURRENT_TERM.term,
      campus: CURRENT_TERM.campus
    }
  },
  {
    name: 'openSections.gzip (开放班次)',
    url: `${BASE_URL_NEW}/openSections.gzip`,
    description: '仅获取状态为 Open 的班次',
    params: {
      year: CURRENT_TERM.year,
      term: CURRENT_TERM.term,
      campus: CURRENT_TERM.campus
    }
  },
  {
    name: 'courses.json (老API按科目)',
    url: `${BASE_URL_OLD}/courses.json`,
    description: '老版 API，按科目查询课程',
    params: {
      subject: '198',
      semester: SEMESTER_CODE,
      campus: CURRENT_TERM.campus,
      level: CURRENT_TERM.level
    }
  }
];

// ============ 工具函数 ============

/**
 * 构建完整的请求 URL
 */
function buildUrl(endpoint: EndpointTest): string {
  if (!endpoint.params) return endpoint.url;
  const params = new URLSearchParams(
    Object.entries(endpoint.params).map(([k, v]) => [k, String(v)])
  );
  return `${endpoint.url}?${params}`;
}

/**
 * 测试单个端点
 */
async function testEndpoint(endpoint: EndpointTest): Promise<TestResult> {
  const url = buildUrl(endpoint);
  const startTime = Date.now();

  console.log(`\n测试: ${endpoint.name}`);
  console.log(`URL: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BetterCourseSchedulePlanner/0.1 (Research/Educational)',
        'Accept': 'application/json, application/gzip'
      }
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      console.log(`❌ HTTP ${response.status} ${response.statusText}`);
      return {
        endpoint: endpoint.name,
        success: false,
        responseTime,
        statusCode: response.status,
        error: `HTTP ${response.status}: ${response.statusText}`,
        timestamp: new Date().toISOString()
      };
    }

    // 处理响应数据
    const buffer = await response.arrayBuffer();
    let data: any;
    let dataSize = buffer.byteLength;

    // 如果是 gzip，解压
    if (url.includes('.gzip')) {
      const decompressed = gunzipSync(Buffer.from(buffer));
      data = JSON.parse(decompressed.toString('utf-8'));
      console.log(`✓ 解压成功: ${(buffer.byteLength / 1024).toFixed(2)} KB → ${(decompressed.length / 1024).toFixed(2)} KB`);
    } else {
      data = JSON.parse(Buffer.from(buffer).toString('utf-8'));
    }

    // 统计记录数
    let recordCount = 0;
    if (Array.isArray(data)) {
      recordCount = data.length;
      // 如果是课程列表，统计所有 sections
      recordCount = data.reduce((sum, course) => {
        return sum + (course.sections?.length || 0);
      }, 0);
    } else if (data && typeof data === 'object') {
      recordCount = Object.keys(data).length;
    }

    console.log(`✓ 成功 | 耗时: ${responseTime}ms | 数据: ${(dataSize / 1024).toFixed(2)} KB | 记录: ${recordCount} 条`);

    return {
      endpoint: endpoint.name,
      success: true,
      responseTime,
      statusCode: response.status,
      dataSize,
      recordCount,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    console.log(`❌ 错误: ${error.message}`);

    return {
      endpoint: endpoint.name,
      success: false,
      responseTime,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * 抓取课程样本数据
 */
async function fetchCourseSamples(): Promise<{ data: any; metadata: any }> {
  console.log('\n\n========== 抓取课程样本数据 ==========\n');

  // 使用新 API 获取全量数据
  const url = buildUrl(ENDPOINTS[0]);
  console.log(`抓取 URL: ${url}`);

  const startTime = Date.now();
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'BetterCourseSchedulePlanner/0.1 (Research/Educational)',
      'Accept': 'application/gzip'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  const decompressed = gunzipSync(Buffer.from(buffer));
  const allCourses = JSON.parse(decompressed.toString('utf-8'));

  const fetchTime = Date.now() - startTime;

  console.log(`✓ 抓取完成: ${allCourses.length} 门课程，耗时 ${fetchTime}ms`);

  // 提取 Computer Science (198) 课程
  const csCourses = allCourses.filter((course: any) =>
    course.subject === '198' || course.subject === 'CS'
  );

  console.log(`\n筛选结果:`);
  console.log(`- Computer Science 课程: ${csCourses.length} 门`);

  // 统计总 sections 数
  const totalSections = csCourses.reduce((sum: number, course: any) =>
    sum + (course.sections?.length || 0), 0
  );

  console.log(`- 总班次 (sections): ${totalSections} 个`);

  if (totalSections < 200) {
    console.log(`\n⚠️  警告: CS 课程班次数不足 200 条，扩展到其他院系...`);

    // 添加 Math 和 ECE 课程
    const mathCourses = allCourses.filter((course: any) =>
      course.subject === '640' || course.subject === 'MATH'
    );
    const eceCourses = allCourses.filter((course: any) =>
      course.subject === '540' || course.subject === 'ECE'
    );

    const extendedCourses = [...csCourses, ...mathCourses.slice(0, 10), ...eceCourses.slice(0, 5)];
    const extendedSections = extendedCourses.reduce((sum: number, course: any) =>
      sum + (course.sections?.length || 0), 0
    );

    console.log(`- 扩展后总课程: ${extendedCourses.length} 门`);
    console.log(`- 扩展后总班次: ${extendedSections} 个`);

    return {
      data: extendedCourses,
      metadata: {
        source: 'Rutgers SOC API (courses.gzip)',
        campus: CURRENT_TERM.campus,
        term: CURRENT_TERM.term,
        year: CURRENT_TERM.year,
        fetchedAt: new Date().toISOString(),
        fetchTimeMs: fetchTime,
        totalCourses: extendedCourses.length,
        totalSections: extendedSections,
        subjects: ['198 (CS)', '640 (MATH)', '540 (ECE)']
      }
    };
  }

  return {
    data: csCourses,
    metadata: {
      source: 'Rutgers SOC API (courses.gzip)',
      campus: CURRENT_TERM.campus,
      term: CURRENT_TERM.term,
      year: CURRENT_TERM.year,
      fetchedAt: new Date().toISOString(),
      fetchTimeMs: fetchTime,
      totalCourses: csCourses.length,
      totalSections: totalSections,
      subjects: ['198 (CS)']
    }
  };
}

/**
 * 分析字段结构
 */
function analyzeFieldStructure(courses: any[]): any {
  if (!courses || courses.length === 0) {
    return { error: 'No data to analyze' };
  }

  console.log('\n\n========== 分析字段结构 ==========\n');

  const sampleCourse = courses[0];
  const sampleSection = sampleCourse.sections?.[0];

  // 课程级别字段
  const courseFields = Object.keys(sampleCourse).map(key => ({
    field: key,
    type: typeof sampleCourse[key],
    sample: Array.isArray(sampleCourse[key])
      ? `[Array(${sampleCourse[key].length})]`
      : sampleCourse[key]
  }));

  // 班次级别字段
  const sectionFields = sampleSection
    ? Object.keys(sampleSection).map(key => ({
        field: key,
        type: typeof sampleSection[key],
        sample: Array.isArray(sampleSection[key])
          ? `[Array(${sampleSection[key].length})]`
          : sampleSection[key]
      }))
    : [];

  console.log('课程 (Course) 字段:');
  courseFields.forEach(f => {
    console.log(`  - ${f.field} (${f.type}): ${JSON.stringify(f.sample)?.slice(0, 50)}${JSON.stringify(f.sample)?.length > 50 ? '...' : ''}`);
  });

  console.log('\n班次 (Section) 字段:');
  sectionFields.forEach(f => {
    console.log(`  - ${f.field} (${f.type}): ${JSON.stringify(f.sample)?.slice(0, 50)}${JSON.stringify(f.sample)?.length > 50 ? '...' : ''}`);
  });

  return {
    courseFields,
    sectionFields,
    sampleCourse,
    sampleSection
  };
}

/**
 * 计算性能指标
 */
function calculateMetrics(results: TestResult[]): PerformanceMetrics {
  const successful = results.filter(r => r.success);
  const responseTimes = successful.map(r => r.responseTime);

  return {
    totalTests: results.length,
    successfulTests: successful.length,
    failedTests: results.filter(r => !r.success).length,
    successRate: (successful.length / results.length) * 100,
    avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0,
    minResponseTime: Math.min(...responseTimes) || 0,
    maxResponseTime: Math.max(...responseTimes) || 0
  };
}

/**
 * 保存结果到文件
 */
function saveResults(filename: string, data: any): void {
  const dataDir = path.join(process.cwd(), 'data', 'samples');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const filepath = path.join(dataDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`\n✓ 已保存: ${filepath}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('   Rutgers SOC API 探针脚本');
  console.log('========================================');
  console.log(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`目标校区: ${CURRENT_TERM.campus} (New Brunswick)`);
  console.log(`目标学期: ${CURRENT_TERM.year} Fall (term=${CURRENT_TERM.term})`);

  // ============ 阶段 1: 测试端点 ============
  console.log('\n\n========== 阶段 1: 测试端点 ==========');

  const testResults: TestResult[] = [];

  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    testResults.push(result);

    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // ============ 阶段 2: 抓取样本数据 ============
  const { data: courseSamples, metadata } = await fetchCourseSamples();

  // ============ 阶段 3: 分析字段 ============
  const fieldAnalysis = analyzeFieldStructure(courseSamples);

  // ============ 阶段 4: 计算指标 ============
  console.log('\n\n========== 性能指标汇总 ==========\n');
  const metrics = calculateMetrics(testResults);

  console.log(`总测试数:   ${metrics.totalTests}`);
  console.log(`成功:       ${metrics.successfulTests}`);
  console.log(`失败:       ${metrics.failedTests}`);
  console.log(`成功率:     ${metrics.successRate.toFixed(2)}%`);
  console.log(`平均响应:   ${metrics.avgResponseTime.toFixed(2)}ms`);
  console.log(`最快响应:   ${metrics.minResponseTime}ms`);
  console.log(`最慢响应:   ${metrics.maxResponseTime}ms`);

  // ============ 阶段 5: 保存结果 ============
  console.log('\n\n========== 保存结果 ==========');

  // 保存课程样本
  saveResults('nb-cs.json', {
    metadata,
    courses: courseSamples
  });

  // 保存测试报告
  saveResults('probe-report.json', {
    timestamp: new Date().toISOString(),
    testResults,
    metrics,
    fieldAnalysis: {
      courseFields: fieldAnalysis.courseFields,
      sectionFields: fieldAnalysis.sectionFields
    },
    endpoints: ENDPOINTS.map(e => ({
      name: e.name,
      url: buildUrl(e),
      description: e.description
    }))
  });

  // 保存字段分析样本
  if (fieldAnalysis.sampleCourse) {
    saveResults('field-samples.json', {
      sampleCourse: fieldAnalysis.sampleCourse,
      sampleSection: fieldAnalysis.sampleSection,
      analysis: {
        courseFieldCount: fieldAnalysis.courseFields?.length || 0,
        sectionFieldCount: fieldAnalysis.sectionFields?.length || 0
      }
    });
  }

  console.log('\n========================================');
  console.log('   探测完成！');
  console.log('========================================\n');

  // 输出结果摘要
  console.log('📊 数据摘要:');
  console.log(`   - 课程数量: ${metadata.totalCourses}`);
  console.log(`   - 班次数量: ${metadata.totalSections}`);
  console.log(`   - 数据文件: data/samples/nb-cs.json`);
  console.log(`   - 测试报告: data/samples/probe-report.json`);
  console.log(`   - 字段样本: data/samples/field-samples.json`);

  if (metadata.totalSections >= 200) {
    console.log('\n✅ 验收标准: 已满足 ≥200 条记录要求');
  } else {
    console.log(`\n⚠️  验收标准: 当前 ${metadata.totalSections} 条，未达到 200 条要求`);
  }
}

// 执行主函数
main().catch(error => {
  console.error('\n❌ 致命错误:', error);
  process.exit(1);
});
