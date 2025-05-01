
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Plus, X } from "lucide-react";
import { fetchZoneBranches, fetchZoneBHRs, assignBranchToBHR, unassignBranchFromBHR } from "@/services/zhService";
import { toast } from "@/components/ui/use-toast";

type Branch = {
  id: string;
  name: string;
  location: string;
  category: string;
  bh_count: number;
};

type BHUser = {
  id: string;
  full_name: string;
  e_code: string;
  location: string;
  branches_assigned: number;
};

const ZHBranchMapping = () => {
  const { user } = useAuth();
  
  // Data states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [bhUsers, setBHUsers] = useState<BHUser[]>([]);
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  
  // Action states
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedBHUser, setSelectedBHUser] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"assign" | "unassign">("assign");
  const [selectedBranchForUnassign, setSelectedBranchForUnassign] = useState<{
    branchId: string;
    branchName: string;
    bhUserId: string;
  } | null>(null);
  
  // Fetch data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        console.log("Fetching branch mapping data...");
        
        // Fetch branches and BH users in parallel
        const [branchesData, bhUsersData] = await Promise.all([
          fetchZoneBranches(user.id),
          fetchZoneBHRs(user.id)
        ]);
        
        console.log("Branches fetched:", branchesData.length);
        console.log("BHRs fetched:", bhUsersData.length);
        
        setBranches(branchesData);
        setFilteredBranches(branchesData);
        setBHUsers(bhUsersData);
      } catch (error) {
        console.error("Error loading branch mapping data:", error);
        toast({
          variant: "destructive",
          title: "Error loading data",
          description: "Failed to load branch and BHR data. Please try again."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user]);
  
  // Filter branches when filters change
  useEffect(() => {
    let filtered = [...branches];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        branch => branch.name.toLowerCase().includes(query) || 
                 branch.location.toLowerCase().includes(query)
      );
    }
    
    if (categoryFilter && categoryFilter !== "all") {
      filtered = filtered.filter(branch => branch.category === categoryFilter);
    }
    
    setFilteredBranches(filtered);
  }, [branches, searchQuery, categoryFilter]);
  
  const handleOpenAssignDialog = (branch: Branch) => {
    setSelectedBranch(branch);
    setSelectedBHUser(null);
    setDialogType("assign");
    setDialogOpen(true);
  };
  
  const handleOpenUnassignDialog = (branchId: string, branchName: string, bhUserId: string) => {
    setSelectedBranchForUnassign({
      branchId,
      branchName,
      bhUserId
    });
    setDialogType("unassign");
    setDialogOpen(true);
  };
  
  const handleConfirmDialog = async () => {
    try {
      if (dialogType === "assign" && selectedBranch && selectedBHUser) {
        await assignBranchToBHR(selectedBHUser, selectedBranch.id);
        
        // Refresh data
        if (user) {
          const [branchesData, bhUsersData] = await Promise.all([
            fetchZoneBranches(user.id),
            fetchZoneBHRs(user.id)
          ]);
          
          setBranches(branchesData);
          setFilteredBranches(branchesData);
          setBHUsers(bhUsersData);
        }
      } else if (dialogType === "unassign" && selectedBranchForUnassign) {
        await unassignBranchFromBHR(
          selectedBranchForUnassign.bhUserId,
          selectedBranchForUnassign.branchId
        );
        
        // Refresh data
        if (user) {
          const [branchesData, bhUsersData] = await Promise.all([
            fetchZoneBranches(user.id),
            fetchZoneBHRs(user.id)
          ]);
          
          setBranches(branchesData);
          setFilteredBranches(branchesData);
          setBHUsers(bhUsersData);
        }
      }
    } catch (error) {
      console.error("Error during branch assignment operation:", error);
    } finally {
      setDialogOpen(false);
    }
  };
  
  // Function to format branch category names
  const formatCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="flex flex-col items-center">
          <div className="h-8 w-8 rounded-full border-4 border-t-blue-600 border-b-blue-600 border-r-transparent border-l-transparent animate-spin"></div>
          <p className="mt-4 text-sm text-slate-600">Loading branch data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Branch Mapping</h1>
        <p className="text-slate-600">Assign branches to Branch Head Representatives (BHRs)</p>
      </div>
      
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle>Branches</CardTitle>
          <CardDescription>Manage branch assignments for your zone</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
              <Input
                placeholder="Search branches by name or location..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="w-full md:w-52">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
                <SelectItem value="diamond">Diamond</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="border rounded-md overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">Branch Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Assigned BHRs</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBranches.length > 0 ? (
                  filteredBranches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>{branch.location}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          branch.category === 'platinum' ? 'bg-violet-100 text-violet-700' : 
                          branch.category === 'diamond' ? 'bg-blue-100 text-blue-700' :
                          branch.category === 'gold' ? 'bg-amber-100 text-amber-700' :
                          branch.category === 'silver' ? 'bg-slate-100 text-slate-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {formatCategoryName(branch.category)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{branch.bh_count}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenAssignDialog(branch)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      {searchQuery || categoryFilter ? 
                        "No branches match your search criteria" : 
                        "No branches available in your zone"
                      }
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Dialogs for assigning/unassigning */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="max-w-md bg-white">
          {dialogType === "assign" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Assign Branch to BHR</AlertDialogTitle>
                <AlertDialogDescription>
                  Select a BHR to assign to {selectedBranch?.name}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Select value={selectedBHUser || ""} onValueChange={setSelectedBHUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a BHR" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {bhUsers.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">
                        No BHRs available. Please add BHRs first.
                      </div>
                    ) : (
                      bhUsers.map((bhUser) => (
                        <SelectItem key={bhUser.id} value={bhUser.id}>
                          {bhUser.full_name} ({bhUser.e_code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDialog} disabled={!selectedBHUser}>
                  Assign
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Unassign Branch</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to unassign {selectedBranchForUnassign?.branchName} from this BHR?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDialog} className="bg-red-600 hover:bg-red-700">
                  Unassign
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ZHBranchMapping;
