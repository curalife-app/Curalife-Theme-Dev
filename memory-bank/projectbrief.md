# Project Brief: Lighthouse CI Workflow

## Purpose

The Lighthouse CI workflow provides automated performance monitoring for the Curalife e-commerce website. It uses Google Lighthouse to regularly test key pages and track performance metrics over time, ensuring that the website maintains optimal loading speeds and user experience.

## Core Requirements

1. **Automated Testing**: Schedule regular performance tests on key website pages
2. **Comprehensive Metrics**: Measure Core Web Vitals and other performance indicators
3. **Historical Tracking**: Maintain performance history to identify trends and regressions
4. **Visual Dashboard**: Present results in an easily accessible dashboard
5. **GitHub Integration**: Annotate PRs with performance changes
6. **Modular Structure**: Maintain a modular, maintainable workflow structure

## Goals

- **Performance Monitoring**: Continuously track website performance changes
- **Early Detection**: Identify performance regressions before they impact customers
- **Documentation**: Provide clear visualization of performance trends
- **Accountability**: Make performance metrics accessible to all stakeholders
- **Best Practices**: Enforce web performance best practices

## Scope

The workflow is focused on monitoring the production Curalife website, with emphasis on the most critical customer journey pages. It tracks desktop and mobile performance separately and maintains historical records for trend analysis.

The current implementation includes:

- Automated testing of homepage and product detail pages
- Dashboard generation with current and historical metrics
- GitHub Pages deployment for easy stakeholder access
- Modular architecture for maintainability and extensibility

Future expansion may include:

- Testing of additional customer journey pages
- Integration with alert systems for performance regressions
- Budget enforcement to prevent deployment of performance-degrading changes

## Success Criteria

1. Reliable execution of twice-daily performance tests
2. Accurate tracking of performance metrics over time
3. Clear visualization of performance trends
4. Easy dashboard access for all stakeholders
5. Early detection of performance regressions
6. Maintainable workflow structure

## Out of Scope

- Real user monitoring (RUM) - this is handled by separate analytics tools
- Performance optimization implementation - the workflow only identifies issues
- Load testing or stress testing - the workflow focuses on page performance only
