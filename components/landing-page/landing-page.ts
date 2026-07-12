const loadTemplate = async (): Promise<string> => {
  const response = await fetch('./components/landing-page/landing-page.html');

  if (!response.ok) {
    throw new Error('Failed to load landing-page template.');
  }

  return response.text();
};

export const createLandingPageComponent = async () => ({
  emits: ['go', 'scroll-to', 'select-dimension'],
  props: {
    currentPage: { required: true, type: String },
    dimensionSummaries: { required: true, type: Array },
    heroStats: { required: true, type: Array },
    weightSegments: { required: true, type: Array },
    weights: { required: true, type: Array }
  },
  template: await loadTemplate()
});
