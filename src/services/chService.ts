
export const fetchDashboardStats = async () => {
  try {
    // This would normally be a database call
    // For now we're returning mock data
    return {
      totalBranches: 500,
      visitedBranches: 320,
      coverage: 64,
      activeBHRs: 45,
      avgCoverage: 58,
      attritionRate: 7.5,
      manningPercentage: 92,
      erPercentage: 22,
      vsLastMonth: {
        coverage: 2,
        avgCoverage: -1.5,
        attritionRate: 0.5,
        manningPercentage: 1,
        erPercentage: -0.2
      }
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    throw error;
  }
};

export const fetchBranchCategoryStats = async () => {
  try {
    // This would normally be a database call
    // For now we're returning mock data
    return [
      {
        category: "Metro",
        total: 125,
        visited: 98,
        coverage: 78,
      },
      {
        category: "Urban",
        total: 230,
        visited: 142,
        coverage: 62,
      },
      {
        category: "Semi-Urban",
        total: 187,
        visited: 76,
        coverage: 41,
      },
      {
        category: "Rural",
        total: 93,
        visited: 28,
        coverage: 30,
      },
    ];
  } catch (error) {
    console.error("Error fetching branch category stats:", error);
    throw error;
  }
};

export const fetchMonthlyTrends = async () => {
  try {
    // This would normally be a database call
    // For now we're returning mock data
    return [
      {
        month: "Jan",
        branchCoverage: 55,
      },
      {
        month: "Feb",
        branchCoverage: 60,
      },
      {
        month: "Mar",
        branchCoverage: 68,
      },
      {
        month: "Apr",
        branchCoverage: 75,
      },
      {
        month: "May",
        branchCoverage: 80,
      },
    ];
  } catch (error) {
    console.error("Error fetching monthly trends:", error);
    throw error;
  }
};

export const fetchTopPerformers = async () => {
  try {
    // This would normally be a database call
    // For now we're returning mock data
    return [
      {
        e_code: "BHR001",
        name: "John Doe",
        reports: 25,
      },
      {
        e_code: "BHR002",
        name: "Jane Smith",
        reports: 22,
      },
      {
        e_code: "BHR003",
        name: "Alice Johnson",
        reports: 20,
      },
    ];
  } catch (error) {
    console.error("Error fetching top performers:", error);
    throw error;
  }
};

// Add the missing functions that CHReports.tsx is trying to import
export const generateReportData = async (month: string, year: string) => {
  try {
    // This would normally be a database call
    // For now we're returning mock data
    return {
      totalBranchVisits: 245,
      coveragePercentage: 72,
      avgParticipation: 85,
      topPerformer: "Priya Sharma",
    };
  } catch (error) {
    console.error("Error generating report data:", error);
    throw error;
  }
};

export const fetchCategoryBreakdown = async () => {
  try {
    // This would normally be a database call
    // For now we're returning mock data
    return [
      {
        name: "Platinum",
        branches: 42,
        coverage: 86,
      },
      {
        name: "Diamond",
        branches: 78,
        coverage: 75,
      },
      {
        name: "Gold",
        branches: 126,
        coverage: 68,
      },
      {
        name: "Silver",
        branches: 195,
        coverage: 56,
      },
      {
        name: "Bronze",
        branches: 59,
        coverage: 42,
      },
    ];
  } catch (error) {
    console.error("Error fetching category breakdown:", error);
    throw error;
  }
};
