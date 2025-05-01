
import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Map, Users, Menu, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar } from "@/components/ui/avatar";

const ZHDashboardLayout = () => {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  useEffect(() => {
    const getProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (error) throw error;
        if (data) setProfile(data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };
    
    getProfile();
  }, [user]);
  
  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/zh/dashboard" },
    { icon: Map, label: "Branch Mapping", path: "/zh/branch-mapping" },
    { icon: Users, label: "BHR Management", path: "/zh/bhr-management" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Mobile menu
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white border-b shadow-sm">
          <div className="flex items-center gap-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <div className="flex flex-col h-full">
                  {/* Mobile menu header */}
                  <div className="h-14 px-4 border-b flex items-center">
                    <h2 className="text-lg font-semibold flex-1">HDFC App</h2>
                  </div>
                  
                  {/* Mobile menu items */}
                  <div className="flex-1 px-2 py-4">
                    <nav className="space-y-1">
                      {menuItems.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) => cn(
                            "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                            isActive 
                              ? "bg-blue-50 text-blue-700" 
                              : "text-gray-700 hover:bg-gray-100"
                          )}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <item.icon className="mr-3 h-5 w-5" />
                          {item.label}
                        </NavLink>
                      ))}
                    </nav>
                  </div>
                  
                  {/* Mobile menu footer */}
                  <div className="border-t p-4">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold">HDFC App</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 bg-blue-600 text-white">
              <span>{profile?.full_name?.charAt(0) || 'Z'}</span>
            </Avatar>
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside 
        className={cn(
          "h-screen bg-white shadow-md transition-all duration-300 flex flex-col relative z-20", 
          expanded ? "w-64" : "w-20"
        )}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="flex items-center justify-center h-16 border-b">
          {expanded ? (
            <h2 className="text-xl font-bold">HDFC App</h2>
          ) : (
            <h2 className="text-xl font-bold">H</h2>
          )}
        </div>
        
        <nav className="flex-1 mt-6">
          <ul className="px-2 space-y-2">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink 
                  to={item.path}
                  className={({ isActive }) => cn(
                    "flex items-center rounded-md transition-all duration-200 hover:bg-blue-50 hover:text-blue-700",
                    isActive ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700",
                    expanded ? "py-2.5 px-4" : "py-2.5 justify-center"
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {expanded && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-4 border-t">
          <Button 
            variant="outline" 
            className={cn(
              "w-full",
              expanded ? "justify-start" : "justify-center"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {expanded && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="flex-1 overflow-auto relative">
        <Outlet />
      </main>
    </div>
  );
};

export default ZHDashboardLayout;
