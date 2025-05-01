
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import BHRDetailsModal from "@/components/zh/BHRDetailsModal";

interface BranchVisit {
  id: string;
  branch: {
    name: string;
  };
  bh_name: string;
  visit_date: string;
  report_details: {
    feedback: string;
    manning_percentage: number;
    attrition_percentage: number;
    hr_connect_session: boolean;
  };
}

interface ReportDetailsModalProps {
  visit: BranchVisit | null;
  open: boolean;
  onClose: () => void;
}

const ReportDetailsModal = ({ visit, open, onClose }: ReportDetailsModalProps) => {
  if (!visit) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Visit Report Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Branch</p>
              <p className="text-lg font-medium">{visit.branch.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Visited By</p>
              <p className="text-lg font-medium">{visit.bh_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Visit Date</p>
              <p className="text-lg font-medium">{visit.visit_date}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">HR Connect Session</p>
              <p className="text-lg font-medium">{visit.report_details.hr_connect_session ? "Conducted" : "Not Conducted"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Manning Percentage</p>
              <p className="text-lg font-medium">{visit.report_details.manning_percentage}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Attrition Percentage</p>
              <p className="text-lg font-medium">{visit.report_details.attrition_percentage}%</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Feedback</p>
            <p className="text-base mt-1">{visit.report_details.feedback}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ErrorFallback component for empty states
const ErrorFallback = ({ message }: { message: string }) => {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <AlertCircle className="h-10 w-10 text-slate-300 mb-2" />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
};

const ZHDashboard = () => {
  const { user } = useAuth();
  const [selectedVisit, setSelectedVisit] = useState<BranchVisit | null>(null);
  const [selectedBhId, setSelectedBhId] = useState<string | null>(null);

  // Fetch BHR data from Supabase
  const { data: bhrData, isLoading: bhrLoading } = useQuery({
    queryKey: ['zh-bhrs'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, e_code')
          .eq('role', 'BH');
        
        if (error) throw error;
        return data || [];
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to load BHRs: ${error.message}`,
        });
        return [];
      }
    }
  });

  // Fetch branch visit reports from Supabase
  const { data: visitReports, isLoading: visitsLoading } = useQuery({
    queryKey: ['zh-visits'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('branch_visits')
          .select(`
            id,
            visit_date,
            branches:branch_id(name),
            profiles:user_id(full_name),
            feedback,
            hr_connect_session,
            manning_percentage,
            attrition_percentage
          `)
          .order('visit_date', { ascending: false })
          .limit(5);
        
        if (error) throw error;

        // Transform the data to match our interface - with safety checks
        const transformedData = (data || []).map(visit => {
          // Extract branch name safely
          let branchName = 'Unknown Branch';
          if (visit.branches && typeof visit.branches === 'object' && visit.branches !== null) {
            const branchObj = visit.branches as { name?: string };
            if (branchObj && typeof branchObj.name === 'string') {
              branchName = branchObj.name;
            }
          }
          
          // Extract BH name safely
          let bhName = 'Unknown BH';
          if (visit.profiles && typeof visit.profiles === 'object' && visit.profiles !== null) {
            const profileObj = visit.profiles as { full_name?: string };
            if (profileObj && typeof profileObj.full_name === 'string') {
              bhName = profileObj.full_name;
            }
          }
            
          return {
            id: visit.id,
            branch: {
              name: branchName,
            },
            bh_name: bhName,
            visit_date: visit.visit_date ? new Date(visit.visit_date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            }) : 'Unknown Date',
            report_details: {
              feedback: visit.feedback || 'No feedback provided',
              manning_percentage: Number(visit.manning_percentage || 0),
              attrition_percentage: Number(visit.attrition_percentage || 0),
              hr_connect_session: Boolean(visit.hr_connect_session || false),
            }
          } as BranchVisit;
        });
        
        return transformedData;
      } catch (error: any) {
        console.error("Error fetching visit reports:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to load visit reports: ${error.message}`,
        });
        return [];
      }
    }
  });

  // Fetch branch and BHR stats from Supabase - Modified to get all BHs regardless of location
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['zh-stats'],
    queryFn: async () => {
      try {
        // Get total branches - now getting all branches
        const { data: branches, error: branchesError } = await supabase
          .from('branches')
          .select('id', { count: 'exact' });
        
        if (branchesError) throw branchesError;
        
        // Get total BHRs - now getting all BH users regardless of location
        const { data: bhrs, error: bhrsError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' })
          .eq('role', 'BH');
        
        if (bhrsError) throw bhrsError;
        
        // Get active BHRs - now considering all visits
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: activeBhrs, error: activeBhrsError } = await supabase
          .from('branch_visits')
          .select('user_id')
          .gte('visit_date', thirtyDaysAgo.toISOString())
          .eq('status', 'submitted');
        
        if (activeBhrsError) throw activeBhrsError;
        
        // Count unique active BHRs - safely handle null data
        const uniqueActiveBhrs = new Set((activeBhrs || []).map(bhr => bhr.user_id));
        
        // Count visited branches
        const { data: visitedBranches, error: visitedBranchesError } = await supabase
          .from('branch_visits')
          .select('branch_id', { count: 'exact', head: true })
          .eq('status', 'submitted');
          
        if (visitedBranchesError) throw visitedBranchesError;
        
        // Get unique visited branches
        const uniqueVisitedBranches = new Set((visitedBranches || []).map(visit => visit.branch_id));
        
        return {
          totalBranches: (branches || []).length,
          totalBHRs: (bhrs || []).length,
          activeBHRs: uniqueActiveBhrs.size,
          visitedBranches: uniqueVisitedBranches.size,
        };
      } catch (error: any) {
        console.error("Error fetching stats:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to load statistics: ${error.message}`,
        });
        return {
          totalBranches: 0,
          totalBHRs: 0,
          activeBHRs: 0,
          visitedBranches: 0,
        };
      }
    }
  });

  // Fetch BHR report counts - modified to fetch all BHRs regardless of location
  const { data: bhrReportCounts, isLoading: bhrCountsLoading } = useQuery({
    queryKey: ['bhr-report-counts'],
    queryFn: async () => {
      try {
        // Get report counts per BHR - for all BHRs
        const { data, error } = await supabase
          .from('branch_visits')
          .select(`
            user_id,
            profiles:user_id(full_name)
          `)
          .eq('status', 'submitted');
        
        if (error) throw error;
        
        // Count reports by BHR - with safety checks
        const bhrCounts: Record<string, { id: string, name: string, reports: number }> = {};
        
        (data || []).forEach(visit => {
          if (!visit.user_id) return;
          
          const userId = visit.user_id;
          
          // Extract BH name safely
          let name = 'Unknown';
          if (visit.profiles && typeof visit.profiles === 'object' && visit.profiles !== null) {
            const profileObj = visit.profiles as { full_name?: string };
            if (profileObj && typeof profileObj.full_name === 'string') {
              name = profileObj.full_name;
            }
          }
          
          if (!bhrCounts[userId]) {
            bhrCounts[userId] = { id: userId, name, reports: 0 };
          }
          bhrCounts[userId].reports++;
        });
        
        return Object.values(bhrCounts);
      } catch (error: any) {
        console.error("Error loading BHR report counts:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to load BHR report counts: ${error.message}`,
        });
        return [];
      }
    }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome, Zonal HR User</h1>
        <p className="text-slate-600 mt-1">Manage branch assignments and monitor BHR performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total BHRs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{statsLoading ? "..." : stats?.totalBHRs}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active BHRs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{statsLoading ? "..." : stats?.activeBHRs}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{statsLoading ? "..." : stats?.totalBranches}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Visited Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{statsLoading ? "..." : stats?.visitedBranches}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Branch Visit Reports */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Recent Branch Visit Reports</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {visitsLoading ? (
                <p className="text-center py-4 text-slate-500">Loading reports...</p>
              ) : !visitReports || visitReports.length === 0 ? (
                <ErrorFallback message="No reports found" />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Branch</TableHead>
                        <TableHead>BH Assigned</TableHead>
                        <TableHead>Last Report</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visitReports.map((visit, i) => (
                        <TableRow key={i}>
                          <TableCell>{visit.branch.name}</TableCell>
                          <TableCell>{visit.bh_name}</TableCell>
                          <TableCell>{visit.visit_date}</TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedVisit(visit)}
                              className="flex items-center gap-1"
                            >
                              View Report
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - BHR Performance Overview */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>BHR Report Submissions</CardTitle>
                <Badge variant="outline">Overall</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {bhrCountsLoading ? (
                <p className="text-center py-4 text-slate-500">Loading BHR data...</p>
              ) : !bhrReportCounts || bhrReportCounts.length === 0 ? (
                <ErrorFallback message="No BHR data found" />
              ) : (
                <div className="space-y-4">
                  {bhrReportCounts.map((bhr, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-2 rounded-md"
                      onClick={() => setSelectedBhId(bhr.id)}
                    >
                      <p className="text-sm font-medium">{bhr.name}</p>
                      <Badge variant="secondary">{bhr.reports} reports</Badge>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.href = "/zh/bhr-management"}>
                      View All BHRs
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report Details Modal */}
      <ReportDetailsModal 
        visit={selectedVisit} 
        open={!!selectedVisit} 
        onClose={() => setSelectedVisit(null)}
      />

      {/* BHR Details Modal */}
      <BHRDetailsModal
        bhId={selectedBhId}
        open={!!selectedBhId}
        onClose={() => setSelectedBhId(null)}
      />
    </div>
  );
};

export default ZHDashboard;
