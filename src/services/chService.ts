
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";

type BranchVisit = Database['public']['Tables']['branch_visits']['Row'];
type Branch = Database['public']['Tables']['branches']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface BranchCategoryStats {
  category: string;
  total: number;
  visited: number;
  coverage: number;
}

export interface MonthlyStats {
  month: string;
  branchCoverage: number;
  participationRate?: number;
}

export interface BHRPerformance {
  id: string;
  name: string;
  coverage: number;
  reports: number;
  e_code?: string;
}

interface DashboardStats {
  totalBranches: number;
  visitedBranches: number;
  coverage: number;
  activeBHRs: number;
  avgCoverage: number;
  attritionRate: number;
  manningPercentage: number;
  erPercentage: number;
  vsLastMonth: {
    coverage: number;
    avgCoverage: number;
    attritionRate: number;
    manningPercentage: number;
    erPercentage: number;
  };
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  try {
    console.log("Fetching dashboard stats...");
    
    // Get total branches
    const { count: totalBranches, error: branchError } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true });

    if (branchError) {
      console.error("Error fetching branches:", branchError);
      throw branchError;
    }

    console.log("Total branches:", totalBranches);

    // Get all branch visits with status 'submitted' or 'approved'
    const { data: allVisits, error: visitsError } = await supabase
      .from('branch_visits')
      .select('branch_id, visit_date, manning_percentage, attrition_percentage, er_percentage, status')
      .in('status', ['submitted', 'approved']);

    if (visitsError) {
      console.error("Error fetching visits:", visitsError);
      throw visitsError;
    }

    console.log("All visits:", allVisits);

    // Handle case where no visits are found
    if (!allVisits || allVisits.length === 0) {
      console.log("No visits found");
      return {
        totalBranches: totalBranches || 0,
        visitedBranches: 0,
        coverage: 0,
        activeBHRs: 0,
        avgCoverage: 0,
        attritionRate: 0,
        manningPercentage: 0,
        erPercentage: 0,
        vsLastMonth: {
          coverage: 0,
          avgCoverage: 0,
          attritionRate: 0,
          manningPercentage: 0,
          erPercentage: 0
        }
      };
    }

    // Count unique visited branches
    const visitedBranchIds = new Set(allVisits.map(v => v.branch_id));
    const visitedBranchesCount = visitedBranchIds.size;
    console.log("Visited branches count:", visitedBranchesCount);

    // Get active BHRs (those with a submitted or approved visit)
    const { data: activeBhrs, error: activeBhrsError } = await supabase
      .from('branch_visits')
      .select('user_id')
      .in('status', ['submitted', 'approved']);
      
    if (activeBhrsError) {
      console.error("Error fetching active BHRs:", activeBhrsError);
      throw activeBhrsError;
    }

    // Count unique BHR IDs
    const uniqueBhrIds = new Set((activeBhrs || []).map(v => v.user_id));
    console.log("Active BHRs count:", uniqueBhrIds.size);

    // Get recent visits for metrics (within last 30 days)
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    
    const { data: recentVisits, error: recentError } = await supabase
      .from('branch_visits')
      .select('*')
      .gte('visit_date', lastMonthDate.toISOString())
      .in('status', ['submitted', 'approved']);

    if (recentError) {
      console.error("Error fetching recent visits:", recentError);
      throw recentError;
    }

    const currentVisits = recentVisits || [];
    console.log("Recent visits count:", currentVisits.length);
    
    // Get data for previous month (30-60 days ago) to compare
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    
    const { data: previousVisits, error: previousError } = await supabase
      .from('branch_visits')
      .select('branch_id, manning_percentage, attrition_percentage, er_percentage')
      .gte('visit_date', twoMonthsAgo.toISOString())
      .lt('visit_date', lastMonthDate.toISOString())
      .in('status', ['submitted', 'approved']);
    
    if (previousError) {
      console.error("Error fetching previous visits:", previousError);
      throw previousError;
    }

    // Calculate current month averages
    const manningSum = currentVisits.reduce((sum, visit) => {
      return sum + (typeof visit.manning_percentage === 'number' ? visit.manning_percentage : 0);
    }, 0);
    
    const attritionSum = currentVisits.reduce((sum, visit) => {
      return sum + (typeof visit.attrition_percentage === 'number' ? visit.attrition_percentage : 0);
    }, 0);
    
    const erSum = currentVisits.reduce((sum, visit) => {
      return sum + (typeof visit.er_percentage === 'number' ? visit.er_percentage : 0);
    }, 0);
    
    const visitCount = currentVisits.length || 1; // Avoid division by zero
    
    // Calculate previous month averages
    const prevVisits = previousVisits || [];
    const prevVisitCount = prevVisits.length || 1;
    
    const prevManningSum = prevVisits.reduce((sum, visit) => {
      return sum + (typeof visit.manning_percentage === 'number' ? visit.manning_percentage : 0);
    }, 0);
    
    const prevAttritionSum = prevVisits.reduce((sum, visit) => {
      return sum + (typeof visit.attrition_percentage === 'number' ? visit.attrition_percentage : 0);
    }, 0);
    
    const prevErSum = prevVisits.reduce((sum, visit) => {
      return sum + (typeof visit.er_percentage === 'number' ? visit.er_percentage : 0);
    }, 0);

    // Calculate month-over-month changes
    const prevManningAvg = Math.round(prevManningSum / prevVisitCount);
    const prevAttritionAvg = Math.round(prevAttritionSum / prevVisitCount);
    const prevErAvg = Math.round(prevErSum / prevVisitCount);
    
    // Get previous month unique branch visits
    const prevVisitedBranchIds = new Set(prevVisits.map(v => v.branch_id));
    const prevCoverage = totalBranches ? Math.round((prevVisitedBranchIds.size / totalBranches) * 100) : 0;
    
    const currentManningAvg = Math.round(manningSum / visitCount);
    const currentAttritionAvg = Math.round(attritionSum / visitCount);
    const currentErAvg = Math.round(erSum / visitCount);
    const currentCoverage = totalBranches ? Math.round((visitedBranchesCount / totalBranches) * 100) : 0;
    
    // Calculate percentage changes
    const coverageChange = currentCoverage - prevCoverage;
    const manningChange = currentManningAvg - prevManningAvg;
    const attritionChange = currentAttritionAvg - prevAttritionAvg;
    const erChange = currentErAvg - prevErAvg;

    console.log("Stats calculation complete");
    console.log({
      totalBranches,
      visitedBranchesCount,
      currentCoverage,
      uniqueBhrIds: uniqueBhrIds.size,
      currentManningAvg,
      currentAttritionAvg,
      currentErAvg
    });

    return {
      totalBranches: totalBranches || 0,
      visitedBranches: visitedBranchesCount,
      coverage: currentCoverage,
      activeBHRs: uniqueBhrIds.size,
      avgCoverage: currentCoverage,
      attritionRate: currentAttritionAvg,
      manningPercentage: currentManningAvg,
      erPercentage: currentErAvg,
      vsLastMonth: {
        coverage: coverageChange,
        avgCoverage: coverageChange,
        attritionRate: attritionChange,
        manningPercentage: manningChange,
        erPercentage: erChange
      }
    };
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error);
    toast({
      variant: "destructive",
      title: "Error loading dashboard statistics",
      description: error.message || "An unexpected error occurred"
    });
    
    // Return default values on error so the UI doesn't break
    return {
      totalBranches: 0,
      visitedBranches: 0,
      coverage: 0,
      activeBHRs: 0,
      avgCoverage: 0,
      attritionRate: 0,
      manningPercentage: 0,
      erPercentage: 0,
      vsLastMonth: {
        coverage: 0,
        avgCoverage: 0,
        attritionRate: 0,
        manningPercentage: 0,
        erPercentage: 0
      }
    };
  }
}

