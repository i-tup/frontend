const loadTemplate = async (): Promise<string> => {
  const response = await fetch('./components/dashboard-page/dashboard-page.html');

  if (!response.ok) {
    throw new Error('Failed to load dashboard-page template.');
  }

  return response.text();
};

export const createDashboardPageComponent = async () => ({
  emits: ['open-detail', 'update-dim', 'update-query', 'update-sort', 'update-source', 'update-status'],
  methods: {
    fmt(value: number) {
      return Number(value).toLocaleString('en-US');
    }
  },
  props: {
    currentPage: { required: true, type: String },
    dashboardCountText: { required: true, type: String },
    dashboardSummary: { required: true, type: Array },
    dimensionChips: { required: true, type: Array },
    dimensions: { required: true, type: Object },
    filteredProjects: { required: true, type: Array },
    score: { required: true, type: Function },
    sdg: { required: true, type: Object },
    sourceChips: { required: true, type: Array },
    state: { required: true, type: Object }
  },
  setup() {
    return {
      statuses: [
        { label: 'All statuses', value: 'All' },
        { label: 'Concept', value: 'concept' },
        { label: 'Ongoing', value: 'ongoing' },
        { label: 'Finalized', value: 'finalized' },
        { label: 'Current', value: 'current' },
        { label: 'Unknown', value: 'unknown' }
      ]
    };
  },
  template: await loadTemplate()
});
