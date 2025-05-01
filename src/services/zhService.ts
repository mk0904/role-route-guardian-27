
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Database } from "@/integrations/supabase/types";

type Branch = Database['public']['Tables']['branches']['Row'];
type BranchWithAssignments = Branch & { bh_count: number };
type BHRUser = Database['public']['Tables']['profiles']['Row'] & { branches_assigned: number };

export async function fetchZoneBranches(userId: string): Promise<BranchWithAssignments[]> {
  try {
    console.log("Fetching all branches...");
    // Get all branches without location filtering
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select(`
        *,
        branch_assignments (
          user_id
        )
      `);

    if (branchError) {
      console.error("Error fetching branches:", branchError);
      throw branchError;
    }

    console.log(`Fetched ${branches?.length || 0} branches`);

    // Process the data to count BHs per branch
    const processedBranches = branches.map(branch => {
      // Count unique BHs for this branch
      const uniqueBhs = new Set();
      if (branch.branch_assignments) {
        // Handle array of branch_assignments
        if (Array.isArray(branch.branch_assignments)) {
          branch.branch_assignments.forEach((assignment: any) => {
            uniqueBhs.add(assignment.user_id);
          });
        }
      }

      return {
        ...branch,
        bh_count: uniqueBhs.size
      };
    });

    return processedBranches as BranchWithAssignments[];
  } catch (error) {
    console.error("Error fetching zone branches:", error);
    throw error;
  }
}

export async function fetchZoneBHRs(userId: string): Promise<BHRUser[]> {
    try {
      console.log("Fetching all BH users...");
      // Get all BH users without location filtering - use eq('role', 'BH') case-sensitive match
      const { data: bhUsers, error: bhError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'BH');
  
      if (bhError) {
        console.error("Error fetching BH users:", bhError);
        throw bhError;
      }
      
      console.log(`Fetched ${bhUsers?.length || 0} BH users`);
      
      // Get branch assignments for these users in a separate query
      const bhUserIds = bhUsers?.map(user => user.id) || [];
      
      // Only proceed if we have users
      if (bhUserIds.length === 0) {
        console.log("No BH users found");
        return [] as BHRUser[];
      }
      
      const { data: assignments, error: assignmentsError } = await supabase
        .from('branch_assignments')
        .select('user_id, branch_id')
        .in('user_id', bhUserIds);
        
      if (assignmentsError) {
        console.error("Error fetching assignments:", assignmentsError);
        throw assignmentsError;
      }
      
      console.log(`Fetched ${assignments?.length || 0} branch assignments`);
      
      // Group assignments by user
      const assignmentsByUser: Record<string, string[]> = {};
      assignments?.forEach(assignment => {
        if (!assignmentsByUser[assignment.user_id]) {
          assignmentsByUser[assignment.user_id] = [];
        }
        assignmentsByUser[assignment.user_id].push(assignment.branch_id);
      });
      
      // Process the data to count branches per BH
      const processedBHRs = bhUsers?.map(user => {
        const branchIds = assignmentsByUser[user.id] || [];
        return {
          ...user,
          branches_assigned: branchIds.length
        };
      }) || [];
  
      console.log(`Processed ${processedBHRs.length} BHRs with assignment counts`);
      return processedBHRs as BHRUser[];
    } catch (error) {
      console.error("Error fetching zone BHRs:", error);
      throw error;
    }
}

export async function fetchDashboardStats(userId: string) {
  try {
    // Count total branches without filtering by location
    const { count: totalBranches, error: branchError } = await supabase
      .from('branches')
      .select('id', { count: 'exact', head: true });

    if (branchError) throw branchError;

    // Count total BHRs without filtering by location
    const { count: totalBHRs, error: bhrError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'BH');

    if (bhrError) throw bhrError;

    // Get visits stats without location filtering
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

export async function assignBranchToBHR(bhUserId: string, branchId: string) {
  try {
    const { data, error } = await supabase
      .from('branch_assignments')
      .insert({
        user_id: bhUserId,
        branch_id: branchId
      });
    
    if (error) throw error;
    
    toast({
      title: "Branch assigned successfully",
      description: "The branch has been assigned to the BHR."
    });
    
    return data;
  } catch (error: any) {
    console.error("Error assigning branch to BHR:", error);
    
    // Check if error is a unique constraint violation (already assigned)
    if (error.code === '23505') {
      toast({
        variant: "destructive",
        title: "Assignment already exists",
        description: "This branch is already assigned to this BHR."
      });
    } else {
      toast({
        variant: "destructive",
        title: "Failed to assign branch",
        description: error.message || "An unexpected error occurred."
      });
    }
    
    throw error;
  }
}

export async function unassignBranchFromBHR(bhUserId: string, branchId: string) {
  try {
    const { error } = await supabase
      .from('branch_assignments')
      .delete()
      .eq('user_id', bhUserId)
      .eq('branch_id', branchId);
    
    if (error) throw error;
    
    toast({
      title: "Assignment removed",
      description: "The branch assignment has been removed."
    });
    
    return true;
  } catch (error: any) {
    console.error("Error removing branch assignment:", error);
    toast({
      variant: "destructive",
      title: "Failed to remove assignment",
      description: error.message || "An unexpected error occurred."
      });
    
    throw error;
  }
}
