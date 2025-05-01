
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-3xl w-full text-center space-y-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Role-Based Access Control System
          </h1>
          
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Secure, efficient, and customized access management for your organization
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              size="lg"
              onClick={handleGetStarted}
              className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700"
            >
              Get Started
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
            {[
              {
                title: "Role-Based Access",
                description: "Different dashboards for BH, ZH, CH, and Admin roles"
              },
              {
                title: "Secure Authentication",
                description: "Robust login, signup, and password reset functionality"
              },
              {
                title: "Custom Permissions",
                description: "Tailored access rights based on user responsibilities"
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="bg-white p-6 rounded-lg shadow-md border border-slate-200 text-left"
              >
                <h3 className="text-xl font-semibold mb-3 text-slate-800">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      
      <footer className="py-6 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
          &copy; {new Date().getFullYear()} Role Route Guardian. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
