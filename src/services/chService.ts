import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export async function fetchDashboardStats(userId: string) {
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

    return {
      totalBranches: totalBranches || 0,
      totalBHRs: totalBHRs || 0,
      visitStats,
      monthlyStats,
      visitedBranches: uniqueVisitedBranches.size || 0,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw error;
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
