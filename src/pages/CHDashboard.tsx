
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { fetchDashboardStats, fetchBranchCategoryStats, fetchMonthlyTrends, fetchTopPerformers } from "@/services/chService";
import { Building, CheckCircle, PieChart, Users, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StatCard = ({ 
  title, 
  value, 
  icon, 
  change, 
  suffix = "",
  isLoading = false
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode; 
  change?: number;
  suffix?: string;
  isLoading?: boolean;
}) => {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-6">
        <div className="text-slate-500 text-sm mb-1">{title}</div>
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-1">
            {isLoading ? (
              <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
            ) : (
              <>
                <span className="text-4xl font-bold">{value}</span>
                {suffix && <span className="text-2xl mb-1 text-slate-600">{suffix}</span>}
              </>
            )}
          </div>
          <div className="bg-slate-100 p-2 rounded-full text-blue-600">
            {icon}
          </div>
        </div>
        {typeof change === 'number' && (
          <div className="mt-3 flex items-center text-sm">
            {isLoading ? (
              <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
            ) : change > 0 ? (
              <div className="flex items-center bg-green-50 text-green-600 px-2 py-0.5 rounded">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{change}%
              </div>
            ) : change < 0 ? (
              <div className="flex items-center bg-red-50 text-red-600 px-2 py-0.5 rounded">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                {change}%
              </div>
            ) : (
              <div className="flex items-center bg-slate-50 text-slate-600 px-2 py-0.5 rounded">
                <Minus className="h-3 w-3 mr-1" />
                {change}%
              </div>
            )}
            <span className="ml-2 text-slate-500">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LoadingUI = () => (
  <div className="flex justify-center py-8">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const ErrorUI = ({ message }: { message: string }) => (
  <div className="py-4 text-center">
    <div className="inline-flex items-center justify-center bg-red-50 p-2 rounded-full text-red-500 mb-3">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
    </div>
    <p className="text-slate-600">{message}</p>
    <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>
      Retry
    </Button>
  </div>
);

const CHDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['ch-dashboard-stats'],
    queryFn: fetchDashboardStats
  });

  const { data: categoryStats, isLoading: categoryLoading, isError: categoryError } = useQuery({
    queryKey: ['ch-branch-category-stats'],
    queryFn: fetchBranchCategoryStats
  });

  const { data: monthlyTrends, isLoading: trendsLoading, isError: trendsError } = useQuery({
    queryKey: ['ch-monthly-trends'],
    queryFn: fetchMonthlyTrends
  });

  const { data: topPerformers, isLoading: performersLoading, isError: performersError } = useQuery({
    queryKey: ['ch-top-performers'],
    queryFn: fetchTopPerformers
  });

  const getProgressColorClass = (value: number) => {
    if (value >= 90) return "bg-green-500";
    if (value >= 75) return "bg-blue-500";
    if (value >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  const handleGenerateReports = () => {
    navigate('/ch/reports');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome, Channel HR User</h1>
          <p className="text-slate-600 mt-1">Channel-wide HR analytics and branch visit reports</p>
        </div>
        <Button 
          onClick={handleGenerateReports}
          className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
        >
          Generate Reports
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard
          title="Total Branches"
          value={statsLoading ? "..." : stats?.totalBranches || 0}
          icon={<Building className="h-5 w-5" />}
          isLoading={statsLoading}
        />
        
        <StatCard
          title="Visited Branches"
          value={statsLoading ? "..." : stats?.visitedBranches || 0}
          icon={<CheckCircle className="h-5 w-5" />}
          isLoading={statsLoading}
        />
        
        <StatCard
          title="Coverage"
          value={statsLoading ? "..." : stats?.coverage || 0}
          icon={<PieChart className="h-5 w-5" />}
          change={stats?.vsLastMonth?.coverage}
          suffix="%"
          isLoading={statsLoading}
        />
        
        <StatCard
          title="Active BHRs"
          value={statsLoading ? "..." : stats?.activeBHRs || 0}
          icon={<Users className="h-5 w-5" />}
          isLoading={statsLoading}
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard
          title="Avg. Coverage"
          value={statsLoading ? "..." : stats?.avgCoverage || 0}
          icon={<PieChart className="h-5 w-5" />}
          change={stats?.vsLastMonth?.avgCoverage}
          suffix="%"
          isLoading={statsLoading}
        />
        
        <StatCard
          title="Attrition"
          value={statsLoading ? "..." : stats?.attritionRate || 0}
          icon={<TrendingDown className="h-5 w-5" />}
          change={stats?.vsLastMonth?.attritionRate}
          suffix="%"
          isLoading={statsLoading}
        />
        
        <StatCard
          title="Manning %"
          value={statsLoading ? "..." : stats?.manningPercentage || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          change={stats?.vsLastMonth?.manningPercentage}
          suffix="%"
          isLoading={statsLoading}
        />
        
        <StatCard
          title="ER %"
          value={statsLoading ? "..." : stats?.erPercentage || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          change={stats?.vsLastMonth?.erPercentage}
          suffix="%"
          isLoading={statsLoading}
        />
      </div>

      {/* Branch Visit Coverage by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border shadow-sm lg:col-span-2">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Branch Visit Coverage by Category</h2>
            <div className="mt-1 text-sm font-medium text-slate-500">Current Month</div>
          </div>
          
          <div className="p-6 space-y-6">
            {categoryLoading ? (
              <LoadingUI />
            ) : categoryError ? (
              <ErrorUI message="Failed to load category data" />
            ) : !categoryStats || categoryStats.length === 0 ? (
              <div className="py-4 text-center text-slate-500">
                No category data available
              </div>
            ) : (
              <>
                {categoryStats.map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="capitalize font-medium">{category.category}</span>
                      <span className="text-slate-600">{category.visited}/{category.total} branches</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
                      <div 
                        className={`h-full ${getProgressColorClass(category.coverage)} rounded-full transition-all duration-500 ease-in-out`} 
                        style={{ width: `${category.coverage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        
        {/* Monthly Trend and Top Performers */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Monthly Trend</h2>
          </div>
          
          <div className="px-6 pt-6">
            {trendsLoading ? (
              <div className="flex justify-center py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : trendsError ? (
              <div className="py-4 text-center text-slate-500">
                Failed to load trend data
              </div>
            ) : !monthlyTrends || monthlyTrends.length === 0 ? (
              <div className="py-4 text-center text-slate-500">
                No trend data available
              </div>
            ) : (
              <div className="space-y-4">
                {monthlyTrends.map((month, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-28 text-slate-600">{month.month}</div>
                    <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full ${
                          month.branchCoverage >= 75 ? "bg-green-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${month.branchCoverage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-6 border-t mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Top Performers</h3>
              <span className="text-xs font-medium bg-slate-100 rounded px-2 py-1">This Month</span>
            </div>
            
            {performersLoading ? (
              <div className="flex justify-center py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : performersError ? (
              <div className="py-4 text-center text-slate-500">
                Failed to load performer data
              </div>
            ) : !topPerformers || topPerformers.length === 0 ? (
              <div className="py-4 text-center text-slate-500">
                No performer data available
              </div>
            ) : (
              <div className="space-y-3">
                {topPerformers.map((performer, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      {`${performer.e_code || 'BHR'} - ${performer.name}`}
                    </span>
                    <span className="px-2 py-0.5 text-sm rounded bg-green-50 text-green-700">
                      {performer.reports} reports
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CHDashboard;
