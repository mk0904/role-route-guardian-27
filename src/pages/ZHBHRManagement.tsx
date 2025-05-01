
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Search, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BHRDetailsModal from "@/components/zh/BHRDetailsModal";
import { toast } from "@/components/ui/use-toast";

interface BHRUser {
  id: string;
  full_name: string;
  e_code: string;
  location: string;
  branches_assigned: number;
  visits_completed: number;
  status?: string;
}

const ZHBHRManagement = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [selectedBHRId, setSelectedBHRId] = useState<string | null>(null);

  const { data: bhrs, isLoading } = useQuery({
    queryKey: ['zh-bhrs-management'],
    queryFn: async () => {
      try {
        console.log("Fetching BHR users");
        // Get all BH users without location filtering
        const { data: bhUsers, error: bhError } = await supabase
          .from('profiles')
          .select('id, full_name, e_code, location')
          .eq('role', 'BH');
        
        if (bhError) {
          console.error("Error fetching BH users:", bhError);
          toast({
            variant: "destructive",
            title: "Failed to fetch BHR users",
            description: bhError.message || "An error occurred"
          });
          throw bhError;
        }

        console.log("BH users fetched:", bhUsers?.length || 0);
        
        if (!bhUsers || bhUsers.length === 0) {
          return [];
        }
        
        // Get branch assignments for these users
        const bhrIds = bhUsers.map(user => user.id);
        
        const { data: assignments, error: assignmentError } = await supabase
          .from('branch_assignments')
          .select('user_id, branch_id')
          .in('user_id', bhrIds);
          
        if (assignmentError) {
          console.error("Error fetching assignments:", assignmentError);
          throw assignmentError;
        }
        
        // Get branch visits for these users
        const { data: visits, error: visitError } = await supabase
          .from('branch_visits')
          .select('user_id, branch_id, status')
          .in('user_id', bhrIds);
          
        if (visitError) {
          console.error("Error fetching visits:", visitError);
          throw visitError;
        }
        
        // Group assignments by user
        const assignmentsByUser: Record<string, string[]> = {};
        (assignments || []).forEach(assignment => {
          if (!assignmentsByUser[assignment.user_id]) {
            assignmentsByUser[assignment.user_id] = [];
          }
          assignmentsByUser[assignment.user_id].push(assignment.branch_id);
        });
        
        // Group completed visits by user
        const visitsByUser: Record<string, string[]> = {};
        (visits || []).forEach(visit => {
          if (visit.status === 'approved' || visit.status === 'submitted') {
            if (!visitsByUser[visit.user_id]) {
              visitsByUser[visit.user_id] = [];
            }
            visitsByUser[visit.user_id].push(visit.branch_id);
          }
        });
        
        // Combine the data
        const bhrUsers: BHRUser[] = bhUsers.map(bhr => {
          const branches = assignmentsByUser[bhr.id] || [];
          const visitsCompleted = visitsByUser[bhr.id] || [];
          
          const coverage = branches.length > 0 
            ? Math.round((visitsCompleted.length / branches.length) * 100) 
            : 0;
            
          let status = "Needs Attention";
          if (coverage >= 90) status = "Good";
          else if (coverage >= 70) status = "In Progress";
          
          return {
            ...bhr,
            branches_assigned: branches.length,
            visits_completed: visitsCompleted.length,
            status
          };
        });
        
        console.log("Processed BHR users:", bhrUsers.length);
        return bhrUsers;
      } catch (error) {
        console.error("Error fetching BHR users:", error);
        return [];
      }
    }
  });

  // Get locations from BHRs for the filter
  const locations = React.useMemo(() => {
    if (!bhrs) return ["All Locations"];
    return ["All Locations", ...new Set(bhrs.map(bhr => bhr.location))];
  }, [bhrs]);

  // Filter BHRs based on search and location
  const filteredBHRs = React.useMemo(() => {
    if (!bhrs) return [];
    
    return bhrs.filter(bhr => {
      const matchesSearch = searchQuery 
        ? bhr.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          bhr.e_code.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
        
      const matchesLocation = locationFilter === "All Locations" || bhr.location === locationFilter;
      
      return matchesSearch && matchesLocation;
    });
  }, [bhrs, searchQuery, locationFilter]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Good":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Good</Badge>;
      case "In Progress":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200">In Progress</Badge>;
      default:
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Needs Attention</Badge>;
    }
  };

  const handleBHRClick = (bhrId: string) => {
    setSelectedBHRId(bhrId);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">BHR Management</h1>
        <p className="text-slate-600 mt-1">Monitor and manage Branch HR representatives</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <Input
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {locations.map(location => (
              <SelectItem key={location} value={location}>{location}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select defaultValue="All Channels">
          <SelectTrigger>
            <SelectValue placeholder="Select channel" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="All Channels">All Channels</SelectItem>
            <SelectItem value="Corporate">Corporate Banking</SelectItem>
            <SelectItem value="SME">SME Banking</SelectItem>
            <SelectItem value="Retail">Retail Banking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* BHR Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {isLoading ? (
          Array(3).fill(0).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6 h-64 flex items-center justify-center">
                <div className="h-10 w-10 rounded-full bg-slate-200 mb-4" />
                <div className="h-6 w-40 bg-slate-200 rounded mb-2" />
                <div className="h-4 w-20 bg-slate-200 rounded mb-2" />
              </CardContent>
            </Card>
          ))
        ) : filteredBHRs.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No BHRs found matching your search criteria
          </div>
        ) : (
          filteredBHRs.map(bhr => {
            // Calculate coverage percentage
            const coveragePercentage = bhr.branches_assigned > 0
              ? Math.round((bhr.visits_completed / bhr.branches_assigned) * 100)
              : 0;
            
            // Generate avatar initials
            const initials = bhr.full_name
              .split(' ')
              .map(name => name.charAt(0))
              .slice(0, 1)
              .join('');
              
            return (
              <Card key={bhr.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 md:h-14 w-10 md:w-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-lg md:text-xl font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <h3 className="font-semibold text-base md:text-lg truncate">{bhr.full_name}</h3>
                        {getStatusBadge(bhr.status)}
                      </div>
                      <div className="text-xs md:text-sm text-slate-500">{bhr.e_code}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center text-xs md:text-sm text-slate-600">
                    <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                    <span className="truncate">{bhr.location}</span>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-xs md:text-sm mb-1">
                      <span>Branch Visit Coverage</span>
                      <span className="font-medium">
                        {bhr.visits_completed}/{bhr.branches_assigned} branches
                      </span>
                    </div>
                    <Progress 
                      value={coveragePercentage} 
                      className={`h-2 ${coveragePercentage >= 90 ? 'bg-green-200' : coveragePercentage >= 70 ? 'bg-blue-200' : 'bg-amber-200'}`}
                    />
                  </div>
                  
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-slate-500 text-xs mb-1">Branches Mapped</div>
                      <div className="text-xl md:text-2xl font-bold">{bhr.branches_assigned}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-500 text-xs mb-1">Visits Completed</div>
                      <div className="text-xl md:text-2xl font-bold">{bhr.visits_completed}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <Button 
                      variant="link" 
                      className="w-full text-blue-600 font-medium p-0 h-auto"
                      onClick={() => handleBHRClick(bhr.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* BHR Details Modal */}
      <BHRDetailsModal 
        bhId={selectedBHRId} 
        open={!!selectedBHRId} 
        onClose={() => setSelectedBHRId(null)}
      />
    </div>
  );
};

export default ZHBHRManagement;
