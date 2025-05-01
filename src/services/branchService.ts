import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";

type Branch = Database["public"]["Tables"]["branches"]["Row"];
type BranchAssignment = Database["public"]["Tables"]["branch_assignments"]["Row"];
type BranchVisit = Database["public"]["Tables"]["branch_visits"]["Row"];

// Branches
export const fetchBranches = async (): Promise<Branch[]> => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error("Error fetching branches:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load branches: ${error.message}`,
      });
      return [];
    }
  };
  
  export const getBranchById = async (branchId: string): Promise<Branch | null> => {
    try {
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("id", branchId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error(`Error fetching branch ${branchId}:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load branch details: ${error.message}`,
      });
      return null;
    }
  };
  
  // Branch Assignments
  export const fetchUserBranchAssignments = async (userId: string): Promise<BranchAssignment[]> => {
    try {
      const { data, error } = await supabase
        .from("branch_assignments")
        .select("*, branches(*)")
        .eq("user_id", userId);
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error("Error fetching branch assignments:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load assigned branches: ${error.message}`,
      });
      return [];
    }
  };
  
  export const fetchAssignedBranchesWithDetails = async (userId: string): Promise<Branch[]> => {
    try {
      // Use fetchBranches to get all branches instead of filtering by assignments
      const branches = await fetchBranches();
      
      console.log("Fetched all branches:", branches);
      
      return branches;
    } catch (error: any) {
      console.error("Error fetching branches:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to load branches: ${error.message}`,
      });
      return [];
    }
  };
  
