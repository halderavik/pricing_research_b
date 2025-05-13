import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useState } from "react";
import pptxgen from "pptxgenjs";
import { Id } from "../../convex/_generated/dataModel";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

type DataPoint = {
  price: number;
  values: number[];
};

type Metrics = {
  pmcPoint?: number;
  ipdPoint?: number;
  opp?: number;
  idp?: number;
};

type Range = number[];

export function Results({
  projectId,
  onBack,
}: {
  projectId: Id<"projects">;
  onBack: () => void;
}) {
  const results = useQuery(api.analysis.getResults, { projectId });
  const project = useQuery(api.projects.get, { projectId });
  const [selectedSegment, setSelectedSegment] = useState<string>("overall");
  const [selectedLevel, setSelectedLevel] = useState<string>("");

  if (!results || !project) return <div>Loading...</div>;

  const isVanWestendorp = project.analysisType === "van_westendorp";

  // Get the current data and metrics based on selection
  let currentData: DataPoint[] | undefined;
  let currentMetrics: Metrics | undefined;
  let currentRange: Range | undefined;

  if (selectedSegment === "overall") {
    currentData = results.overallResults.data;
    currentMetrics = results.overallResults.metrics;
    currentRange = results.overallResults.range;
  } else {
    const segmentResult = results.segmentResults.find(
      s => s.segmentVariable === selectedSegment
    );
    const levelResult = segmentResult?.levels.find(
      l => l.name === selectedLevel
    );
    if (levelResult) {
      currentData = levelResult.data;
      currentMetrics = levelResult.metrics;
      currentRange = levelResult.range;
    }
  }

  const handleDownload = async (format: "pptx" | "csv" | "png" | "pptx_full") => {
    if (format === "pptx") {
      const pres = new pptxgen();
      
      // Add title slide
      let slide = pres.addSlide();
      slide.addText("Pricing Analysis Results", {
        x: 1,
        y: 1,
        fontSize: 24,
        bold: true,
      });
      slide.addText(`Analysis Type: ${isVanWestendorp ? "Van Westendorp" : "Gabor-Granger"}`, {
        x: 1,
        y: 2,
        fontSize: 18,
      });
      slide.addText(`Segment: ${selectedSegment === "overall" ? "Overall Results" : `${selectedSegment}: ${selectedLevel}`}`, {
        x: 1,
        y: 2.5,
        fontSize: 18,
      });

      // Add chart slide
      slide = pres.addSlide();
      slide.addText("Price Sensitivity Analysis Chart", {
        x: 1,
        y: 0.5,
        fontSize: 20,
        bold: true,
      });

      // Get the chart canvas and convert to base64
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const chartImage = canvas.toDataURL('image/png');
        slide.addImage({
          data: chartImage,
          x: 1,
          y: 1.5,
          w: 8,
          h: 4.5,
        });
      }

      // Add insights slides
      slide = pres.addSlide();
      slide.addText("Key Insights", {
        x: 1,
        y: 0.5,
        fontSize: 24,
        bold: true,
        color: "363636",
      });

      if (isVanWestendorp) {
        // Van Westendorp Insights
        slide.addText([
          { text: "Optimal Price Point (OPP)\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `$${currentMetrics?.opp || "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
          { text: "• Recommended starting price point\n" },
          { text: "• Balances customer price sensitivity\n" },
          { text: "• Minimizes price resistance\n\n" },
          
          { text: "Indifference Price Point (IDP)\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `$${currentMetrics?.idp || "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
          { text: "• Price point where customers are neutral\n" },
          { text: "• Indicates market equilibrium\n" },
          { text: "• Useful for competitive positioning\n\n" },
          
          { text: "Acceptable Price Range\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `$${currentRange?.[0] || "N/A"} - $${currentRange?.[1] || "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
          { text: "• Safe pricing zone for your product\n" },
          { text: "• Range width: $" + (currentRange ? (currentRange[1] - currentRange[0]).toFixed(2) : "N/A") + "\n\n" },
          
          { text: "Price Sensitivity Analysis\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `$${currentRange ? (currentRange[1] - currentRange[0]).toFixed(2) : "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
          { text: "• Higher value indicates more price flexibility\n" },
          { text: "• Lower value suggests price sensitivity\n" },
          { text: "• Use for pricing strategy decisions" }
        ], {
          x: 1,
          y: 1.5,
          w: 8,
          fontSize: 12,
          lineSpacing: 1.5,
          color: "363636",
        });
      } else {
        // Gabor-Granger Insights
        const optimal = selectedSegment === "overall" ? results.overallResults.optimal : results.segmentResults.find(s => s.segmentVariable === selectedSegment)?.levels.find(l => l.name === selectedLevel)?.optimal;
        const maxPurchaseIntent = currentData ? currentData.reduce((max, point) => Math.max(max, point.values[0]), 0).toFixed(1) : "N/A";
        const maxRevenue = currentData ? currentData.reduce((max, point) => Math.max(max, point.values[1]), 0).toFixed(2) : "N/A";

        slide.addText([
          { text: "Optimal Price Point\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `$${optimal || "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
          { text: "• Revenue-optimized price point\n" },
          { text: "• Balances volume and margin\n" },
          { text: "• Primary pricing recommendation\n\n" },
          
          { text: "Price Sensitivity Range\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `$${currentRange?.[0] || "N/A"} - $${currentRange?.[1] || "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
          { text: "• Range width: $" + (currentRange ? (currentRange[1] - currentRange[0]).toFixed(2) : "N/A") + "\n" },
          { text: "• Use for price testing and adjustments\n\n" },
          
          { text: "Purchase Intent Analysis\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `${maxPurchaseIntent}%\n`, options: { fontSize: 14, color: "363636" } },
          { text: "• Peak purchase intent level\n" },
          { text: "• Indicates maximum potential demand\n\n" },
          
          { text: "Revenue Potential\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `$${maxRevenue}\n`, options: { fontSize: 14, color: "363636" } },
          { text: "• Peak revenue per unit\n" },
          { text: "• Use for revenue forecasting" }
        ], {
          x: 1,
          y: 1.5,
          w: 8,
          fontSize: 12,
          lineSpacing: 1.5,
          color: "363636",
        });
      }

      // Add recommendations slide
      slide = pres.addSlide();
      slide.addText("Pricing Recommendations", {
        x: 1,
        y: 0.5,
        fontSize: 24,
        bold: true,
        color: "363636",
      });

      if (isVanWestendorp) {
        let y = 1.5;
        // 1. Primary Price Point
        slide.addText([
          { text: "1. Primary Price Point\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `   • Set initial price at $${currentMetrics?.opp || "N/A"} (OPP)\n` },
          { text: "   • This balances customer price sensitivity\n" }
        ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
        y += 1.1;
        // 2. Price Range Strategy
        slide.addText([
          { text: "2. Price Range Strategy\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `   • Stay within $${currentRange?.[0] || "N/A"} - $${currentRange?.[1] || "N/A"}\n` },
          { text: "   • Use for product variations or tiers\n" }
        ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
        y += 1.1;
        // 3. Competitive Positioning
        slide.addText([
          { text: "3. Competitive Positioning\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `   • Use IDP ($${currentMetrics?.idp || "N/A"}) for market positioning\n` },
          { text: "   • Consider price stress for flexibility\n" }
        ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
        y += 1.1;
        // 4. Implementation Strategy
        slide.addText([
          { text: "4. Implementation Strategy\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: "   • Start with OPP and monitor response\n" },
          { text: "   • Adjust based on market feedback\n" },
          { text: "   • Consider segment-specific pricing" }
        ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
      } else {
        // Calculate metrics before using them
        const optimal = selectedSegment === "overall" ? results.overallResults.optimal : results.segmentResults.find(s => s.segmentVariable === selectedSegment)?.levels.find(l => l.name === selectedLevel)?.optimal;
        const maxPurchaseIntent = currentData ? currentData.reduce((max, point) => Math.max(max, point.values[0]), 0).toFixed(1) : "N/A";
        const maxRevenue = currentData ? currentData.reduce((max, point) => Math.max(max, point.values[1]), 0).toFixed(2) : "N/A";
        let y = 1.5;
        // 1. Revenue Optimization
        slide.addText([
          { text: "1. Revenue Optimization\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `   • Set price at $${optimal || "N/A"} for maximum revenue\n` },
          { text: "   • Monitor purchase intent at this level\n" }
        ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
        y += 1.1;
        // 2. Price Range Strategy
        slide.addText([
          { text: "2. Price Range Strategy\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `   • Test prices between $${currentRange?.[0] || "N/A"} - $${currentRange?.[1] || "N/A"}\n` },
          { text: "   • Use for different market segments\n" }
        ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
        y += 1.1;
        // 3. Demand Management
        slide.addText([
          { text: "3. Demand Management\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `   • Maximum purchase intent: ${maxPurchaseIntent}%\n` },
          { text: "   • Use for inventory and production planning\n" }
        ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
        y += 1.1;
        // 4. Revenue Planning
        slide.addText([
          { text: "4. Revenue Planning\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
          { text: `   • Maximum revenue potential: $${maxRevenue} per unit\n` },
          { text: "   • Use for financial forecasting\n" },
          { text: "   • Consider segment-specific strategies" }
        ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
      }

      await pres.writeFile({ fileName: "pricing-analysis.pptx" });
    } else if (format === "pptx_full") {
      const pres = new pptxgen();
      // Helper to add a result section (graph, insights, recommendations)
      const addSection = (
        title: string,
        data: DataPoint[] | undefined,
        metrics: Metrics | undefined,
        range: Range | undefined,
        optimal: number | string | undefined,
        maxPurchaseIntent: string,
        maxRevenue: string,
        isVanWestendorp: boolean,
        segmentLabel: string
      ) => {
        // Title slide
        let slide = pres.addSlide();
        slide.addText(title, { x: 1, y: 1, fontSize: 24, bold: true });
        slide.addText(segmentLabel, { x: 1, y: 2, fontSize: 18 });
        // Chart slide
        slide = pres.addSlide();
        slide.addText("Price Sensitivity Analysis Chart", { x: 1, y: 0.5, fontSize: 20, bold: true });
        // Try to get the chart image from the DOM if this is the current view, else skip
        if (segmentLabel === getCurrentSegmentLabel()) {
          const canvas = document.querySelector('canvas');
          if (canvas) {
            const chartImage = canvas.toDataURL('image/png');
            slide.addImage({ data: chartImage, x: 1, y: 1.5, w: 8, h: 4.5 });
          }
        }
        // Insights slide
        slide = pres.addSlide();
        slide.addText("Key Insights", { x: 1, y: 0.5, fontSize: 24, bold: true, color: "363636" });
        let y = 1.5;
        if (isVanWestendorp) {
          // ... (reuse Van Westendorp insights code, using metrics/range) ...
          slide.addText([
            { text: "Optimal Price Point (OPP)\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `$${metrics?.opp || "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
            { text: "• Recommended starting price point\n" },
            { text: "• Balances customer price sensitivity\n" },
            { text: "• Minimizes price resistance\n\n" },
            { text: "Indifference Price Point (IDP)\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `$${metrics?.idp || "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
            { text: "• Price point where customers are neutral\n" },
            { text: "• Indicates market equilibrium\n" },
            { text: "• Useful for competitive positioning\n\n" },
            { text: "Acceptable Price Range\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `$${range?.[0] || "N/A"} - $${range?.[1] || "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
            { text: "• Safe pricing zone for your product\n" },
            { text: "• Range width: $" + (range ? (range[1] - range[0]).toFixed(2) : "N/A") + "\n\n" },
            { text: "Price Sensitivity Analysis\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `$${range ? (range[1] - range[0]).toFixed(2) : "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
            { text: "• Higher value indicates more price flexibility\n" },
            { text: "• Lower value suggests price sensitivity\n" },
            { text: "• Use for pricing strategy decisions" }
          ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
        } else {
          slide.addText([
            { text: "Optimal Price Point\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `$${optimal || "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
            { text: "• Revenue-optimized price point\n" },
            { text: "• Balances volume and margin\n" },
            { text: "• Primary pricing recommendation\n\n" },
            { text: "Price Sensitivity Range\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `$${range?.[0] || "N/A"} - $${range?.[1] || "N/A"}\n`, options: { fontSize: 14, color: "363636" } },
            { text: "• Range width: $" + (range ? (range[1] - range[0]).toFixed(2) : "N/A") + "\n" },
            { text: "• Use for price testing and adjustments\n\n" },
            { text: "Purchase Intent Analysis\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `${maxPurchaseIntent}%\n`, options: { fontSize: 14, color: "363636" } },
            { text: "• Peak purchase intent level\n" },
            { text: "• Indicates maximum potential demand\n\n" },
            { text: "Revenue Potential\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `$${maxRevenue}\n`, options: { fontSize: 14, color: "363636" } },
            { text: "• Peak revenue per unit\n" },
            { text: "• Use for revenue forecasting" }
          ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
        }
        // Recommendations slide (reuse recommendations code, using y increments)
        slide = pres.addSlide();
        slide.addText("Pricing Recommendations", { x: 1, y: 0.5, fontSize: 24, bold: true, color: "363636" });
        y = 1.5;
        if (isVanWestendorp) {
          slide.addText([
            { text: "1. Primary Price Point\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `   • Set initial price at $${metrics?.opp || "N/A"} (OPP)\n` },
            { text: "   • This balances customer price sensitivity\n" }
          ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
          y += 1.1;
          slide.addText([
            { text: "2. Price Range Strategy\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `   • Stay within $${range?.[0] || "N/A"} - $${range?.[1] || "N/A"}\n` },
            { text: "   • Use for product variations or tiers\n" }
          ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
          y += 1.1;
          slide.addText([
            { text: "3. Competitive Positioning\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `   • Use IDP ($${metrics?.idp || "N/A"}) for market positioning\n` },
            { text: "   • Consider price stress for flexibility\n" }
          ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
          y += 1.1;
          slide.addText([
            { text: "4. Implementation Strategy\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: "   • Start with OPP and monitor response\n" },
            { text: "   • Adjust based on market feedback\n" },
            { text: "   • Consider segment-specific pricing" }
          ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
        } else {
          slide.addText([
            { text: "1. Revenue Optimization\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `   • Set price at $${optimal || "N/A"} for maximum revenue\n` },
            { text: "   • Monitor purchase intent at this level\n" }
          ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
          y += 1.1;
          slide.addText([
            { text: "2. Price Range Strategy\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `   • Test prices between $${range?.[0] || "N/A"} - $${range?.[1] || "N/A"}\n` },
            { text: "   • Use for different market segments\n" }
          ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
          y += 1.1;
          slide.addText([
            { text: "3. Demand Management\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `   • Maximum purchase intent: ${maxPurchaseIntent}%\n` },
            { text: "   • Use for inventory and production planning\n" }
          ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
          y += 1.1;
          slide.addText([
            { text: "4. Revenue Planning\n", options: { bold: true, fontSize: 16, color: "2F5496" } },
            { text: `   • Maximum revenue potential: $${maxRevenue} per unit\n` },
            { text: "   • Use for financial forecasting\n" },
            { text: "   • Consider segment-specific strategies" }
          ], { x: 1, y, w: 8, fontSize: 12, lineSpacing: 1.5, color: "363636" });
        }
      };
      // Helper to get the current segment label for chart screenshot
      function getCurrentSegmentLabel() {
        if (selectedSegment === "overall") return "Overall Results";
        return `${selectedSegment}: ${selectedLevel}`;
      }
      // Add overall
      const isVanWestendorp = project.analysisType === "van_westendorp";
      addSection(
        "Overall Results",
        results.overallResults.data,
        results.overallResults.metrics,
        results.overallResults.range,
        results.overallResults.optimal,
        results.overallResults.data ? results.overallResults.data.reduce((max, point) => Math.max(max, point.values[0]), 0).toFixed(1) : "N/A",
        results.overallResults.data ? results.overallResults.data.reduce((max, point) => Math.max(max, point.values[1]), 0).toFixed(2) : "N/A",
        isVanWestendorp,
        "Overall Results"
      );
      // Add each segment/level
      results.segmentResults.forEach(segment => {
        segment.levels.forEach(level => {
          addSection(
            `${segment.segmentVariable}: ${level.name}`,
            level.data,
            level.metrics,
            level.range,
            level.optimal,
            level.data ? level.data.reduce((max, point) => Math.max(max, point.values[0]), 0).toFixed(1) : "N/A",
            level.data ? level.data.reduce((max, point) => Math.max(max, point.values[1]), 0).toFixed(2) : "N/A",
            isVanWestendorp,
            `${segment.segmentVariable}: ${level.name}`
          );
        });
      });
      await pres.writeFile({ fileName: "pricing-analysis-full-report.pptx" });
    } else if (format === "csv") {
      if (!currentData) return;

      // Create CSV content
      const headers = isVanWestendorp 
        ? ["Price", "Too Cheap", "Cheap", "Expensive", "Too Expensive"]
        : ["Price", "Purchase Intent", "Revenue"];

      const rows = currentData.map(d => {
        if (isVanWestendorp) {
          return [d.price, ...d.values].join(",");
        } else {
          return [d.price, ...d.values].join(",");
        }
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      
      // Create and download CSV file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `pricing-analysis-${selectedSegment}${selectedLevel ? `-${selectedLevel}` : ""}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === "png") {
      if (!currentData) return;

      // Get the chart canvas element
      const canvas = document.querySelector('canvas');
      if (!canvas) return;

      // Convert canvas to PNG
      const pngUrl = canvas.toDataURL('image/png');
      
      // Create download link
      const link = document.createElement('a');
      link.download = `pricing-analysis-${selectedSegment}${selectedLevel ? `-${selectedLevel}` : ""}.png`;
      link.href = pngUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Get available segments and levels
  const segments = ["overall", ...results.segmentResults.map(s => s.segmentVariable)];
  const levels = selectedSegment === "overall" 
    ? [] 
    : results.segmentResults.find(s => s.segmentVariable === selectedSegment)?.levels.map(l => l.name) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-xl">Analysis Results</h3>
        <div className="space-x-2">
          <button
            onClick={() => handleDownload("pptx")}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            PPTX
          </button>
          <button
            onClick={() => handleDownload("pptx_full")}
            className="px-3 py-1 bg-blue-800 text-white rounded"
          >
            Full Report (PPTX)
          </button>
          <button
            onClick={() => handleDownload("png")}
            className="px-3 py-1 bg-purple-600 text-white rounded"
          >
            PNG
          </button>
          <button
            onClick={() => handleDownload("csv")}
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            CSV
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Segment Variable</label>
          <select
            value={selectedSegment}
            onChange={(e) => {
              setSelectedSegment(e.target.value);
              setSelectedLevel("");
            }}
            className="mt-1 block w-full rounded-md border-gray-300"
          >
            {segments.map((segment) => (
              <option key={segment} value={segment}>
                {segment === "overall" ? "Overall Results" : segment}
              </option>
            ))}
          </select>
        </div>

        {selectedSegment !== "overall" && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Segment Level</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300"
            >
              <option value="">Select level</option>
              {levels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {currentData && (
        <div className="bg-white rounded-lg p-4 shadow">
          <Line
            data={{
              labels: currentData.map((d) => d.price),
              datasets: isVanWestendorp ? [
                {
                  label: "Too Cheap",
                  data: currentData.map((d) => d.values[0]),
                  borderColor: "rgb(75, 192, 192)",
                },
                {
                  label: "Cheap",
                  data: currentData.map((d) => d.values[1]),
                  borderColor: "rgb(54, 162, 235)",
                },
                {
                  label: "Expensive",
                  data: currentData.map((d) => d.values[2]),
                  borderColor: "rgb(255, 99, 132)",
                },
                {
                  label: "Too Expensive",
                  data: currentData.map((d) => d.values[3]),
                  borderColor: "rgb(255, 159, 64)",
                },
              ] : [
                {
                  label: "Purchase Intent",
                  data: currentData.map((d) => d.values[0]),
                  borderColor: "rgb(75, 192, 192)",
                },
                {
                  label: "Revenue",
                  data: currentData.map((d) => d.values[1]),
                  borderColor: "rgb(54, 162, 235)",
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { position: "top" as const },
                title: {
                  display: true,
                  text: isVanWestendorp ? "Van Westendorp Price Sensitivity" : "Gabor-Granger Analysis",
                },
              },
            }}
          />
        </div>
      )}

      {currentData && currentRange && (
        <div className="grid grid-cols-2 gap-4">
          {isVanWestendorp ? (
            <>
              <div className="bg-white rounded-lg p-4 shadow">
                <h4 className="font-semibold mb-2">Optimal Price Point (OPP)</h4>
                <p className="text-2xl">${currentMetrics?.opp || "N/A"}</p>
                <p className="text-sm text-gray-600">Point of intersection between "too cheap" and "too expensive" curves</p>
                <div className="mt-2 text-sm">
                  <p className="font-medium">Key Insights:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Recommended starting price point</li>
                    <li>Balances customer price sensitivity</li>
                    <li>Minimizes price resistance</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <h4 className="font-semibold mb-2">Indifference Price Point (IDP)</h4>
                <p className="text-2xl">${currentMetrics?.idp || "N/A"}</p>
                <p className="text-sm text-gray-600">Point of intersection between "cheap" and "expensive" curves</p>
                <div className="mt-2 text-sm">
                  <p className="font-medium">Key Insights:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Price point where customers are neutral</li>
                    <li>Indicates market equilibrium</li>
                    <li>Useful for competitive positioning</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <h4 className="font-semibold mb-2">Acceptable Price Range</h4>
                <p className="text-2xl">${currentRange[0]} - ${currentRange[1]}</p>
                <p className="text-sm text-gray-600">Range between PMC and IPD points</p>
                <div className="mt-2 text-sm">
                  <p className="font-medium">Key Insights:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Safe pricing zone for your product</li>
                    <li>Lower bound: ${currentRange[0]} (PMC)</li>
                    <li>Upper bound: ${currentRange[1]} (IPD)</li>
                    <li>Range width: ${(currentRange[1] - currentRange[0]).toFixed(2)}</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <h4 className="font-semibold mb-2">Price Sensitivity Analysis</h4>
                <p className="text-2xl">${currentRange[1] - currentRange[0]}</p>
                <p className="text-sm text-gray-600">Price Stress (Difference between upper and lower bounds)</p>
                <div className="mt-2 text-sm">
                  <p className="font-medium">Key Insights:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Higher value indicates more price flexibility</li>
                    <li>Lower value suggests price sensitivity</li>
                    <li>Use for pricing strategy decisions</li>
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-lg p-4 shadow">
                <h4 className="font-semibold mb-2">Optimal Price Point</h4>
                <p className="text-2xl">${selectedSegment === "overall" ? results.overallResults.optimal : results.segmentResults.find(s => s.segmentVariable === selectedSegment)?.levels.find(l => l.name === selectedLevel)?.optimal || "N/A"}</p>
                <p className="text-sm text-gray-600">Price point maximizing revenue</p>
                <div className="mt-2 text-sm">
                  <p className="font-medium">Key Insights:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Revenue-optimized price point</li>
                    <li>Balances volume and margin</li>
                    <li>Primary pricing recommendation</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <h4 className="font-semibold mb-2">Price Sensitivity Range</h4>
                <p className="text-2xl">${currentRange[0]} - ${currentRange[1]}</p>
                <p className="text-sm text-gray-600">Range of viable prices</p>
                <div className="mt-2 text-sm">
                  <p className="font-medium">Key Insights:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Lower bound: ${currentRange[0]} (Minimum viable price)</li>
                    <li>Upper bound: ${currentRange[1]} (Maximum acceptable price)</li>
                    <li>Range width: ${(currentRange[1] - currentRange[0]).toFixed(2)}</li>
                    <li>Use for price testing and adjustments</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <h4 className="font-semibold mb-2">Purchase Intent Analysis</h4>
                <p className="text-2xl">
                  {currentData.reduce((max, point) => Math.max(max, point.values[0]), 0).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">Maximum purchase intent percentage</p>
                <div className="mt-2 text-sm">
                  <p className="font-medium">Key Insights:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Peak purchase intent level</li>
                    <li>Indicates maximum potential demand</li>
                    <li>Use for market potential assessment</li>
                  </ul>
                </div>
              </div>
              <div className="bg-white rounded-lg p-4 shadow">
                <h4 className="font-semibold mb-2">Revenue Potential</h4>
                <p className="text-2xl">
                  ${currentData.reduce((max, point) => Math.max(max, point.values[1]), 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Maximum potential revenue per unit</p>
                <div className="mt-2 text-sm">
                  <p className="font-medium">Key Insights:</p>
                  <ul className="list-disc pl-5 mt-1">
                    <li>Peak revenue per unit</li>
                    <li>Indicates maximum revenue potential</li>
                    <li>Use for revenue forecasting</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800"
        >
          Back
        </button>
      </div>
    </div>
  );
}
