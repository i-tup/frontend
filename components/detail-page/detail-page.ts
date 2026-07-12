const loadTemplate = async (): Promise<string> => {
  const response = await fetch('./components/detail-page/detail-page.html');

  if (!response.ok) {
    throw new Error('Failed to load detail-page template.');
  }

  return response.text();
};

export const createDetailPageComponent = async () => ({
  emits: ['go', 'open-detail'],
  methods: {
    fmt(value: number) {
      return Number(value).toLocaleString('en-US');
    }
  },
  props: {
    currentPage: { required: true, type: String },
    detailModel: { required: false, type: Object },
    project: { required: false, type: Object }
  },
  template: await loadTemplate()
});
