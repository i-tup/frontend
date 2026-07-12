const loadTemplate = async (): Promise<string> => {
  const response = await fetch('./components/site-nav/site-nav.html');

  if (!response.ok) {
    throw new Error('Failed to load site-nav template.');
  }

  return response.text();
};

export const createSiteNavComponent = async () => ({
  emits: ['go', 'scroll-to'],
  props: {
    currentPage: {
      required: true,
      type: String
    }
  },
  template: await loadTemplate()
});
