
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export async function fetchDashboardStats() {
  try {
    // Count total branches
    const { count: totalBranches, error: branchError } = await supabase
      .from('branches')
      .select('id', { count: 'exact', head: true });

    if (branchError) throw branchError;

    // Count total BHRs
    const { count: totalBHRs, error: bhrError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'BH');

    if (bhrError) throw bhrError;

    // Get visits stats
    const { data: visits, error: visitsError } = await supabase
      .from('branch_visits')
      .select(`
        id,
        visit_date,
        status,
        branch_id
      `);

    if (visitsError) throw visitsError;

    // Calculate visit stats
    const visitStats = {
      totalVisits: visits?.length || 0,
      pendingApproval: visits?.filter(v => v.status === 'submitted').length || 0,
      completedVisits: visits?.filter(v => v.status === 'approved').length || 0,
    };

    // Get current month stats
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthVisits = visits?.filter(v => {
      const visitDate = new Date(v.visit_date);
      return visitDate.getMonth() === currentMonth && 
             visitDate.getFullYear() === currentYear;
    });

    const monthlyStats = {
      totalVisits: currentMonthVisits?.length || 0,
      pendingApproval: currentMonthVisits?.filter(v => v.status === 'submitted').length || 0,
      completedVisits: currentMonthVisits?.filter(v => v.status === 'approved').length || 0,
    };

    // Count unique visited branches
    const uniqueVisitedBranches = new Set((visits || []).map(visit => visit.branch_id));

    // Calculate coverage percentage
    const coverage = totalBranches ? (uniqueVisitedBranches.size / totalBranches) * 100 : 0;
    
    // Count active BHRs (those who submitted at least one report in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: activeBhrs, error: activeBhrsError } = await supabase
      .from('branch_visits')
      .select('user_id')
      .gte('visit_date', thirtyDaysAgo.toISOString());
    
    if (activeBhrsError) throw activeBhrsError;
    
    const uniqueActiveBhrs = new Set((activeBhrs || []).map(bhr => bhr.user_id));
    
    // Generate random values for additional stats to match the expected structure
    // In a real application, these would be calculated from actual data
    const lastMonthCoverage = coverage * 0.9; // 90% of current coverage for demo
    
    return {
      totalBranches: totalBranches || 0,
      totalBHRs: totalBHRs || 0,
      visitStats,
      monthlyStats,
      visitedBranches: uniqueVisitedBranches.size || 0,
      coverage: parseFloat(coverage.toFixed(2)),
      activeBHRs: uniqueActiveBhrs.size || 0,
      avgCoverage: parseFloat((coverage * 0.8).toFixed(2)),
      attritionRate: 5.2,
      manningPercentage: 92.5,
      erPercentage: 84.3,
      vsLastMonth: {
        coverage: parseFloat(((coverage - lastMonthCoverage) / lastMonthCoverage * 100).toFixed(1)),
        avgCoverage: 2.3,
        attritionRate: -1.2,
        manningPercentage: 1.5,
        erPercentage: 0.8
      }
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw error;
  }
}

export async function fetchBranchCategoryStats() {
  try {
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, category');
    
    if (branchesError) throw branchesError;
    
    const { data: visits, error: visitsError } = await supabase
      .from('branch_visits')
      .select('branch_id');
    
    if (visitsError) throw visitsError;
    
    // Create a set of visited branch IDs for quick lookup
    const visitedBranchIds = new Set((visits || []).map(visit => visit.branch_id));
    
    // Group branches by category
    const categoryMap: Record<string, { total: number, visited: number }> = {};
    
    (branches || []).forEach(branch => {
      const category = branch.category || 'uncategorized';
      
      if (!categoryMap[category]) {
        categoryMap[category] = { total: 0, visited: 0 };
      }
      
      categoryMap[category].total += 1;
      if (visitedBranchIds.has(branch.id)) {
        categoryMap[category].visited += 1;
      }
    });
    
    // Convert to array and calculate coverage percentages
    return Object.entries(categoryMap).map(([category, stats]) => ({
      category,
      total: stats.total,
      visited: stats.visited,
      coverage: stats.total > 0 ? parseFloat(((stats.visited / stats.total) * 100).toFixed(2)) : 0
    }));
  } catch (error) {
    console.error("Error fetching branch category stats:", error);
    return [];
  }
}

export async function fetchMonthlyTrends() {
  try {
    // Get the last 6 months
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now);
      month.setMonth(now.getMonth() - i);
      months.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        startDate: new Date(month.getFullYear(), month.getMonth(), 1),
        endDate: new Date(month.getFullYear(), month.getMonth() + 1, 0)
      });
    }
    
    // Get all branches for coverage calculations
    const { count: totalBranches, error: branchError } = await supabase
      .from('branches')
      .select('id', { count: 'exact', head: true });
      
    if (branchError) throw branchError;
    
    // Get all visits
    const { data: allVisits, error: visitsError } = await supabase
      .from('branch_visits')
      .select('branch_id, visit_date');
      
    if (visitsError) throw visitsError;
    
    // Calculate monthly coverage
    return months.map(monthData => {
      const monthVisits = (allVisits || []).filter(visit => {
        const visitDate = new Date(visit.visit_date);
        return visitDate >= monthData.startDate && visitDate <= monthData.endDate;
      });
      
      const visitedBranchIds = new Set(monthVisits.map(visit => visit.branch_id));
      const branchCoverage = totalBranches ? 
        parseFloat(((visitedBranchIds.size / totalBranches) * 100).toFixed(2)) : 0;
      
      return {
        month: monthData.month,
        branchCoverage
      };
    });
  } catch (error) {
    console.error("Error fetching monthly trends:", error);
    return [];
  }
}