// Branch Visits
export const fetchUserBranchVisits = async (userId: string): Promise<BranchVisit[]> => {
  try {
    const { data, error } = await supabase
      .from("branch_visits")
      .select(`
        *,
        branches (name, location, category)
      `)
      .eq("user_id", userId)
      .order("visit_date", { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error("Error fetching branch visits:", error);
    toast({
      variant: "destructive",
      title: "Error",
      description: `Failed to load branch visits: ${error.message}`,
    });
    return [];
  }
};

export const fetchVisitById = async (visitId: string): Promise<BranchVisit | null> => {
  try {
    const { data, error } = await supabase
      .from("branch_visits")
      .select(`
        *,
        branches (name, location, category)
      `)
      .eq("id", visitId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error(`Error fetching visit ${visitId}:`, error);
    toast({
      variant: "destructive",
      title: "Error",
      description: `Failed to load visit details: ${error.message}`,
    });
    return null;
  }
};

export const createBranchVisit = async (visitData: Database["public"]["Tables"]["branch_visits"]["Insert"]): Promise<BranchVisit | null> => {
  try {
    const { data, error } = await supabase
      .from("branch_visits")
      .insert(visitData)
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Success",
      description: "Branch visit has been created",
    });
    
    return data;
  } catch (error: any) {
    console.error("Error creating branch visit:", error);
    toast({
      variant: "destructive",
      title: "Error",
      description: `Failed to create branch visit: ${error.message}`,
    });
    return null;
  }
};

export const updateBranchVisit = async (visitId: string, visitData: Database["public"]["Tables"]["branch_visits"]["Update"]): Promise<BranchVisit | null> => {
  try {
    // Add updated_at timestamp
    const updatedData = {
      ...visitData,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from("branch_visits")
      .update(updatedData)
      .eq("id", visitId)
      .select()
      .single();
    
    if (error) throw error;
    
    toast({
      title: "Success",
      description: "Branch visit has been updated",
    });
    
    return data;
  } catch (error: any) {
    console.error(`Error updating visit ${visitId}:`, error);
    toast({
      variant: "destructive",
      title: "Error",
      description: `Failed to update branch visit: ${error.message}`,
    });
    return null;
  }
};

export const getBranchVisitStats = async (userId: string) => {
  try {
    // Get assigned branches (from branch_assignments table)
    const { data: assignments, error: assignmentsError } = await supabase
      .from("branch_assignments")
      .select("branch_id")
      .eq("user_id", userId);
    
    if (assignmentsError) throw assignmentsError;
    
    // Get completed visits
    const { data: visits, error: visitsError } = await supabase
      .from("branch_visits")
      .select("id, status, branch_id")
      .eq("user_id", userId);
    
    if (visitsError) throw visitsError;
    
    // Calculate stats
    const assignedBranches = assignments?.length || 0;
    
    // Count unique branch IDs that have been visited
    const visitedBranchIds = new Set();
    visits?.forEach(visit => {
      if (visit.branch_id) {
        visitedBranchIds.add(visit.branch_id);
      }
    });
    
    const branchesVisited = visitedBranchIds.size;
    const pendingVisits = (visits || []).filter(v => v.status === 'draft').length;
    const completionRate = assignedBranches > 0 
      ? Math.round((branchesVisited / assignedBranches) * 100) 
      : 0;
    
    return {
      assignedBranches,
      branchesVisited,
      pendingVisits,
      completionRate
    };
  } catch (error) {
    console.error("Error getting branch visit stats:", error);
    return {
      assignedBranches: 0,
      branchesVisited: 0,
      pendingVisits: 0,
      completionRate: 0
    };
  }
};

export const getBranchCategoryCoverage = async (userId: string) => {
  try {
    // Get all assigned branches with their categories
    const { data: assignedBranches, error: assignmentsError } = await supabase
      .from("branch_assignments")
      .select(`
        branch_id,
        branches:branch_id (
          category
        )
      `)
      .eq("user_id", userId);
    
    if (assignmentsError) throw assignmentsError;
    
    // Get all visited branches
    const { data: visits, error: visitsError } = await supabase
      .from("branch_visits")
      .select("branch_id")
      .eq("user_id", userId);
    
    if (visitsError) throw visitsError;
    
    // Set of visited branch IDs
    const visitedBranchIds = new Set(visits?.map(v => v.branch_id) || []);
    
    // Count by category
    const categoryCounts: Record<string, {total: number, visited: number}> = {
      platinum: {total: 0, visited: 0},
      diamond: {total: 0, visited: 0},
      gold: {total: 0, visited: 0},
      silver: {total: 0, visited: 0},
      bronze: {total: 0, visited: 0}
    };
    
    assignedBranches?.forEach(assignment => {
      const branchData = assignment.branches as { category?: string } | null;
      const category = branchData?.category?.toLowerCase() || "bronze";
      
      if (categoryCounts.hasOwnProperty(category)) {
        categoryCounts[category].total++;
        
        if (visitedBranchIds.has(assignment.branch_id)) {
          categoryCounts[category].visited++;
        }
      }
    });
    
    // Calculate completion percentages
    return Object.entries(categoryCounts).map(([category, counts]) => {
      const completion = counts.total > 0 
        ? Math.round((counts.visited / counts.total) * 100) 
        : 0;
      
      // Determine color based on category
      let color = "bg-orange-700"; // default bronze
      if (category === "platinum") color = "bg-violet-500";
      else if (category === "diamond") color = "bg-blue-500";
      else if (category === "gold") color = "bg-amber-500";
      else if (category === "silver") color = "bg-slate-400";
      
      return {
        category,
        completion,
        color
      };
    });
  } catch (error) {
    console.error("Error getting branch category coverage:", error);
    return [
      { category: "platinum", completion: 0, color: "bg-violet-500" },
      { category: "diamond", completion: 0, color: "bg-blue-500" },
      { category: "gold", completion: 0, color: "bg-amber-500" },
      { category: "silver", completion: 0, color: "bg-slate-400" },
      { category: "bronze", completion: 0, color: "bg-orange-700" }
    ];
  }
};

export const getVisitMetrics = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from("branch_visits")
      .select(`
        hr_connect_session,
        total_employees_invited,
        total_participants,
        new_employees_total,
        new_employees_covered
      `)
      .eq("user_id", userId);
    
    if (error) throw error;
    
    const totalVisits = data?.length || 0;
    const hrConnectSessions = data?.filter(v => v.hr_connect_session === true).length || 0;
    
    // Calculate average participation rate
    let totalParticipationRate = 0;
    let participationCount = 0;
    
    data?.forEach(visit => {
      if (visit.total_employees_invited && visit.total_participants) {
        totalParticipationRate += (visit.total_participants / visit.total_employees_invited) * 100;
        participationCount++;
      }
    });
    
    const avgParticipation = participationCount > 0 
      ? Math.round(totalParticipationRate / participationCount) 
      : 0;
    
    // Calculate new employee coverage
    let newEmployeeCoverage = 0;
    let newEmployeeCount = 0;
    
    data?.forEach(visit => {
      if (visit.new_employees_total && visit.new_employees_covered) {
        newEmployeeCoverage += (visit.new_employees_covered / visit.new_employees_total) * 100;
        newEmployeeCount++;
      }
    });
    
    const avgNewEmployeeCoverage = newEmployeeCount > 0 
      ? Math.round(newEmployeeCoverage / newEmployeeCount) 
      : 0;
    
    return {
      hrConnectSessions: {
        completed: hrConnectSessions,
        total: totalVisits
      },
      avgParticipation,
      employeeCoverage: Math.round(Math.random() * 40) + 50, // Placeholder data
      newEmployeeCoverage: avgNewEmployeeCoverage
    };
  } catch (error) {
    console.error("Error getting visit metrics:", error);
    return {
      hrConnectSessions: { completed: 0, total: 0 },
      avgParticipation: 0,
      employeeCoverage: 0,
      newEmployeeCoverage: 0
    };
  }
};
