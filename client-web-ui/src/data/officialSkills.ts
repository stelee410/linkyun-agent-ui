export interface OfficialSkill {
  id: string;
  name: string;
  description: string;
  introduction: string;
  code: string;
  icon: "time" | "search" | "calculator";
}

export const officialSkills: OfficialSkill[] = [
  {
    id: "get_current_time",
    name: "Get Current Time",
    description: "获取当前日期和时间。返回时间戳、ISO8601 格式、日期、时间及时区信息。",
    introduction: `Get Current Time 返回当前系统时间，适用于需要获取实时时间的场景。

返回字段：
- **timestamp**：Unix 时间戳
- **iso8601**：RFC3339 格式（如 2025-02-16T10:30:00+08:00）
- **date**：日期（2006-01-02）
- **time**：时间（15:04:05）
- **timezone**：时区

无需传入参数，直接调用即可。`,
    code: `// 调用示例 - 无需参数
{
  "timestamp": 1739662200,
  "iso8601": "2025-02-16T10:30:00+08:00",
  "date": "2025-02-16",
  "time": "10:30:00",
  "timezone": "CST"
}`,
    icon: "time",
  },
  {
    id: "search_web",
    name: "Search Web",
    description: "在互联网上搜索信息。传入搜索关键词，返回相关结果列表。",
    introduction: `Search Web 执行网络搜索，适用于需要查询最新信息、文档、新闻等场景。

参数：
- **query**（必填）：搜索关键词
- **num_results**（可选）：返回结果数量，默认 5，范围 1-10

返回每个结果包含：title、url、snippet、relevance。`,
    code: `// 输入参数
{
  "query": "Linkyun Agent",
  "num_results": 5
}

// 返回示例
{
  "query": "Linkyun Agent",
  "results": [
    {
      "title": "Result for: Linkyun Agent",
      "url": "https://example.com",
      "snippet": "相关摘要...",
      "relevance": 0.95
    }
  ],
  "count": 1
}`,
    icon: "search",
  },
  {
    id: "calculator",
    name: "Calculator",
    description: "执行数学计算。支持四则运算及常见数学表达式。",
    introduction: `Calculator 执行数学表达式计算，适用于需要精确数值计算的场景。

参数：
- **expression**（必填）：数学表达式，如 "2 + 3 * 4"、"sqrt(16)"

支持常见运算符：+、-、*、/ 及括号。`,
    code: `// 输入参数
{
  "expression": "2 + 3 * 4"
}

// 返回示例
{
  "expression": "2 + 3 * 4",
  "result": "14"
}`,
    icon: "calculator",
  },
];