export async function fetchBranchCategoryStats(): Promise<BranchCategoryStats[]> {
  try {
    console.log("Fetching branch category stats...");
    
    // Get all branches with their categories
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('id, category');
    
    if (branchError) {
      console.error("Error fetching branches by category:", branchError);
      throw branchError;
    }

    if (!branches || branches.length === 0) {
      console.log("No branches found");
      return [];
    }

    console.log(`Found ${branches.length} branches`);

    // Get all submitted or approved branch visits
    const { data: visits, error: visitError } = await supabase
      .from('branch_visits')
      .select('branch_id')
      .in('status', ['submitted', 'approved']);
    
    if (visitError) {
      console.error("Error fetching branch visits:", visitError);
      throw visitError;
    }

    console.log(`Found ${visits ? visits.length : 0} branch visits`);

    // Create a set of visited branch IDs for quick lookup
    const visitedBranchIds = new Set((visits || []).map(visit => visit.branch_id));

    // Count by category
    const categoryStats: Record<string, { total: number, visited: number }> = {
      'platinum': { total: 0, visited: 0 },
      'diamond': { total: 0, visited: 0 },
      'gold': { total: 0, visited: 0 },
      'silver': { total: 0, visited: 0 },
      'bronze': { total: 0, visited: 0 }
    };

    branches.forEach(branch => {
      if (!branch.category) return;
      
      const category = branch.category.toLowerCase();
      if (categoryStats[category]) {
        categoryStats[category].total++;
        if (visitedBranchIds.has(branch.id)) {
          categoryStats[category].visited++;
        }
      }
    });

    console.log("Category stats:", categoryStats);

    // Format the results
    return Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      total: stats.total,
      visited: stats.visited,
      coverage: stats.total > 0 ? Math.round((stats.visited / stats.total) * 100) : 0
    }));
  } catch (error: any) {
    console.error("Error fetching branch category stats:", error);
    toast({
      variant: "destructive",
      title: "Error loading category statistics",
      description: error.message || "An unexpected error occurred"
    });
    return [];
  }
}

