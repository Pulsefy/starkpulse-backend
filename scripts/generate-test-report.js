#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Test Summary Report Generator
 * Generates comprehensive test reports and summaries for the StarkPulse backend
 */

class TestReportGenerator {
  constructor() {
    this.reportDir = path.join(__dirname, '..', 'test-reports');
    this.coverageDir = path.join(__dirname, '..', 'coverage');
    this.timestamp = new Date().toISOString();

    // Ensure report directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Generate complete test summary
   */
  async generateTestSummary() {
    console.log('🧪 Generating test summary report...');

    const summary = {
      timestamp: this.timestamp,
      overview: await this.getTestOverview(),
      coverage: await this.getCoverage(),
      performance: await this.getPerformanceMetrics(),
      qualityGates: await this.checkQualityGates(),
      recommendations: await this.generateRecommendations(),
    };

    const reportPath = path.join(this.reportDir, 'test-summary.json');
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));

    await this.generateMarkdownReport(summary);
    await this.generateHTMLReport(summary);

    console.log('✅ Test summary report generated');
    console.log(`📄 JSON Report: ${reportPath}`);
    console.log(
      `📄 Markdown Report: ${path.join(this.reportDir, 'test-summary.md')}`,
    );
    console.log(
      `📄 HTML Report: ${path.join(this.reportDir, 'test-summary.html')}`,
    );

