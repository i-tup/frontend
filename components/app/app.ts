type ModuleLoader = (path: string) => Promise<Record<string, any>>;

type RemoteProject = {
  id: string;
  name: string;
  description?: string;
  building?: string;
  co2e?: number;
  lead?: string;
  base?: number;
  cost?: number;
  eur?: number;
  kpi?: Record<string, number>;
  synenergies?: [string, string][];
  institution?: string;
  dimension?: string;
  status?: string;
  source?: string;
  goals?: number[];
};

const PROJECTS_URL = 'https://i-tup.github.io/backend/projects.json';
const FALLBACK_URL = './fallback.json';

const useFallbackData = (): boolean => {
  const params = new URLSearchParams(window.location.search);
  return params.has('fallback');
};

const loadTemplate = async (): Promise<string> => {
  const response = await fetch('./components/app/app.html');

  if (!response.ok) {
    throw new Error('Failed to load app template.');
  }

  return response.text();
};

const loadModule = (window as any).loadTypeScriptModule as ModuleLoader;

const mapProject = (
  project: RemoteProject,
  dimensions: Record<string, any>,
  normalizeDimension: (dimension: string, dimensions: Record<string, any>) => string
) => ({
  id: project.id,
  name: project.name,
  dim: normalizeDimension(project.dimension ?? '', dimensions),
  fac: project.institution || 'Unknown institution',
  bldg: project.building || 'unknown',
  lead: project.lead || 'unknown',
  status: project.status || 'unknown',
  co2e: project.co2e ?? 0,
  base: project.base ?? 0,
  cost: project.cost ?? 0,
  eur: project.eur ?? 0,
  s: {
    carbon: project.kpi?.carbon ?? 0,
    cost: project.kpi?.cost ?? 0,
    sdg: project.kpi?.sdg ?? 0,
    lockin: project.kpi?.lockin ?? 0,
    data: project.kpi?.data ?? 0
  },
  sdgs: Array.isArray(project.goals) ? project.goals : [],
  source: project.source || 'unknown',
  syn: Array.isArray(project.synenergies) ? project.synenergies : [],
  blurb: project.description || ''
});

const loadProjects = async (
  dimensions: Record<string, any>,
  normalizeDimension: (dimension: string, dimensions: Record<string, any>) => string
) => {
  const response = await fetch(PROJECTS_URL);

  if (!response.ok) {
    throw new Error('Failed to load remote projects.');
  }

  const payload = await response.json();
  const items = Array.isArray(payload.data) ? payload.data : [];

  return items.map((project: RemoteProject) => mapProject(project, dimensions, normalizeDimension));
};

type FallbackKpiValue = number | { score: number; rationale: string };

const extractKpiScore = (value: FallbackKpiValue | undefined): number => {
  if (value === undefined || value === null) return 0;
  return typeof value === 'object' ? value.score : value;
};

const loadFallbackProjects = async (
  dimensions: Record<string, any>,
  normalizeDimension: (dimension: string, dimensions: Record<string, any>) => string
) => {
  const response = await fetch(FALLBACK_URL);

  if (!response.ok) {
    throw new Error('Failed to load fallback projects.');
  }

  const items = await response.json() as Array<Omit<RemoteProject, 'kpi'> & { kpi?: Record<string, FallbackKpiValue> }>;
  const list = Array.isArray(items) ? items : [];

  return list.map((project) => ({
    ...mapProject(project as RemoteProject, dimensions, normalizeDimension),
    s: {
      carbon: extractKpiScore(project.kpi?.carbon),
      cost: extractKpiScore(project.kpi?.cost),
      sdg: extractKpiScore(project.kpi?.sdg),
      lockin: extractKpiScore(project.kpi?.lockin),
      data: extractKpiScore(project.kpi?.data)
    }
  }));
};

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
  const projects = useFallbackData()
    ? await loadFallbackProjects(dimensions, appUtils.normalizeDimension)
    : await loadProjects(dimensions, appUtils.normalizeDimension);
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
        const filters = [
          this.state.dim === 'All' ? 'all dimensions' : this.state.dim,
          this.state.source === 'All' ? '' : this.state.source,
          this.state.status === 'All' ? '' : this.state.status
        ].filter(Boolean);

        return `${this.filteredProjects.length} of ${this.projects.length} projects · ${filters.join(' · ')}`;
      },
      dashboardSummary() {
        return appUtils.createDashboardSummary(this.filteredProjects, weights);
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
      sourceChips() {
        return appUtils.createSourceChips(this.projects);
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
          { description: "Breadth and depth of alignment across the UN's 17 Sustainable Development Goals.", name: 'SDG reach', w: 15 },
          { description: 'Does it prevent future high-carbon commitments, or quietly reinforce them?', name: 'Lock-in avoidance', w: 15 },
          { description: 'How solid is the evidence — metered readings and audits, or estimates?', name: 'Data quality', w: 15 }
        ];
      }
    },
    data: () => ({
      currentPage: 'landing',
      dimensions,
      projects,
      sdg: appData.SDG,
      selectedProjectId: projects[0]?.id ?? null,
      state: {
        dim: 'All',
        q: '',
        sort: 'score',
        source: 'All',
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
      updateSource(source: string) {
        this.state.source = source;
      },
      updateStatus(status: string) {
        this.state.status = status;
      }
    },
    template: await loadTemplate()
  };
};