export async function fetchMonthlyTrends(): Promise<MonthlyStats[]> {
  try {
    console.log("Fetching monthly trends...");
    
    // Get visits for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1); // Start from first day of that month
    
    const { data: visits, error: visitError } = await supabase
      .from('branch_visits')
      .select('branch_id, visit_date, total_employees_invited, total_participants')
      .gte('visit_date', sixMonthsAgo.toISOString())
      .in('status', ['submitted', 'approved'])
      .order('visit_date', { ascending: false });
    
    if (visitError) {
      console.error("Error fetching monthly visits:", visitError);
      throw visitError;
    }
    
    if (!visits || visits.length === 0) {
      console.log("No monthly visit data found");
      // Return empty data with month names as fallback
      const monthNames = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        monthNames.unshift(d.toLocaleString('default', { month: 'long' }));
      }
      return monthNames.map(month => ({
        month,
        branchCoverage: 0,
        participationRate: 0
      }));
    }
    
    console.log(`Found ${visits.length} visits for monthly trends`);
    
    // Get total branches count
    const { count: totalBranches, error: branchError } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true });
    
    if (branchError) {
      console.error("Error counting branches:", branchError);
      throw branchError;
    }
    
    console.log(`Total branches for monthly trends: ${totalBranches}`);
    
    // Group visits by month
    const visitsByMonth: Record<string, {
      branchIds: Set<string>;
      totalInvited: number;
      totalParticipated: number;
    }> = {};
    
    visits.forEach(visit => {
      if (!visit.visit_date) return;
      
      const visitDate = new Date(visit.visit_date);
      const monthKey = `${visitDate.getFullYear()}-${visitDate.getMonth() + 1}`;
      
      if (!visitsByMonth[monthKey]) {
        visitsByMonth[monthKey] = {
          branchIds: new Set(),
          totalInvited: 0,
          totalParticipated: 0
        };
      }
      
      visitsByMonth[monthKey].branchIds.add(visit.branch_id);
      
      // Add participation data if available
      if (typeof visit.total_employees_invited === 'number') {
        visitsByMonth[monthKey].totalInvited += visit.total_employees_invited;
      }
      
      if (typeof visit.total_participants === 'number') {
        visitsByMonth[monthKey].totalParticipated += visit.total_participants;
      }
    });
    
    console.log("Visits by month:", Object.keys(visitsByMonth));
    
    // Format the results
    const monthlyData: MonthlyStats[] = [];
    
    // Get last 6 month names
    const months = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const monthName = d.toLocaleString('default', { month: 'long' });
      
      months.unshift({
        key: monthKey,
        name: monthName
      });
    }
    
    months.forEach(({ key, name }) => {
      const monthData = visitsByMonth[key];
      
      if (monthData) {
        const branchCoverage = totalBranches ? 
          Math.round((monthData.branchIds.size / totalBranches) * 100) : 0;
          
        const participationRate = monthData.totalInvited > 0 ? 
          Math.round((monthData.totalParticipated / monthData.totalInvited) * 100) : 0;
          
        monthlyData.push({
          month: name,
          branchCoverage,
          participationRate
        });
      } else {
        // No data for this month
        monthlyData.push({
          month: name,
          branchCoverage: 0,
          participationRate: 0
        });
      }
    });
    
    console.log("Monthly data processed:", monthlyData);
    return monthlyData;
  } catch (error: any) {
    console.error("Error fetching monthly trends:", error);
    toast({
      variant: "destructive",
      title: "Error loading monthly trends",
      description: error.message || "An unexpected error occurred"
    });
    
    // Return empty data with month names as fallback
    const monthNames = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthNames.unshift(d.toLocaleString('default', { month: 'long' }));
    }
    return monthNames.map(month => ({
      month,
      branchCoverage: 0
    }));
  }
}

