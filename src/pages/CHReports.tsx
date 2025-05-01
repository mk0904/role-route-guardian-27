import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { PieChart, PieArcDatum, Cell } from "recharts";
import { generateReportData, fetchCategoryBreakdown } from "@/services/chService";

const CHReports = () => {
  const [timeframe, setTimeframe] = useState("month");
  const [reportType, setReportType] = useState("summary");
  const [category, setCategory] = useState("all");

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['ch-report-data', timeframe, category],
    queryFn: () => generateReportData()
  });

  const { data: categoryData } = useQuery({
    queryKey: ['ch-category-breakdown'],
    queryFn: fetchCategoryBreakdown
  });

  // Summary metrics calculated from the report data
  const summaryMetrics = React.useMemo(() => {
    if (!reportData) return {
      totalBranchVisits: 0,
      coveragePercentage: 0,
      avgParticipation: 0,
      topPerformer: ""
    };

    const totalBranches = reportData.reduce((sum, item) => sum + item.branches, 0);
    const weightedCoverage = reportData.reduce((sum, item) => sum + (item.coverage * item.branches), 0);
    const avgCoverage = totalBranches > 0 ? Math.round(weightedCoverage / totalBranches) : 0;
    
    // Find category with highest coverage
    const topCategory = [...reportData].sort((a, b) => b.coverage - a.coverage)[0];
    
    return {
      totalBranchVisits: totalBranches,
      coveragePercentage: avgCoverage,
      avgParticipation: Math.round(Math.random() * 20) + 70, // Placeholder for demo
      topPerformer: topCategory ? topCategory.name : "None"
    };
  }, [reportData]);

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: 
    { cx: number, cy: number, midAngle: number, innerRadius: number, outerRadius: number, percent: number, index: number, name: string }) => {
    const RADIAN = Math.PI / 180;
    const radius = 25 + innerRadius + (outerRadius - innerRadius);
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="#000000" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs"
      >
        {name} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-slate-600 mt-1">Generate and analyze branch visit reports</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          Export Report
        </Button>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger>
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="quarter">Last Quarter</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="bronze">Bronze</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          className="border-dashed border-slate-400 hover:border-slate-600"
        >
          Add Filter
        </Button>
      </div>
      
      {/* Report Types */}
      <Tabs value={reportType} onValueChange={setReportType} className="mb-8">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="summary">Summary Report</TabsTrigger>
          <TabsTrigger value="category">Category Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance Report</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="text-slate-500 text-sm">Total Branch Visits</div>
                <div className="mt-2 text-3xl font-bold">
                  {isLoading ? "..." : summaryMetrics.totalBranchVisits}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-slate-500 text-sm">Coverage %</div>
                <div className="mt-2 text-3xl font-bold">
                  {isLoading ? "..." : summaryMetrics.coveragePercentage}%
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-slate-500 text-sm">Avg. Participation</div>
                <div className="mt-2 text-3xl font-bold">
                  {isLoading ? "..." : summaryMetrics.avgParticipation}%
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="text-slate-500 text-sm">Top Performer</div>
                <div className="mt-2 text-3xl font-bold truncate">
                  {isLoading ? "..." : summaryMetrics.topPerformer}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Category Chart */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-6">Branch Category Distribution</h2>
              <div className="flex justify-center">
                {isLoading || !categoryData ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="relative h-64">
                    <PieChart width={500} height={300}>
                      <Pie
                        data={categoryData}
                        cx={200}
                        cy={150}
                        labelLine={false}
                        label={renderCustomLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {
                          categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))
                        }
                      </Pie>
                    </PieChart>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Categories Table */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-6">Category Performance</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-4 font-medium">Category</th>
                      <th className="text-right py-4 font-medium">Branches</th>
                      <th className="text-right py-4 font-medium">Coverage %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoading ? (
                      Array(5).fill(0).map((_, i) => (
                        <tr key={i}>
                          <td className="py-4">
                            <div className="h-4 bg-slate-200 rounded animate-pulse w-20"></div>
                          </td>
                          <td className="text-right py-4">
                            <div className="h-4 bg-slate-200 rounded animate-pulse w-12 ml-auto"></div>
                          </td>
                          <td className="text-right py-4">
                            <div className="h-4 bg-slate-200 rounded animate-pulse w-16 ml-auto"></div>
                          </td>
                        </tr>
                      ))
                    ) : reportData?.map((item, i) => (
                      <tr key={i}>
                        <td className="py-4 font-medium">{item.name}</td>
                        <td className="text-right py-4">{item.branches}</td>
                        <td className="text-right py-4">{item.coverage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="category">
          <div className="text-center py-12">
            <h2 className="text-xl font-bold mb-2">Category Analysis Report</h2>
            <p className="text-slate-600">This report will be available in the next update.</p>
          </div>
        </TabsContent>
        
        <TabsContent value="performance">
          <div className="text-center py-12">
            <h2 className="text-xl font-bold mb-2">Performance Report</h2>
            <p className="text-slate-600">This report will be available in the next update.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CHReports;

import { Pie } from 'recharts';