    return summary;
  }

  /**
   * Get test overview statistics
   */
  async getTestOverview() {
    try {
      // Run tests and capture output
      const testResults = {
        unit: await this.runTestsAndGetStats('test:unit'),
        integration: await this.runTestsAndGetStats('test:integration'),
        e2e: await this.runTestsAndGetStats('test:e2e'),
      };

      const total = Object.values(testResults).reduce(
        (acc, result) => ({
          passed: acc.passed + result.passed,
          failed: acc.failed + result.failed,
          skipped: acc.skipped + result.skipped,
          total: acc.total + result.total,
          duration: acc.duration + result.duration,
        }),
        { passed: 0, failed: 0, skipped: 0, total: 0, duration: 0 },
      );

      return {
        total,
        breakdown: testResults,
        passRate: ((total.passed / total.total) * 100).toFixed(2) + '%',
        testSuites: await this.getTestSuiteCount(),
      };
    } catch (error) {
      console.warn('Could not get test overview:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Run specific test type and extract statistics
   */
  async runTestsAndGetStats(testCommand) {
    try {
      const output = execSync(
        `npm run ${testCommand} -- --passWithNoTests --silent`,
        {
          encoding: 'utf8',
          timeout: 300000, // 5 minutes
        },
      );

      // Parse Jest output for statistics
      const stats = this.parseJestOutput(output);
      return stats;
    } catch (error) {
      // If tests fail, still try to extract stats from error output
      const stats = this.parseJestOutput(error.stdout || error.message);
      return { ...stats, error: error.message };
    }
  }

  /**
   * Parse Jest output to extract test statistics
   */
  parseJestOutput(output) {
    const stats = { passed: 0, failed: 0, skipped: 0, total: 0, duration: 0 };

    // Extract test results from Jest output
    const testSummaryMatch = output.match(
      /Tests:\s+(\d+)\s+failed.*?(\d+)\s+passed.*?(\d+)\s+total/,
    );
    if (testSummaryMatch) {
      stats.failed = parseInt(testSummaryMatch[1]) || 0;
      stats.passed = parseInt(testSummaryMatch[2]) || 0;
      stats.total = parseInt(testSummaryMatch[3]) || 0;
      stats.skipped = stats.total - stats.passed - stats.failed;
    }

    // Extract duration
    const durationMatch = output.match(/Time:\s+([\d.]+)\s*s/);
    if (durationMatch) {
      stats.duration = parseFloat(durationMatch[1]);
    }

    return stats;
  }

  /**
   * Get test suite count
   */
  async getTestSuiteCount() {
    const testDirs = ['src', 'test/integration', 'test/e2e'];
    let suiteCount = 0;

    testDirs.forEach((dir) => {
      const fullPath = path.join(__dirname, '..', dir);
      if (fs.existsSync(fullPath)) {
        suiteCount += this.countTestFiles(fullPath);
      }
    });

    return suiteCount;
  }

  /**
   * Count test files recursively
   */
  countTestFiles(dir) {
    let count = 0;
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        count += this.countTestFiles(filePath);
      } else if (file.match(/\.(spec|test)\.ts$/)) {
        count++;
      }
    });

    return count;
  }

  /**
   * Get coverage statistics
   */
  async getCoverage() {
    try {
      const coverageFile = path.join(this.coverageDir, 'coverage-summary.json');

      if (fs.existsSync(coverageFile)) {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        return {
          total: coverage.total,
          byType: {
            statements: coverage.total.statements.pct,
            branches: coverage.total.branches.pct,
            functions: coverage.total.functions.pct,
            lines: coverage.total.lines.pct,
          },
          threshold: {
            statements: 90,
            branches: 90,
            functions: 90,
            lines: 90,
          },
          meets_threshold: this.checkCoverageThreshold(coverage.total),
        };
      } else {
        return {
          error: 'Coverage file not found. Run tests with coverage first.',
        };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Check if coverage meets threshold
   */
  checkCoverageThreshold(coverage) {
    const threshold = 90;
    return (
      coverage.statements.pct >= threshold &&
      coverage.branches.pct >= threshold &&
      coverage.functions.pct >= threshold &&
      coverage.lines.pct >= threshold
    );
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const perfFile = path.join(
        __dirname,
        '..',
        'test',
        'load-testing',
        'performance-test-results.json',
      );

      if (fs.existsSync(perfFile)) {
        const perfData = JSON.parse(fs.readFileSync(perfFile, 'utf8'));

        return {
          responseTime: {
            avg: perfData.metrics?.http_req_duration?.avg || 'N/A',
            p95: perfData.metrics?.http_req_duration?.['p(95)'] || 'N/A',
            p99: perfData.metrics?.http_req_duration?.['p(99)'] || 'N/A',
          },
          throughput: {
            rps: perfData.metrics?.http_reqs?.rate || 'N/A',
            total_requests: perfData.metrics?.http_reqs?.count || 'N/A',
          },
          errors: {
            rate:
              (perfData.metrics?.http_req_failed?.rate * 100)?.toFixed(2) +
                '%' || 'N/A',
            count: perfData.metrics?.http_req_failed?.count || 'N/A',
          },
          load: {
            max_vus: perfData.metrics?.vus_max?.max || 'N/A',
            avg_vus: perfData.metrics?.vus?.avg || 'N/A',
          },
        };
      } else {
        return {
          error:
            'Performance test results not found. Run performance tests first.',
        };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Check quality gates
   */
  async checkQualityGates() {
    const gates = {
      test_pass_rate: { threshold: 100, status: 'unknown' },
      coverage: { threshold: 90, status: 'unknown' },
      performance_p95: { threshold: 500, status: 'unknown' },
      error_rate: { threshold: 1, status: 'unknown' },
    };

    try {
      const overview = await this.getTestOverview();
      const coverage = await this.getCoverage();
      const performance = await this.getPerformanceMetrics();

      // Check test pass rate
      if (overview.total?.total > 0) {
        const passRate = (overview.total.passed / overview.total.total) * 100;
        gates.test_pass_rate.actual = passRate.toFixed(2);
        gates.test_pass_rate.status =
          passRate >= gates.test_pass_rate.threshold ? 'pass' : 'fail';
      }

      // Check coverage
      if (coverage.total) {
        const avgCoverage =
          (coverage.total.statements.pct +
            coverage.total.branches.pct +
            coverage.total.functions.pct +
            coverage.total.lines.pct) /
          4;
        gates.coverage.actual = avgCoverage.toFixed(2);
        gates.coverage.status =
          avgCoverage >= gates.coverage.threshold ? 'pass' : 'fail';
      }

      // Check performance
      if (
        performance.responseTime?.p95 &&
        typeof performance.responseTime.p95 === 'number'
      ) {
        gates.performance_p95.actual = performance.responseTime.p95;
        gates.performance_p95.status =
          performance.responseTime.p95 <= gates.performance_p95.threshold
            ? 'pass'
            : 'fail';
      }

      // Check error rate
      if (performance.errors?.rate) {
        const errorRate = parseFloat(performance.errors.rate.replace('%', ''));
        gates.error_rate.actual = errorRate;
        gates.error_rate.status =
          errorRate <= gates.error_rate.threshold ? 'pass' : 'fail';
      }
    } catch (error) {
      console.warn('Error checking quality gates:', error.message);
    }

    return gates;
  }

  /**
   * Generate recommendations based on test results
   */
  async generateRecommendations() {
    const recommendations = [];

    try {
      const overview = await this.getTestOverview();
      const coverage = await this.getCoverage();
      const performance = await this.getPerformanceMetrics();
      const qualityGates = await this.checkQualityGates();

      // Test recommendations
      if (overview.total?.failed > 0) {
        recommendations.push({
          type: 'error',
          message: `${overview.total.failed} test(s) are failing. Fix failing tests before deployment.`,
        });
      }

      // Coverage recommendations
      if (coverage.byType) {
        Object.entries(coverage.byType).forEach(([type, percent]) => {
          if (percent < 90) {
            recommendations.push({
              type: 'warning',
              message: `${type} coverage is ${percent}%. Increase to 90%+ by adding more tests.`,
            });
          }
        });
      }

      // Performance recommendations
      if (performance.responseTime?.p95 > 500) {
        recommendations.push({
          type: 'warning',
          message: `95th percentile response time is ${performance.responseTime.p95}ms. Optimize for <500ms.`,
        });
      }

      // Quality gate recommendations
      Object.entries(qualityGates).forEach(([gate, result]) => {
        if (result.status === 'fail') {
          recommendations.push({
            type: 'error',
            message: `Quality gate "${gate}" failed. Expected: ${result.threshold}, Actual: ${result.actual}`,
          });
        }
      });

      // General recommendations
      if (recommendations.length === 0) {
        recommendations.push({
          type: 'success',
          message:
            'All quality gates passed! Consider adding more edge case tests and performance optimizations.',
        });
      }
    } catch (error) {
      recommendations.push({
        type: 'error',
        message: `Error generating recommendations: ${error.message}`,
      });
    }

    return recommendations;
  }

  /**
   * Generate Markdown report
   */
  async generateMarkdownReport(summary) {
    const markdown = `# StarkPulse Backend - Test Summary Report

**Generated**: ${new Date(summary.timestamp).toLocaleString()}

## 📊 Test Overview

| Metric | Value |
|--------|-------|
| Total Tests | ${summary.overview.total?.total || 'N/A'} |
| Passed | ${summary.overview.total?.passed || 'N/A'} |
| Failed | ${summary.overview.total?.failed || 'N/A'} |
| Pass Rate | ${summary.overview.passRate || 'N/A'} |
| Test Suites | ${summary.overview.testSuites || 'N/A'} |
| Total Duration | ${summary.overview.total?.duration?.toFixed(2) || 'N/A'}s |

### Test Breakdown

| Test Type | Passed | Failed | Total | Duration |
|-----------|---------|---------|-------|----------|
| Unit | ${summary.overview.breakdown?.unit?.passed || 'N/A'} | ${summary.overview.breakdown?.unit?.failed || 'N/A'} | ${summary.overview.breakdown?.unit?.total || 'N/A'} | ${summary.overview.breakdown?.unit?.duration?.toFixed(2) || 'N/A'}s |
| Integration | ${summary.overview.breakdown?.integration?.passed || 'N/A'} | ${summary.overview.breakdown?.integration?.failed || 'N/A'} | ${summary.overview.breakdown?.integration?.total || 'N/A'} | ${summary.overview.breakdown?.integration?.duration?.toFixed(2) || 'N/A'}s |
| E2E | ${summary.overview.breakdown?.e2e?.passed || 'N/A'} | ${summary.overview.breakdown?.e2e?.failed || 'N/A'} | ${summary.overview.breakdown?.e2e?.total || 'N/A'} | ${summary.overview.breakdown?.e2e?.duration?.toFixed(2) || 'N/A'}s |

## 📈 Coverage Report

| Type | Coverage | Threshold | Status |
|------|----------|-----------|---------|
| Statements | ${summary.coverage.byType?.statements || 'N/A'}% | 90% | ${summary.coverage.meets_threshold ? '✅' : '❌'} |
| Branches | ${summary.coverage.byType?.branches || 'N/A'}% | 90% | ${summary.coverage.meets_threshold ? '✅' : '❌'} |
| Functions | ${summary.coverage.byType?.functions || 'N/A'}% | 90% | ${summary.coverage.meets_threshold ? '✅' : '❌'} |
| Lines | ${summary.coverage.byType?.lines || 'N/A'}% | 90% | ${summary.coverage.meets_threshold ? '✅' : '❌'} |

## ⚡ Performance Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|---------|
| Avg Response Time | ${summary.performance.responseTime?.avg || 'N/A'}ms | - | - |
| 95th Percentile | ${summary.performance.responseTime?.p95 || 'N/A'}ms | <500ms | ${summary.qualityGates?.performance_p95?.status === 'pass' ? '✅' : '❌'} |
| Error Rate | ${summary.performance.errors?.rate || 'N/A'} | <1% | ${summary.qualityGates?.error_rate?.status === 'pass' ? '✅' : '❌'} |
| Throughput | ${summary.performance.throughput?.rps || 'N/A'} RPS | - | - |

## 🚦 Quality Gates

| Gate | Threshold | Actual | Status |
|------|-----------|---------|---------|
| Test Pass Rate | ${summary.qualityGates?.test_pass_rate?.threshold || 'N/A'}% | ${summary.qualityGates?.test_pass_rate?.actual || 'N/A'}% | ${summary.qualityGates?.test_pass_rate?.status === 'pass' ? '✅' : '❌'} |
| Coverage | ${summary.qualityGates?.coverage?.threshold || 'N/A'}% | ${summary.qualityGates?.coverage?.actual || 'N/A'}% | ${summary.qualityGates?.coverage?.status === 'pass' ? '✅' : '❌'} |
| P95 Response Time | <${summary.qualityGates?.performance_p95?.threshold || 'N/A'}ms | ${summary.qualityGates?.performance_p95?.actual || 'N/A'}ms | ${summary.qualityGates?.performance_p95?.status === 'pass' ? '✅' : '❌'} |
| Error Rate | <${summary.qualityGates?.error_rate?.threshold || 'N/A'}% | ${summary.qualityGates?.error_rate?.actual || 'N/A'}% | ${summary.qualityGates?.error_rate?.status === 'pass' ? '✅' : '❌'} |

## 💡 Recommendations

${summary.recommendations.map((rec) => `- **${rec.type.toUpperCase()}**: ${rec.message}`).join('\n')}

---

*Report generated by StarkPulse Test Infrastructure*
`;

    const markdownPath = path.join(this.reportDir, 'test-summary.md');
    fs.writeFileSync(markdownPath, markdown);
    return markdownPath;
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(summary) {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>StarkPulse Backend - Test Summary Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; border: 1px solid #ddd; border-radius: 5px; padding: 15px; }
        .metric-title { font-weight: bold; color: #333; margin-bottom: 10px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2196F3; }
        .status-pass { color: #4CAF50; }
        .status-fail { color: #F44336; }
        .status-unknown { color: #FF9800; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .recommendations { margin: 20px 0; }
        .rec-error { color: #F44336; font-weight: bold; }
        .rec-warning { color: #FF9800; font-weight: bold; }
        .rec-success { color: #4CAF50; font-weight: bold; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 StarkPulse Backend - Test Summary Report</h1>
        <p><strong>Generated:</strong> ${new Date(summary.timestamp).toLocaleString()}</p>
    </div>

    <div class="metrics">
        <div class="metric-card">
            <div class="metric-title">Total Tests</div>
            <div class="metric-value">${summary.overview.total?.total || 'N/A'}</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">Pass Rate</div>
            <div class="metric-value">${summary.overview.passRate || 'N/A'}</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">Coverage</div>
            <div class="metric-value">${summary.coverage.byType?.statements || 'N/A'}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-title">P95 Response Time</div>
            <div class="metric-value">${summary.performance.responseTime?.p95 || 'N/A'}ms</div>
        </div>
    </div>

    <h2>📊 Test Breakdown</h2>
    <table>
        <tr><th>Type</th><th>Passed</th><th>Failed</th><th>Total</th><th>Duration</th></tr>
        <tr><td>Unit</td><td>${summary.overview.breakdown?.unit?.passed || 'N/A'}</td><td>${summary.overview.breakdown?.unit?.failed || 'N/A'}</td><td>${summary.overview.breakdown?.unit?.total || 'N/A'}</td><td>${summary.overview.breakdown?.unit?.duration?.toFixed(2) || 'N/A'}s</td></tr>
        <tr><td>Integration</td><td>${summary.overview.breakdown?.integration?.passed || 'N/A'}</td><td>${summary.overview.breakdown?.integration?.failed || 'N/A'}</td><td>${summary.overview.breakdown?.integration?.total || 'N/A'}</td><td>${summary.overview.breakdown?.integration?.duration?.toFixed(2) || 'N/A'}s</td></tr>
        <tr><td>E2E</td><td>${summary.overview.breakdown?.e2e?.passed || 'N/A'}</td><td>${summary.overview.breakdown?.e2e?.failed || 'N/A'}</td><td>${summary.overview.breakdown?.e2e?.total || 'N/A'}</td><td>${summary.overview.breakdown?.e2e?.duration?.toFixed(2) || 'N/A'}s</td></tr>
    </table>

    <h2>🚦 Quality Gates</h2>
    <table>
        <tr><th>Gate</th><th>Threshold</th><th>Actual</th><th>Status</th></tr>
        ${Object.entries(summary.qualityGates || {})
          .map(
            ([gate, result]) => `
        <tr>
            <td>${gate.replace(/_/g, ' ')}</td>
            <td>${result.threshold || 'N/A'}</td>
            <td>${result.actual || 'N/A'}</td>
            <td class="status-${result.status || 'unknown'}">${result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '❓'}</td>
        </tr>
        `,
          )
          .join('')}
    </table>

    <h2>💡 Recommendations</h2>
    <div class="recommendations">
        ${summary.recommendations.map((rec) => `<p class="rec-${rec.type}">• ${rec.message}</p>`).join('')}
    </div>

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
        <p><em>Report generated by StarkPulse Test Infrastructure</em></p>
    </footer>
</body>
</html>`;

    const htmlPath = path.join(this.reportDir, 'test-summary.html');
    fs.writeFileSync(htmlPath, html);
    return htmlPath;
  }
}

// Run report generation if called directly
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator
    .generateTestSummary()
    .then((summary) => {
      console.log('\n📈 Test Summary:');
      console.log(`- Total Tests: ${summary.overview.total?.total || 'N/A'}`);
      console.log(`- Pass Rate: ${summary.overview.passRate || 'N/A'}`);
      console.log(
        `- Coverage: ${summary.coverage.meets_threshold ? '✅ Passed' : '❌ Failed'}`,
      );
      console.log(
        `- Quality Gates: ${Object.values(summary.qualityGates || {}).filter((g) => g.status === 'pass').length}/${Object.keys(summary.qualityGates || {}).length} passed`,
      );
    })
    .catch((error) => {
      console.error('❌ Error generating test report:', error);
      process.exit(1);
    });
}

module.exports = TestReportGenerator;