export async function fetchTopPerformers(): Promise<BHRPerformance[]> {
  try {
    console.log("Fetching top performers...");
    
    // Get all BHRs
    const { data: bhrs, error: bhrError } = await supabase
      .from('profiles')
      .select('id, full_name, e_code')
      .eq('role', 'BH');
    
    if (bhrError) {
      console.error("Error fetching BHRs:", bhrError);
      throw bhrError;
    }
    
    if (!bhrs || bhrs.length === 0) {
      console.log("No BHRs found");
      return [];
    }

    console.log(`Found ${bhrs.length} BHRs`);

    // Get branch assignments
    const { data: assignments, error: assignmentError } = await supabase
      .from('branch_assignments')
      .select('user_id, branch_id');
    
    if (assignmentError) {
      console.error("Error fetching branch assignments:", assignmentError);
      throw assignmentError;
    }

    console.log(`Found ${assignments ? assignments.length : 0} branch assignments`);

    // Get branch visits for the current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data: visits, error: visitError } = await supabase
      .from('branch_visits')
      .select('user_id, branch_id')
      .gte('visit_date', startOfMonth.toISOString())
      .in('status', ['submitted', 'approved']);
    
    if (visitError) {
      console.error("Error fetching visits for top performers:", visitError);
      throw visitError;
    }

    console.log(`Found ${visits ? visits.length : 0} visits for top performers`);

    // Group assignments by BHR
    const bhrAssignments: Record<string, Set<string>> = {};
    (assignments || []).forEach(assignment => {
      if (!assignment.user_id) return;
      
      if (!bhrAssignments[assignment.user_id]) {
        bhrAssignments[assignment.user_id] = new Set();
      }
      if (assignment.branch_id) {
        bhrAssignments[assignment.user_id].add(assignment.branch_id);
      }
    });

    // Count visits by BHR
    const bhrVisits: Record<string, Set<string>> = {};
    (visits || []).forEach(visit => {
      if (!visit.user_id) return;
      
      if (!bhrVisits[visit.user_id]) {
        bhrVisits[visit.user_id] = new Set();
      }
      if (visit.branch_id) {
        bhrVisits[visit.user_id].add(visit.branch_id);
      }
    });

    // Calculate coverage and reports for each BHR
    const performers = bhrs.map(bhr => {
      const assignedBranches = bhrAssignments[bhr.id] || new Set();
      const visitedBranches = bhrVisits[bhr.id] || new Set();
      
      return {
        id: bhr.id,
        name: bhr.full_name || 'Unknown BHR',
        e_code: bhr.e_code,
        reports: visitedBranches.size,
        coverage: assignedBranches.size > 0 
          ? Math.round((visitedBranches.size / assignedBranches.size) * 100) 
          : 0
      };
    });

    console.log("Top performers calculated:", performers);

    // Sort by number of reports first
    return performers.sort((a, b) => {
      if (b.reports !== a.reports) return b.reports - a.reports;
      return b.coverage - a.coverage;
    }).slice(0, 3); // Return top 3
  } catch (error: any) {
    console.error("Error fetching top performers:", error);
    toast({
      variant: "destructive",
      title: "Error loading top performers",
      description: error.message || "An unexpected error occurred"
    });
    return [];
  }
}

