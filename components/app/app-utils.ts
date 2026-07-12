export const score = (project: any, weights: any[]) =>
  Math.round(weights.reduce((total, weight) => total + project.s[weight.k] * weight.w / 100, 0));

export const band = (value: number) => {
  if (value >= 80) return 'High impact';
  if (value >= 65) return 'Strong';
  if (value >= 50) return 'Moderate';

  return 'Emerging';
};

export const fmt = (value: number | string) =>
  Number(value).toLocaleString('en-US');

export const money = (value: number) => {
  if (value >= 1e6) {
    return `€${(value / 1e6).toFixed(1).replace(/\.0$/, '')} M`;
  }

  if (value >= 1e3) {
    return `€${(value / 1e3).toFixed(0)} k`;
  }

  return `€${value}`;
};

export const createHeroStats = (projects: any[]) => {
  const total = projects.reduce((sum, project) => sum + project.co2e, 0);
  const eurs = projects.map((project) => project.eur).sort((a, b) => a - b);
  const median = eurs[Math.floor(eurs.length / 2)];
  const sdgSet = new Set<number>();

  projects.forEach((project) => {
    project.sdgs.forEach((sdg: number) => sdgSet.add(sdg));
  });

  return [
    {
      label: '<b>CO₂e reduction</b> measured across the portfolio, per year',
      unit: 't',
      value: fmt(total)
    },
    {
      label: '<b>Projects assessed</b> and comparable — dozens more in the queue',
      unit: '',
      value: String(projects.length)
    },
    {
      label: '<b>Median cost per tonne</b> abated (€/tCO₂e) across projects',
      unit: '/t',
      value: `€${median}`
    },
    {
      label: '<b>UN SDGs</b> addressed by the current portfolio',
      unit: '',
      value: `${sdgSet.size}/17`
    }
  ];
};

export const createDimensionSummaries = (projects: any[], dimensions: Record<string, any>) =>
  Object.keys(dimensions).map((dimension) => {
    const items = projects.filter((project) => project.dim === dimension);
    const totalCo2e = items.reduce((sum, project) => sum + project.co2e, 0);

    return {
      color: dimensions[dimension].hex,
      count: items.length,
      name: dimension,
      totalCo2e: fmt(totalCo2e)
    };
  });

export const createDashboardSummary = (projects: any[], weights: any[]) => {
  const totalCo2e = projects.reduce((sum, project) => sum + project.co2e, 0);
  const totalCost = projects.reduce((sum, project) => sum + project.cost, 0);
  const averageScore = Math.round(
    projects.reduce((sum, project) => sum + score(project, weights), 0) / projects.length
  );

  return [
    { label: 'CO₂e / yr', unit: ' t', value: fmt(totalCo2e) },
    { label: 'Committed', unit: '', value: money(totalCost) },
    { label: 'Avg score', unit: '', value: String(averageScore) }
  ];
};

export const createFilteredProjects = (
  projects: any[],
  state: Record<string, string>,
  weights: any[]
) => {
  const query = state.q.toLowerCase();
  const list = projects.filter((project) => {
    const haystack = `${project.name}${project.fac}${project.bldg}${project.lead}${project.dim}`.toLowerCase();

    return (
      (state.dim === 'All' || project.dim === state.dim) &&
      (state.status === 'All' || project.status === state.status) &&
      (!query || haystack.includes(query))
    );
  });

  if (state.sort === 'score') {
    return list.sort((left, right) => score(right, weights) - score(left, weights));
  }

  if (state.sort === 'cost') {
    return list.sort((left, right) => left.eur - right.eur);
  }

  return list.sort((left, right) => right.co2e - left.co2e);
};

export const createDetailModel = (
  project: any,
  projects: any[],
  dimensions: Record<string, any>,
  weights: any[],
  sdgMap: Record<number, [string, string]>,
  milestoneStages: string[],
  milestoneDone: Record<string, number>
) => {
  const scoreValue = score(project, weights);
  const after = project.base - project.co2e;
  const completedStages = milestoneDone[project.status];

  return {
    after,
    breakdown: weights.map((weight) => ({
      contribution: (project.s[weight.k] * weight.w / 100).toFixed(1),
      raw: project.s[weight.k],
      ...weight
    })),
    carbonReductionPercent: ((project.co2e / project.base) * 100).toFixed(0),
    completedStages,
    costText: money(project.cost),
    dimensionColor: dimensions[project.dim].hex,
    linkedProjects: project.syn
      .map(([id, note]: [string, string]) => {
        const linkedProject = projects.find((item) => item.id === id);

        if (!linkedProject) {
          return null;
        }

        return {
          color: dimensions[linkedProject.dim].hex,
          id,
          name: linkedProject.name,
          note,
          score: score(linkedProject, weights)
        };
      })
      .filter(Boolean),
    scoreBand: band(scoreValue),
    scoreValue,
    sdgCells: Array.from({ length: 17 }, (_, index) => {
      const id = index + 1;
      const active = project.sdgs.includes(id);

      return {
        active,
        color: sdgMap[id][1],
        id,
        text: active ? sdgMap[id][0] : ''
      };
    }),
    sdgSummary: project.sdgs.map((id: number) => `SDG ${id}`).join(', '),
    sdgSummaryText: project.sdgs.map((id: number) => sdgMap[id][0]).join(', '),
    scoreBarWidth: `${scoreValue}%`,
    timeline: milestoneStages.map((stage, index) => ({
      current: index === completedStages && project.status !== 'finalized',
      date: `${['Q1', 'Q2', 'Q4', 'Q2', 'Q4'][index]} ${2024 + Math.floor(index * 0.7)}`,
      done: index < completedStages,
      stage
    }))
  };
};