export async function fetchTopPerformers() {
  try {
    const { data, error } = await supabase
      .from('branch_visits')
      .select(`
        user_id,
        profiles:user_id(full_name, e_code)
      `)
      .order('visit_date', { ascending: false });
      
    if (error) throw error;
    
    // Count visits by user
    const userCounts: Record<string, {
      id: string;
      name: string;
      e_code?: string;
      reports: number;
    }> = {};
    
    (data || []).forEach(visit => {
      if (!visit.user_id) return;
      
      const userId = visit.user_id;
      
      // Extract name safely
      let name = 'Unknown';
      let e_code;
      
      if (visit.profiles && typeof visit.profiles === 'object' && visit.profiles !== null) {
        const profileObj = visit.profiles as { full_name?: string, e_code?: string };
        if (typeof profileObj.full_name === 'string') {
          name = profileObj.full_name;
        }
        if (typeof profileObj.e_code === 'string') {
          e_code = profileObj.e_code;
        }
      }
      
      if (!userCounts[userId]) {
        userCounts[userId] = { id: userId, name, e_code, reports: 0 };
      }
      
      userCounts[userId].reports++;
    });
    
    // Sort by reports count and take top 5
    return Object.values(userCounts)
      .sort((a, b) => b.reports - a.reports)
      .slice(0, 5);
  } catch (error) {
    console.error("Error fetching top performers:", error);
    return [];
  }
}

export async function fetchVisitStats() {
  try {
    const { data, error } = await supabase
      .from('branch_visits')
      .select('status');

    if (error) {
      console.error("Error fetching visit stats:", error);
      return { total: 0, approved: 0, submitted: 0 };
    }

    const total = data.length;
    const approved = data.filter(visit => visit.status === 'approved').length;
    const submitted = data.filter(visit => visit.status === 'submitted').length;

    return { total, approved, submitted };
  } catch (error) {
    console.error("Error processing visit stats:", error);
    return { total: 0, approved: 0, submitted: 0 };
  }
}

export async function fetchRecentActivity() {
  try {
    const { data, error } = await supabase
      .from('branch_visits')
      .select('id, visit_date, status, branch_id')
      .order('visit_date', { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching recent activity:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error processing recent activity:", error);
    return [];
  }
}

export async function generateReportData() {
  try {
    const branchCategories = ["platinum", "diamond", "gold", "silver", "bronze"];
    const reportData = branchCategories.map(category => {
      return {
        name: category.charAt(0).toUpperCase() + category.slice(1),
        branches: Math.floor(Math.random() * 50) + 10,
        coverage: Math.floor(Math.random() * 100)
      };
    });

    return reportData;
  } catch (error) {
    console.error("Error generating report data:", error);
    return [];
  }
}

export async function fetchCategoryBreakdown() {
  try {
    const { data: branches, error } = await supabase
      .from('branches')
      .select('category');
      
    if (error) throw error;
    
    // Count by category
    const categoryCounts: Record<string, number> = {};
    
    branches?.forEach(branch => {
      const category = branch.category || 'unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    // Convert to the format needed for the chart
    const chartData = Object.entries(categoryCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
    
    return chartData;
  } catch (error) {
    console.error("Error fetching category breakdown:", error);
    return [];
  }
}

export async function fetchLocationCoverage() {
  try {
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('location');

    if (branchError) {
      console.error("Error fetching branches:", branchError);
      return [];
    }

    const { data: visits, error: visitError } = await supabase
      .from('branch_visits')
      .select('branch_id');

    if (visitError) {
      console.error("Error fetching visits:", visitError);
      return [];
    }

    // Count branches per location
    const locationCounts: Record<string, number> = {};
    branches?.forEach(branch => {
      const location = branch.location || 'unknown';
      locationCounts[location] = (locationCounts[location] || 0) + 1;
    });

    // Count visited branches per location
    const visitedLocationCounts: Record<string, number> = {};
    visits?.forEach(visit => {
      const branch = branches?.find(b => b.id === visit.branch_id);
      if (branch) {
        const location = branch.location || 'unknown';
        visitedLocationCounts[location] = (visitedLocationCounts[location] || 0) + 1;
      }
    });

    // Combine the data
    const coverageData = Object.keys(locationCounts).map(location => {
      const totalBranches = locationCounts[location] || 0;
      const visitedBranches = visitedLocationCounts[location] || 0;
      const coveragePercentage = totalBranches > 0 ? (visitedBranches / totalBranches) * 100 : 0;

      return {
        location,
        totalBranches,
        visitedBranches,
        coveragePercentage: parseFloat(coveragePercentage.toFixed(2))
      };
    });

    return coverageData;
  } catch (error) {
    console.error("Error fetching location coverage:", error);
    return [];
  }
}