// Update the analytics data fetching to use real database data
export async function fetchAnalyticsData(month?: string, year?: string) {
  try {
    console.log("Fetching analytics data...");
    const currentDate = new Date();
    const selectedYear = year ? parseInt(year) : currentDate.getFullYear();
    const selectedMonth = month ? 
      MONTHS.indexOf(month) : 
      currentDate.getMonth();
    
    if (selectedMonth === -1) {
      throw new Error("Invalid month selected");
    }
    
    // Create date range for the selected month
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);
    
    // Create date range for previous month
    const prevStartDate = new Date(selectedYear, selectedMonth - 1, 1);
    const prevEndDate = new Date(selectedYear, selectedMonth, 0);
    
    // Get branches count
    const { count: totalBranches, error: branchError } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true });
    
    if (branchError) throw branchError;
    
    // Get current month visits
    const { data: currentVisits, error: currentError } = await supabase
      .from('branch_visits')
      .select(`
        branch_id, 
        visit_date, 
        manning_percentage,
        attrition_percentage,
        er_percentage,
        non_vendor_percentage,
        total_employees_invited,
        total_participants,
        new_employees_total,
        new_employees_covered,
        cwt_cases
      `)
      .gte('visit_date', startDate.toISOString())
      .lte('visit_date', endDate.toISOString())
      .in('status', ['submitted', 'approved']);
    
    if (currentError) throw currentError;
    
    // Get previous month visits
    const { data: prevVisits, error: prevError } = await supabase
      .from('branch_visits')
      .select(`
        branch_id, 
        manning_percentage,
        attrition_percentage,
        er_percentage
      `)
      .gte('visit_date', prevStartDate.toISOString())
      .lte('visit_date', prevEndDate.toISOString())
      .in('status', ['submitted', 'approved']);
    
    if (prevError) throw prevError;
    
    // Get active BHRs for this month
    const { data: activeBhrs, error: bhrError } = await supabase
      .from('branch_visits')
      .select('user_id')
      .gte('visit_date', startDate.toISOString())
      .lte('visit_date', endDate.toISOString())
      .in('status', ['submitted', 'approved']);
    
    if (bhrError) throw bhrError;
    
    // Get total BHRs
    const { count: totalBHRs, error: totalBHRError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'BH');
    
    if (totalBHRError) throw totalBHRError;
    
    // Count unique visited branches and calculate metrics
    const visits = currentVisits || [];
    const visitedBranchIds = new Set(visits.map(v => v.branch_id));
    const visitedCount = visitedBranchIds.size;
    const coverage = totalBranches ? Math.round((visitedCount / totalBranches) * 100) : 0;
    
    // Count unique active BHRs
    const uniqueActiveBHRs = new Set((activeBhrs || []).map(bhr => bhr.user_id));
    const activeBHRsCount = uniqueActiveBHRs.size;
    
    // Calculate participation rate
    const totalInvited = visits.reduce((sum, v) => sum + (v.total_employees_invited || 0), 0);
    const totalParticipated = visits.reduce((sum, v) => sum + (v.total_participants || 0), 0);
    const participationRate = totalInvited > 0 ? Math.round((totalParticipated / totalInvited) * 100) : 0;
    
    // Calculate averages for current month
    const visitCount = visits.length || 1; // Avoid division by zero
    const manningSum = visits.reduce((sum, v) => sum + (v.manning_percentage || 0), 0);
    const attritionSum = visits.reduce((sum, v) => sum + (v.attrition_percentage || 0), 0);
    const nonVendorSum = visits.reduce((sum, v) => sum + (v.non_vendor_percentage || 0), 0);
    
    // New employee coverage
    const newEmployeesTotal = visits.reduce((sum, v) => sum + (v.new_employees_total || 0), 0);
    const newEmployeesCovered = visits.reduce((sum, v) => sum + (v.new_employees_covered || 0), 0);
    const newEmployeeCoverage = newEmployeesTotal > 0 ? 
      Math.round((newEmployeesCovered / newEmployeesTotal) * 100) : 0;
    
    // Calculate averages for previous month
    const prevVisitCount = (prevVisits || []).length || 1;
    const prevManningSum = (prevVisits || []).reduce((sum, v) => sum + (v.manning_percentage || 0), 0);
    const prevAttritionSum = (prevVisits || []).reduce((sum, v) => sum + (v.attrition_percentage || 0), 0);
    const prevBranchIds = new Set((prevVisits || []).map(v => v.branch_id));
    const prevCoverage = totalBranches ? Math.round((prevBranchIds.size / totalBranches) * 100) : 0;
    
    // Calculate month-over-month changes
    const coverageChange = coverage - prevCoverage;
    const attritionChange = 
      Math.round(attritionSum / visitCount) - 
      Math.round(prevAttritionSum / prevVisitCount);
    
    // Source mix calculation (simulation since we don't have real source data)
    // In a real implementation, you would query the actual source data
    const sourceMixData = [
      { name: 'Direct', value: 45 },
      { name: 'Referral', value: 30 },
      { name: 'Agency', value: 25 }
    ];
    
    // Get top performers data
    // For simplicity, we'll reuse the fetchTopPerformers function
    const topPerformers = await fetchTopPerformers();
    const topBHR = topPerformers.length > 0 ? topPerformers[0] : null;
    
    // Calculate top category by coverage
    const { data: categoryData } = await fetchCategoryBreakdown();
    const topCategory = categoryData && categoryData.length > 0 ? 
      categoryData.reduce((prev, current) => 
        prev.coverage > current.coverage ? prev : current
      ) : null;
    
    return {
      branchVisitCoverage: coverage,
      employeeParticipation: participationRate,
      activeBHRs: { 
        active: activeBHRsCount, 
        total: totalBHRs || 0 
      },
      attritionRate: Math.round(attritionSum / visitCount),
      vsLastMonth: {
        branchVisitCoverage: coverageChange,
        employeeParticipation: 0, // No previous month data for this metric
        attritionRate: attritionChange
      },
      hrParameters: {
        manningPercentage: Math.round(manningSum / visitCount),
        nonVendorPercentage: Math.round(nonVendorSum / visitCount),
        employeeCoverage: participationRate,
        newEmployeeCoverage: newEmployeeCoverage
      },
      performanceIndicators: {
        avgAttrition: Math.round(attritionSum / visitCount),
        cwtCases: visits.reduce((sum, v) => sum + (v.cwt_cases || 0), 0)
      },
      sourceMix: sourceMixData,
      topPerformers: {
        bhr: topBHR ? { name: topBHR.name, coverage: topBHR.coverage } : { name: 'N/A', coverage: 0 },
        category: topCategory ? { name: topCategory.name, rate: topCategory.coverage } : { name: 'N/A', coverage: 0 },
        location: { name: 'Mumbai', coverage: 94 }, // Would need location-specific queries
        mostImproved: { name: 'Silver Category', improvement: 15 } // Would need historical data comparison
      }
    };
  } catch (error: any) {
    console.error("Error fetching analytics data:", error);
    toast({
      variant: "destructive",
      title: "Error loading analytics data",
      description: error.message || "An unexpected error occurred"
    });
    
    // Return default data structure with zeros
    return {
      branchVisitCoverage: 0,
      employeeParticipation: 0,
      activeBHRs: { active: 0, total: 0 },
      attritionRate: 0,
      vsLastMonth: {
        branchVisitCoverage: 0,
        employeeParticipation: 0,
        attritionRate: 0
      },
      hrParameters: {
        manningPercentage: 0,
        nonVendorPercentage: 0,
        employeeCoverage: 0,
        newEmployeeCoverage: 0
      },
      performanceIndicators: {
        avgAttrition: 0,
        cwtCases: 0
      },
      sourceMix: [
        { name: 'Direct', value: 0 },
        { name: 'Referral', value: 0 },
        { name: 'Agency', value: 0 }
      ],
      topPerformers: {
        bhr: { name: 'N/A', coverage: 0 },
        category: { name: 'N/A', rate: 0 },
        location: { name: 'N/A', coverage: 0 },
        mostImproved: { name: 'N/A', improvement: 0 }
      }
    };
  }
}

