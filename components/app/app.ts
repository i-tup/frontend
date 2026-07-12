type ModuleLoader = (path: string) => Promise<Record<string, any>>;

const loadTemplate = async (): Promise<string> => {
  const response = await fetch('./components/app/app.html');

  if (!response.ok) {
    throw new Error('Failed to load app template.');
  }

  return response.text();
};

const loadModule = (window as any).loadTypeScriptModule as ModuleLoader;

export const createAppConfig = async () => {
  const [
    appData,
    appUtils,
    siteNavModule,
    landingPageModule,
    dashboardPageModule,
    detailPageModule
  ] = await Promise.all([
    loadModule('./components/app/app-data.ts'),
    loadModule('./components/app/app-utils.ts'),
    loadModule('./components/site-nav/site-nav.ts'),
    loadModule('./components/landing-page/landing-page.ts'),
    loadModule('./components/dashboard-page/dashboard-page.ts'),
    loadModule('./components/detail-page/detail-page.ts')
  ]);

  const dimensions = appData.DIMENSIONS;
  const weights = appData.WEIGHTS;
  const scoreProject = (project: any) => appUtils.score(project, weights);

  return {
    components: {
      DashboardPage: await dashboardPageModule.createDashboardPageComponent(),
      DetailPage: await detailPageModule.createDetailPageComponent(),
      LandingPage: await landingPageModule.createLandingPageComponent(),
      SiteNav: await siteNavModule.createSiteNavComponent()
    },
    computed: {
      dashboardCountText() {
        return `${this.filteredProjects.length} of ${this.projects.length} projects · ${this.state.dim === 'All' ? 'all dimensions' : this.state.dim}${this.state.status !== 'All' ? ` · ${this.state.status}` : ''}`;
      },
      dashboardSummary() {
        return appUtils.createDashboardSummary(this.projects, weights);
      },
      detailModel() {
        if (!this.selectedProject) {
          return null;
        }

        return appUtils.createDetailModel(
          this.selectedProject,
          this.projects,
          dimensions,
          weights,
          appData.SDG,
          appData.MS_STAGES,
          appData.MS_DONE
        );
      },
      dimensionChips() {
        return [
          { color: '', name: 'All' },
          ...Object.keys(dimensions).map((name) => ({ color: dimensions[name].hex, name }))
        ];
      },
      dimensionSummaries() {
        return appUtils.createDimensionSummaries(this.projects, dimensions);
      },
      filteredProjects() {
        return appUtils.createFilteredProjects(this.projects, this.state, weights);
      },
      heroStats() {
        return appUtils.createHeroStats(this.projects);
      },
      selectedProject() {
        return this.projects.find((project: any) => project.id === this.selectedProjectId) || null;
      },
      weightSegments() {
        const colors = ['var(--tu-red)', '#b81a2a', '#c94b57', '#d67882', '#e2a5ac'];

        return weights.map((weight: any, index: number) => ({
          ...weight,
          color: colors[index],
          label: weight.name === 'SDG reach'
            ? 'SDG'
            : weight.name === 'Lock-in avoidance'
              ? 'Lock-in'
              : weight.name
        }));
      },
      weightDetails() {
        return [
          { description: 'Measured tCO₂e reduction against a documented baseline, using a fixed emission-factor library.', name: 'Carbon', w: 30 },
          { description: 'Cost per tonne abated (€/tCO₂e) — how far each euro of funding actually goes.', name: 'Cost', w: 25 },
          { description: 'Breadth and depth of alignment across the UN\'s 17 Sustainable Development Goals.', name: 'SDG reach', w: 15 },
          { description: 'Does it prevent future high-carbon commitments, or quietly reinforce them?', name: 'Lock-in avoidance', w: 15 },
          { description: 'How solid is the evidence — metered readings and audits, or estimates?', name: 'Data quality', w: 15 }
        ];
      }
    },
    data: () => ({
      currentPage: 'landing',
      dimensions,
      projects: appData.PROJECTS,
      sdg: appData.SDG,
      selectedProjectId: appData.PROJECTS[0]?.id ?? null,
      state: {
        dim: 'All',
        q: '',
        sort: 'score',
        status: 'All'
      }
    }),
    methods: {
      go(page: string) {
        this.currentPage = page;
        window.scrollTo(0, 0);
      },
      openDetail(id: string) {
        this.selectedProjectId = id;
        this.currentPage = 'detail';
        window.scrollTo(0, 0);
      },
      scoreProject,
      scrollToSection(id: string) {
        this.currentPage = 'landing';
        this.$nextTick(() => {
          const target = document.getElementById(id);

          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        });
      },
      selectDimension(dimension: string) {
        this.state.dim = dimension;
        this.currentPage = 'dashboard';
        window.scrollTo(0, 0);
      },
      updateDim(dimension: string) {
        this.state.dim = dimension;
      },
      updateQuery(query: string) {
        this.state.q = query;
      },
      updateSort(sort: string) {
        this.state.sort = sort;
      },
      updateStatus(status: string) {
        this.state.status = status;
      }
    },
    template: await loadTemplate()
  };
};
