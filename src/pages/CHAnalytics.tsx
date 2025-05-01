
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { addMonths, format, subMonths, startOfMonth, endOfMonth } from "date-fns";

const CHAnalytics = () => {
  const { toast } = useToast();
  const [filterPeriod, setFilterPeriod] = useState("month");
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalBranches: 0,
    totalVisitsCompleted: 0,
    coveragePercentage: 0,
    totalBHRs: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe"];

  useEffect(() => {
    fetchAnalyticsData();
  }, [filterPeriod]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    console.log("Fetching analytics data...");
    try {
      // Get current date and calculate start/end dates based on filter period
      const currentDate = new Date();
      let startDate: Date;
      let endDate = endOfMonth(currentDate);

      if (filterPeriod === "month") {
        startDate = startOfMonth(currentDate);
      } else if (filterPeriod === "quarter") {
        startDate = subMonths(startOfMonth(currentDate), 3);
      } else {
        startDate = subMonths(startOfMonth(currentDate), 12);
      }

      // Fetch total statistics from database
      await fetchTotalStats();
      
      // Fetch top performers
      await fetchTopPerformers(startDate, endDate);
      
      // Fetch category breakdown
      await fetchCategoryBreakdown(startDate, endDate);
      
      // Fetch monthly trend data (n-2 to n+2 months)
      await fetchMonthlyTrend();

    } catch (error) {
      console.error("Error fetching analytics data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load analytics data.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTotalStats = async () => {
    try {
      // Get total branches
      const { data: branches, error: branchesError } = await supabase
        .from("branches")
        .select("id");
      
      if (branchesError) throw branchesError;
      
      // Get total visits
      const { data: visits, error: visitsError } = await supabase
        .from("branch_visits")
        .select("id");
      
      if (visitsError) throw visitsError;
      
      // Get BHRs (users with role 'BH')
      const { data: bhrs, error: bhrsError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "BH");
      
      if (bhrsError) throw bhrsError;
      
      // Calculate stats
      const totalBranches = branches?.length || 0;
      const totalVisitsCompleted = visits?.length || 0;
      const coveragePercentage = totalBranches > 0 
        ? Math.round((totalVisitsCompleted / totalBranches) * 100) 
        : 0;
      const totalBHRs = bhrs?.length || 0;
      
      setTotalStats({
        totalBranches,
        totalVisitsCompleted,
        coveragePercentage,
        totalBHRs
      });
    } catch (error) {
      console.error("Error fetching total stats:", error);
    }
  };

  const fetchTopPerformers = async (startDate: Date, endDate: Date) => {
    try {
      console.log("Fetching top performers...");
      
      // Get BHRs with their visit counts
      const { data, error } = await supabase
        .from("branch_visits")
        .select(`
          user_id,
          profiles:user_id (
            full_name,
            location
          )
        `)
        .gte("visit_date", startDate.toISOString())
        .lte("visit_date", endDate.toISOString());
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        console.log("No BHRs found");
        setTopPerformers([]);
        return;
      }
      
      // Group by BHR and count visits
      const bhrVisits: Record<string, {
        userId: string, 
        name: string, 
        location: string, 
        visits: number
      }> = {};
      
      data.forEach(visit => {
        const userId = visit.user_id;
        const profileData = visit.profiles as { full_name?: string, location?: string } | null;
        
        if (userId && profileData) {
          if (!bhrVisits[userId]) {
            bhrVisits[userId] = {
              userId,
              name: profileData.full_name || "Unknown",
              location: profileData.location || "Unknown",
              visits: 1
            };
          } else {
            bhrVisits[userId].visits++;
          }
        }
      });
      
      // Convert to array and sort by visits
      const sortedPerformers = Object.values(bhrVisits)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5); // Top 5
      
      setTopPerformers(sortedPerformers);
    } catch (error) {
      console.error("Error fetching top performers:", error);
      setTopPerformers([]);
    }
  };

  const fetchCategoryBreakdown = async (startDate: Date, endDate: Date) => {
    try {
      console.log("Fetching category breakdown...");
      
      // Query to get branch visits with their branch categories
      const { data, error } = await supabase
        .from("branch_visits")
        .select(`
          branch_category
        `)
        .gte("visit_date", startDate.toISOString())
        .lte("visit_date", endDate.toISOString());
      
      if (error) throw error;
      
      // Count visits by category
      const categories: Record<string, number> = {
        platinum: 0,
        diamond: 0,
        gold: 0,
        silver: 0,
        bronze: 0
      };
      
      data?.forEach(visit => {
        const category = visit.branch_category?.toLowerCase();
        if (category && categories.hasOwnProperty(category)) {
          categories[category]++;
        }
      });
      
      // Format data for chart
      const formattedData = Object.entries(categories).map(([category, count]) => ({
        name: category.charAt(0).toUpperCase() + category.slice(1),
        value: count
      }));
      
      setCategoryBreakdown(formattedData);
    } catch (error) {
      console.error("Error fetching category breakdown:", error);
      setCategoryBreakdown([]);
    }
  };

  const fetchMonthlyTrend = async () => {
    try {
      const currentDate = new Date();
      
      // Calculate n-2 and n+2 months from current month
      const startDate = subMonths(startOfMonth(currentDate), 2);
      const endDate = addMonths(endOfMonth(currentDate), 2);
      
      // Generate all months in range
      const months = [];
      let currentMonth = new Date(startDate);
      
      while (currentMonth <= endDate) {
        months.push({
          monthStart: startOfMonth(currentMonth),
          monthEnd: endOfMonth(currentMonth),
          label: format(currentMonth, 'MMM yyyy')
        });
        currentMonth = addMonths(currentMonth, 1);
      }
      
      // Fetch visit data for each month
      const monthlyData = await Promise.all(months.map(async ({ monthStart, monthEnd, label }) => {
        const { data, error } = await supabase
          .from("branch_visits")
          .select("id")
          .gte("visit_date", monthStart.toISOString())
          .lte("visit_date", monthEnd.toISOString());
          
        if (error) throw error;
        
        return {
          name: label,
          visits: data?.length || 0,
          target: Math.round(Math.random() * 10) + 15 // Placeholder target
        };
      }));
      
      setMonthlyTrend(monthlyData);
    } catch (error) {
      console.error("Error fetching monthly trend:", error);
      setMonthlyTrend([]);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branch Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive analytics on branch visits and performance
          </p>
        </div>
        
        <div className="flex items-center mt-4 md:mt-0">
          <Select
            defaultValue={filterPeriod}
            onValueChange={(value) => setFilterPeriod(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Branches</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.totalBranches}</div>
                <p className="text-xs text-muted-foreground">
                  across all zones
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Visits Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.totalVisitsCompleted}</div>
                <p className="text-xs text-muted-foreground">
                  {filterPeriod === "month" ? "this month" : 
                   filterPeriod === "quarter" ? "this quarter" : "this year"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.coveragePercentage}%</div>
                <p className="text-xs text-muted-foreground">
                  of branches visited
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total BHRs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.totalBHRs}</div>
                <p className="text-xs text-muted-foreground">
                  assigned to branches
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Monthly Trend Chart */}
            <Card className="col-span-1 md:col-span-2">
              <CardHeader>
                <CardTitle>Monthly Visit Trend</CardTitle>
                <CardDescription>
                  Showing 5-month window: past 2 months, current month, and next 2 months
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyTrend}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="visits" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="target" stroke="#82ca9d" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performers</CardTitle>
                <CardDescription>
                  BHRs with most branch visits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {topPerformers.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topPerformers}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="visits" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Branch Category Breakdown</CardTitle>
                <CardDescription>
                  Visits by branch category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {categoryBreakdown.length === 0 || 
                   !categoryBreakdown.some(item => item.value > 0) ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} visits`, ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default CHAnalytics;