// Months array for date calculations
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export async function fetchCategoryBreakdown() {
  try {
    console.log("Fetching category breakdown...");
    
    // Get all branches with categories
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('id, category');
    
    if (branchError) throw branchError;
    
    if (!branches || branches.length === 0) {
      return [];
    }
    
    // Get all branch visits
    const { data: visits, error: visitError } = await supabase
      .from('branch_visits')
      .select('branch_id')
      .in('status', ['submitted', 'approved']);
    
    if (visitError) throw visitError;
    
    // Create a set of visited branch IDs
    const visitedBranchIds = new Set((visits || []).map(v => v.branch_id));
    
    // Count branches and visited branches by category
    const categoryCounts: Record<string, { branches: number, visited: number }> = {};
    
    branches.forEach(branch => {
      if (!branch.category) return;
      
      const category = branch.category.charAt(0).toUpperCase() + branch.category.slice(1);
      
      if (!categoryCounts[category]) {
        categoryCounts[category] = { branches: 0, visited: 0 };
      }
      
      categoryCounts[category].branches++;
      if (visitedBranchIds.has(branch.id)) {
        categoryCounts[category].visited++;
      }
    });
    
    // Format the results
    return Object.entries(categoryCounts).map(([name, data]) => ({
      name,
      branches: data.branches,
      coverage: data.branches > 0 ? Math.round((data.visited / data.branches) * 100) : 0
    }));
  } catch (error: any) {
    console.error("Error fetching category breakdown:", error);
    toast({
      variant: "destructive",
      title: "Error loading category data",
      description: error.message || "An unexpected error occurred"
    });
    
    // Return empty array on error
    return [];
  }
}

