export interface TrendingTopic {
  tag: string;
  category: string;
  count: number;
}

export const demoTrendingTopics: TrendingTopic[] = [
  { tag: "#ReactJS", category: "Tecnologia", count: 12500 },
  { tag: "#DarkMode", category: "Design", count: 8200 },
  { tag: "#AItools", category: "Tecnologia", count: 34100 },
  { tag: "#Seekalive", category: "Social", count: 5600 },
  { tag: "#OpenSource", category: "Dev", count: 9800 },
  { tag: "#TypeScript", category: "Tecnologia", count: 15200 },
];