export async function generateReportData(month?: string, year?: string) {
  try {
    console.log("Generating report data...");
    const currentDate = new Date();
    const selectedYear = year ? parseInt(year) : currentDate.getFullYear();
    const selectedMonth = month ? 
      MONTHS.indexOf(month) : 
      currentDate.getMonth();
    
    if (selectedMonth === -1) {
      throw new Error("Invalid month selected");
    }
    
    // Create date range for the selected month
    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0);
    
    console.log(`Report period: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Get branches count
    const { count: totalBranches, error: branchError } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true });
    
    if (branchError) throw branchError;
    
    // Get branch visits for the selected month
    const { data: visits, error: visitError } = await supabase
      .from('branch_visits')
      .select(`
        id, 
        branch_id,
        user_id,
        visit_date,
        total_employees_invited,
        total_participants,
        profiles:user_id(full_name)
      `)
      .gte('visit_date', startDate.toISOString())
      .lte('visit_date', endDate.toISOString())
      .in('status', ['submitted', 'approved']);
    
    if (visitError) throw visitError;
    
    console.log(`Found ${visits ? visits.length : 0} visits for reporting period`);
    
    if (!visits || visits.length === 0) {
      return {
        totalBranchVisits: 0,
        coveragePercentage: 0,
        avgParticipation: 0,
        topPerformer: "No data",
        categoryBreakdown: []
      };
    }
    
    // Count unique visited branches
    const visitedBranchIds = new Set(visits.map(v => v.branch_id));
    const totalVisits = visits.length;
    const coveragePercentage = totalBranches ? 
      Math.round((visitedBranchIds.size / totalBranches) * 100) : 0;
    
    // Calculate participation rate
    const totalInvited = visits.reduce((sum, v) => sum + (v.total_employees_invited || 0), 0);
    const totalParticipated = visits.reduce((sum, v) => sum + (v.total_participants || 0), 0);
    const avgParticipation = totalInvited > 0 ? 
      Math.round((totalParticipated / totalInvited) * 100) : 0;
    
    // Find top performer (BHR with most visits)
    const bhrVisitCounts: Record<string, { name: string, count: number }> = {};
    
    visits.forEach(visit => {
      const userId = visit.user_id;
      if (!userId) return;
      
      if (!bhrVisitCounts[userId]) {
        // Extract BH name safely
        let name = 'Unknown';
        if (visit.profiles && typeof visit.profiles === 'object' && visit.profiles !== null) {
          const profileObj = visit.profiles as { full_name?: string };
          if (profileObj && typeof profileObj.full_name === 'string') {
            name = profileObj.full_name;
          }
        }
        
        bhrVisitCounts[userId] = { name, count: 0 };
      }
      
      bhrVisitCounts[userId].count++;
    });
    
    const topPerformer = Object.values(bhrVisitCounts).reduce(
      (top, current) => current.count > top.count ? current : top,
      { name: "No data", count: 0 }
    ).name;
    
    // Get category breakdown
    const categoryBreakdown = await fetchCategoryBreakdown();
    
    return {
      totalBranchVisits: totalVisits,
      coveragePercentage,
      avgParticipation,
      topPerformer,
      categoryBreakdown
    };
  } catch (error: any) {
    console.error("Error generating report data:", error);
    toast({
      variant: "destructive",
      title: "Error generating report",
      description: error.message || "An unexpected error occurred"
    });
    
    return {
      totalBranchVisits: 0,
      coveragePercentage: 0,
      avgParticipation: 0,
      topPerformer: "Error loading data",
      categoryBreakdown: []
    };
  }
}
