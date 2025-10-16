"use client";

import React, { useState, useEffect, useRef, MouseEvent } from "react";
import Image from "next/image";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Trash2,
} from "lucide-react";

interface TradeData {
  date: string;
  pnl: number;
  entry?: number;
  sl?: number;
  tp?: number;
}

const formatPNL = (value: number): string => {
  if (value === 0) return "₱0";
  const sign = value > 0 ? "+" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = (abs / 1000).toFixed(abs % 1000 === 0 ? 0 : 1);
    return `${sign}₱${k}K`;
  }
  return `${sign}₱${abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const TradingJournal: React.FC = () => {
  const [data, setData] = useState<TradeData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [entryValue, setEntryValue] = useState("");
  const [slValue, setSlValue] = useState("");
  const [tpValue, setTpValue] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    "daily" | "weekly" | "monthly"
  >("monthly");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Load data from localStorage on mount
  useEffect(() => {
    const storageKey = "tradingJournalData"; // TODO: Change this key if you want a different storage namespace

    if (typeof window !== "undefined") {
      try {
        const savedData = localStorage.getItem(storageKey);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (Array.isArray(parsedData)) {
            setData(parsedData);
            console.log(
              "Data loaded from localStorage:",
              parsedData.length,
              "trades"
            );
            return;
          }
        }
      } catch (error) {
        console.error("Failed to load from localStorage:", error);
        localStorage.removeItem(storageKey); // Clear bad data
      }
    }

    // Start with empty data to begin at 0
    setData([]);
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    if (data.length > 0 && typeof window !== "undefined") {
      try {
        localStorage.setItem("tradingJournalData", JSON.stringify(data));
        console.log("Data saved to localStorage:", data.length, "trades");
      } catch (error) {
        console.error("Failed to save to localStorage:", error);
      }
    } else if (typeof window !== "undefined") {
      // Clear localStorage if no data
      localStorage.removeItem("tradingJournalData");
    }
  }, [data]);

  // Cleanup preview URL on unmount or modal close
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Clear all data function
  const clearAllData = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("tradingJournalData");
    }
    setData([]);
    console.log("All data cleared. Starting fresh from 0.");
  };

  const getTrade = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return data.find((d) => d.date === dateStr);
  };

  const updateTrade = (
    pnl: number,
    entry?: number,
    sl?: number,
    tp?: number
  ) => {
    if (!editingDate) return;
    setData((prev) => {
      const idx = prev.findIndex((d) => d.date === editingDate);
      if (idx > -1) {
        const newData = [...prev];
        newData[idx] = {
          date: editingDate,
          pnl,
          entry: entry ?? newData[idx].entry,
          sl: sl ?? newData[idx].sl,
          tp: tp ?? newData[idx].tp,
        };
        return newData;
      }
      return [...prev, { date: editingDate, pnl, entry, sl, tp }];
    });
    setIsModalOpen(false);
    setInputValue("");
    setEntryValue("");
    setSlValue("");
    setTpValue("");
  };

  const handleCellClick = (
    date: Date,
    isCurrent: boolean,
    e?: MouseEvent<HTMLButtonElement>
  ) => {
    if (!isCurrent) return;
    const dateStr = date.toISOString().split("T")[0];
    const trade = getTrade(date);
    setEditingDate(dateStr);
    setInputValue((trade?.pnl || 0).toString());
    setEntryValue(trade?.entry?.toString() || "");
    setSlValue(trade?.sl?.toString() || "");
    setTpValue(trade?.tp?.toString() || "");
    setIsModalOpen(true);
    if (e) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleCellMouseEnter = (
    dateStr: string,
    e: MouseEvent<HTMLButtonElement>
  ) => {
    setHoveredDate(dateStr);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleCellMouseLeave = () => {
    setHoveredDate(null);
  };

  const calculateStats = (timeframe?: "daily" | "weekly" | "monthly") => {
    let periodData = data;
    if (timeframe === "daily") {
      const todayStr = new Date().toISOString().split("T")[0];
      periodData = data.filter((d) => d.date === todayStr);
    } else if (timeframe === "weekly") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];
      periodData = data.filter((d) => d.date >= weekAgoStr);
    } else {
      // monthly
      periodData = data.filter((d) => {
        const dDate = new Date(d.date);
        return (
          dDate.getMonth() === currentMonth &&
          dDate.getFullYear() === currentYear
        );
      });
    }

    const total = periodData.reduce((sum, d) => sum + d.pnl, 0);
    const traded = periodData.filter((d) => d.pnl !== 0).length;
    const wins = periodData.filter((d) => d.pnl > 0).length;
    const losses = periodData.filter((d) => d.pnl < 0).length;
    const winRate = traded > 0 ? ((wins / traded) * 100).toFixed(1) : "0";

    // Calculate win streak
    let currentStreak = 0;
    let maxStreak = 0;
    const sortedData = [...periodData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const day of sortedData) {
      if (day.pnl > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (day.pnl < 0) {
        currentStreak = 0;
      }
    }

    // Calculate weekly profit (last 7 days) - always
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];
    const weekData = data.filter((d) => d.date >= weekAgoStr);
    const weeklyProfit = weekData.reduce((sum, d) => sum + d.pnl, 0);

    return { total, traded, wins, losses, winRate, maxStreak, weeklyProfit };
  };

  const generateShareImage = async (
    forPreview = false
  ): Promise<string | null> => {
    // Only run in browser
    if (typeof window === "undefined") return null;

    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const dpr = window.devicePixelRatio || 1;
    const width = 1363; // TODO: Adjust canvas width if needed for your design
    const height = 763; // TODO: Adjust canvas height if needed for your design
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    const { total, traded, wins, losses, winRate, maxStreak, weeklyProfit } =
      calculateStats(selectedTimeframe);
    const isPositive = total >= 0;
    const boxColor = isPositive ? "#22c55e" : "#ef4444"; // TODO: Customize colors for positive/negative P&L to match your image (e.g., green for positive, red for negative)

    // Compute period title
    let periodTitle = "";
    if (selectedTimeframe === "monthly") {
      periodTitle = `${monthNames[currentMonth]} ${currentYear}`;
    } else if (selectedTimeframe === "daily") {
      const today = new Date();
      periodTitle = today.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } else {
      // weekly
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      periodTitle = `Week of ${weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} - ${weekEnd.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    }

    // Load background image from public folder with fading style effect
    const img = document.createElement("img");
    return new Promise((resolve) => {
      img.onload = () => {
        if (!ctx || !canvas) {
          resolve(null);
          return;
        }
        // Draw background image
        ctx.globalAlpha = 0.8; // TODO: Adjust opacity for background image to match your shard/fading effect
        ctx.drawImage(img, 0, 0, width, height);
        ctx.globalAlpha = 1.0;
        // Overlay a subtle dark gradient for enhanced fading/shard effect
        const overlayGradient = ctx.createLinearGradient(0, 0, 0, height);
        overlayGradient.addColorStop(0, "rgba(0, 0, 0, 0.3)"); // TODO: Customize gradient stops for your blue shard background
        overlayGradient.addColorStop(1, "rgba(5, 5, 5, 0.7)");
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(0, 0, width, height);
        drawContent();
      };
      img.onerror = () => {
        // Fallback to dark gradient with simulated fading effect
        if (!ctx) {
          resolve(null);
          return;
        }
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#050505"); // TODO: Customize fallback gradient colors to blue/black like your image
        gradient.addColorStop(0.3, "rgba(10, 10, 26, 0.8)");
        gradient.addColorStop(1, "#0a0a1a");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        drawContent();
      };
      img.src = "/bg-result-share.png"; // TODO: Replace with your shard background image path, e.g., "/shard-bg.png"

      function drawContent() {
        if (!ctx || !canvas) {
          resolve(null);
          return;
        }

        // Title top left with glow
        ctx.shadowColor = "#3b82f6"; // TODO: Change glow color to blue (#3b82f6) or match your image's blue accents
        ctx.shadowBlur = 12 * dpr;
        ctx.font = `bold ${52 * dpr}px Inter, sans-serif`; // TODO: Adjust font size and family if needed
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("Trading Journal", 60, 60 / dpr); // TODO: Change text to something like "1D Realized P&L" or your app name

        ctx.shadowBlur = 0;
        ctx.font = `${28 * dpr}px Inter, sans-serif`;
        ctx.fillStyle = "#888"; // TODO: Adjust subtitle color
        ctx.fillText(periodTitle, 60, 120 / dpr); // TODO: Customize period title format, e.g., add "4 wallets" if relevant

        // Large P&L centered with rounded box and glow
        const pnlText = formatPNL(total);
        ctx.font = `bold ${120 * dpr}px Inter, sans-serif`; // TODO: Make font larger/smaller to match your image's big P&L text
        const pnlMetrics = ctx.measureText(pnlText);
        const pnlWidth = pnlMetrics.width;
        const pnlHeight =
          pnlMetrics.actualBoundingBoxAscent +
          pnlMetrics.actualBoundingBoxDescent;
        const boxPadding = 40 / dpr;
        const boxX = (width - pnlWidth) / 2 - boxPadding;
        const boxY = 200 / dpr; // TODO: Adjust Y position to center vertically like in your image
        const boxW = pnlWidth + 2 * boxPadding;
        const boxH = pnlHeight + 20 / dpr;
        const cornerRadius = 20 / dpr; // TODO: Change radius for rounded corners to match your design

        // Draw rounded rect for P&L box
        ctx.shadowColor = boxColor;
        ctx.shadowBlur = 20 * dpr; // TODO: Increase/decrease blur for glow effect
        ctx.fillStyle = boxColor;
        // Note: roundRect is a modern Canvas API; if not supported, implement a custom rounded rect function here
        ctx.roundRect(boxX, boxY, boxW, boxH, cornerRadius);
        ctx.fill();
        ctx.shadowBlur = 0;

        // P&L text inside box with inner glow
        ctx.shadowColor = isPositive ? "#22c55e" : "#ef4444";
        ctx.shadowBlur = 15 * dpr;
        ctx.fillStyle = "#ffffff"; // TODO: Change to black or blue for better contrast like in your image
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pnlText, width / 2, boxY + boxH / 2);
        ctx.shadowBlur = 0;

        // Sub stats below large P&L, left aligned labels, right aligned values
        const subY = boxY + boxH + 40 / dpr; // TODO: Adjust starting Y for sub-stats block
        const labelX = 60; // TODO: Adjust left margin for labels
        const valueX = width - 200; // TODO: Adjust right margin for values
        const lineHeight = 35 / dpr; // TODO: Adjust spacing between rows
        ctx.font = `${24 * dpr}px Inter, sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = "#888";

        // Win Rate row
        ctx.fillText("Win Rate", labelX, subY); // TODO: Change label to "PNL Bought" or match your image
        ctx.textAlign = "right";
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 8 * dpr;
        ctx.fillStyle = "#22c55e"; // TODO: Customize value color
        ctx.fillText(`${winRate}%`, valueX, subY);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#888";
        ctx.textAlign = "left";

        // Trading Days row
        ctx.fillText("Trading Days", labelX, subY + lineHeight); // TODO: Change to "Total Bought" etc.
        ctx.textAlign = "right";
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 8 * dpr;
        ctx.fillStyle = "#06b6d4";
        ctx.fillText(traded.toString(), valueX, subY + lineHeight);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#888";
        ctx.textAlign = "left";

        // Win Streak row
        ctx.fillText("Win Streak", labelX, subY + 2 * lineHeight); // TODO: Customize or remove rows to fit your 4-5 key stats
        ctx.textAlign = "right";
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 8 * dpr;
        ctx.fillStyle = "#f59e0b";
        ctx.fillText(maxStreak.toString(), valueX, subY + 2 * lineHeight);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#888";
        ctx.textAlign = "left";

        // Wins / Losses row
        ctx.fillText("Wins / Losses", labelX, subY + 3 * lineHeight);
        ctx.textAlign = "right";
        const wlText = `${wins} / ${losses}`;
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 8 * dpr;
        ctx.fillStyle = "#ef4444";
        ctx.fillText(wlText, valueX, subY + 3 * lineHeight);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#888";
        ctx.textAlign = "left";

        // Weekly P&L row
        ctx.fillText("Weekly P&L", labelX, subY + 4 * lineHeight); // TODO: Change to "Total Sold" or add percentage like "+20%"
        ctx.textAlign = "right";
        const weeklyColor = weeklyProfit >= 0 ? "#22c55e" : "#ef4444";
        ctx.shadowColor = weeklyColor;
        ctx.shadowBlur = 8 * dpr;
        ctx.fillStyle = weeklyColor;
        ctx.fillText(formatPNL(weeklyProfit), valueX, subY + 4 * lineHeight);
        ctx.shadowBlur = 0;

        // Bottom left @trader with glow
        const bottomY = height - 100 / dpr; // TODO: Adjust bottom positioning
        ctx.textAlign = "left";
        ctx.shadowColor = "#3b82f6";
        ctx.shadowBlur = 10 * dpr;
        ctx.font = `bold ${44 * dpr}px Inter, sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.fillText("@trader", 60, bottomY); // TODO: Change to your username like "@simple" with avatar box if needed

        // Slogan bottom center
        ctx.textAlign = "center";
        ctx.font = `${24 * dpr}px Inter, sans-serif`;
        ctx.fillStyle = "#555"; // TODO: Customize slogan text and color, e.g., "axiom.trade Save 10% off fees"
        ctx.fillText("Track • Analyze • Improve", width / 2, height - 40 / dpr);

        // Generate blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              if (forPreview) {
                setPreviewUrl(url);
              } else {
                const a = document.createElement("a");
                a.href = url;
                a.download = `trading-${selectedTimeframe}-${monthNames[currentMonth]}-${currentYear}.png`; // TODO: Customize download filename
                a.click();
                URL.revokeObjectURL(url);
                setShowShareModal(false);
              }
              resolve(url);
            } else {
              resolve(null);
            }
          },
          "image/png",
          1.0
        );
      }
    });
  };

  const handleOpenShareModal = async () => {
    setShowShareModal(true);
    if (!previewUrl) {
      await generateShareImage(true);
    }
  };

  const handleDownload = async () => {
    if (previewUrl) {
      const a = document.createElement("a");
      a.href = previewUrl;
      a.download = `trading-${selectedTimeframe}-${monthNames[currentMonth]}-${currentYear}.png`;
      a.click();
      setShowShareModal(false);
    }
  };

  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const dayOfWeek = firstDay.getDay() || 7;
    const padding = dayOfWeek - 1;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];

    for (let i = 1 - padding; i <= lastDay; i++) {
      days.push(new Date(currentYear, currentMonth, i));
    }

    return days;
  };

  const { total, traded, wins, losses, winRate } = calculateStats();
  const calendarDays = generateCalendarDays();
  const hoveredTrade = hoveredDate
    ? data.find((d) => d.date === hoveredDate)
    : null;

  return (
    <div className="min-h-screen bg-black text-white relative">
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4 sm:gap-0">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-2">
                Trading Journal
              </h1>
              <p className="text-zinc-400 text-sm sm:text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Track your daily P&L performance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenShareModal}
                className="flex items-center gap-2 bg-white text-black hover:bg-zinc-100 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={clearAllData}
                className="flex items-center gap-2 bg-red-400 hover:bg-red-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
                title="Clear all data and start from 0"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6 hover:border-zinc-700 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-zinc-400 font-medium">
                  Total P&L
                </span>
                {total >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div
                className={`text-xl sm:text-2xl lg:text-3xl font-bold ${
                  total >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {formatPNL(total)}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6 hover:border-zinc-700 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-zinc-400 font-medium">
                  Win Rate
                </span>
                <BarChart3 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-400">
                {winRate}%
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6 hover:border-zinc-700 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm text-zinc-400 font-medium">
                  Trading Days
                </span>
                <Calendar className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                {traded}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6 hover:border-zinc-700 transition-all duration-200">
              <div className="text-xs sm:text-sm text-zinc-400 font-medium mb-2">
                Win / Loss
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold">
                <span className="text-emerald-400">{wins}</span>
                <span className="text-zinc-600 mx-2">/</span>
                <span className="text-red-400">{losses}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6 relative">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear(currentYear - 1);
                } else {
                  setCurrentMonth(currentMonth - 1);
                }
              }}
              className="flex items-center justify-center w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all duration-200 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h2 className="text-lg sm:text-xl font-bold">
              {monthNames[currentMonth]} {currentYear}
            </h2>

            <button
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear(currentYear + 1);
                } else {
                  setCurrentMonth(currentMonth + 1);
                }
              }}
              className="flex items-center justify-center w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all duration-200 active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 sm:gap-3 relative">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-center text-xs sm:text-sm font-semibold text-zinc-500 pb-2"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((date, idx) => {
              const trade = getTrade(date);
              const pnl = trade?.pnl || 0;
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = new Date().toDateString() === date.toDateString();
              const dateStr = date.toISOString().split("T")[0];

              if (!isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="h-16 sm:h-20 lg:h-24 rounded-lg bg-zinc-800/20"
                  />
                );
              }

              return (
                <button
                  key={idx}
                  onClick={(e) => handleCellClick(date, true, e)}
                  onMouseEnter={(e) => handleCellMouseEnter(dateStr, e)}
                  onMouseLeave={handleCellMouseLeave}
                  className={`h-16 sm:h-20 lg:h-24 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer relative group overflow-hidden
                    ${
                      pnl > 0
                        ? "bg-emerald-500/10 border-2 border-emerald-500/30 hover:border-emerald-500/60 hover:bg-emerald-500/20"
                        : ""
                    }
                    ${
                      pnl < 0
                        ? "bg-red-500/10 border-2 border-red-500/30 hover:border-red-500/60 hover:bg-red-500/20"
                        : ""
                    }
                    ${
                      pnl === 0
                        ? "bg-zinc-800/50 border-2 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800"
                        : ""
                    }
                    ${
                      isToday
                        ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-zinc-900"
                        : ""
                    }
                  `}
                >
                  <span className="absolute top-1 left-1.5 text-zinc-400 text-xs">
                    {date.getDate()}
                  </span>
                  <div className="flex flex-col items-center justify-center h-full pt-2 px-1">
                    <span
                      className={`text-xs sm:text-sm font-bold truncate ${
                        pnl > 0
                          ? "text-emerald-400"
                          : pnl < 0
                          ? "text-red-400"
                          : "text-zinc-600"
                      }`}
                    >
                      {pnl > 0 ? "+" : pnl < 0 ? "-" : ""}₱
                      {Math.abs(pnl).toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-all duration-200" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDate && hoveredTrade && (
        <div
          className="fixed bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm shadow-2xl z-50 whitespace-nowrap"
          style={{
            left: `${tooltipPos.x + 10}px`,
            top: `${tooltipPos.y - 10}px`,
          }}
        >
          <div className="space-y-1">
            <p>
              <span className="text-zinc-400">Entry:</span> ₱
              {hoveredTrade.entry?.toFixed(2)}
            </p>
            <p>
              <span className="text-zinc-400">SL:</span> ₱
              {hoveredTrade.sl?.toFixed(2)}
            </p>
            <p>
              <span className="text-zinc-400">TP:</span> ₱
              {hoveredTrade.tp?.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Enter Trade Details</h2>{" "}
            {/* TODO: Customize modal title if needed */}
            <div className="space-y-3 mb-4">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  updateTrade(
                    parseFloat(inputValue) || 0,
                    parseFloat(entryValue) || undefined,
                    parseFloat(slValue) || undefined,
                    parseFloat(tpValue) || undefined
                  )
                }
                className="w-full p-3 bg-zinc-800 text-white text-xl text-center rounded-lg border-2 border-zinc-700 focus:outline-none focus:border-emerald-500 transition-all duration-200"
                step="0.01"
                placeholder="P&L (₱)"
                autoFocus
              />
              <input
                type="number"
                value={entryValue}
                onChange={(e) => setEntryValue(e.target.value)}
                className="w-full p-2.5 bg-zinc-800 text-white rounded-lg border-2 border-zinc-700 focus:outline-none focus:border-blue-500 transition-all duration-200"
                step="0.01"
                placeholder="Entry Price (₱)"
              />
              <input
                type="number"
                value={slValue}
                onChange={(e) => setSlValue(e.target.value)}
                className="w-full p-2.5 bg-zinc-800 text-white rounded-lg border-2 border-zinc-700 focus:outline-none focus:border-red-500 transition-all duration-200"
                step="0.01"
                placeholder="Stop Loss (₱)"
              />
              <input
                type="number"
                value={tpValue}
                onChange={(e) => setTpValue(e.target.value)}
                className="w-full p-2.5 bg-zinc-800 text-white rounded-lg border-2 border-zinc-700 focus:outline-none focus:border-green-500 transition-all duration-200"
                step="0.01"
                placeholder="Take Profit (₱)"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  updateTrade(
                    parseFloat(inputValue) || 0,
                    parseFloat(entryValue) || undefined,
                    parseFloat(slValue) || undefined,
                    parseFloat(tpValue) || undefined
                  )
                }
                className="flex-1 bg-white text-black hover:bg-zinc-100 font-semibold py-2.5 rounded-lg transition-all duration-200 active:scale-95"
              >
                Save
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => {
            setShowShareModal(false);
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }
          }}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-6">Share Trading Card</h2>{" "}
            {/* TODO: Customize modal title */}
            {/* Timeframe Select */}
            <div className="mb-6">
              <label className="block text-sm text-zinc-400 mb-2 font-medium">
                Select Timeframe
              </label>
              <select
                value={selectedTimeframe}
                onChange={(e) => {
                  setSelectedTimeframe(
                    e.target.value as "daily" | "weekly" | "monthly"
                  );
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                  }
                  setPreviewUrl(null);
                  generateShareImage(true);
                }}
                className="w-full p-3 bg-zinc-800 text-white rounded-lg border-2 border-zinc-700 focus:outline-none focus:border-emerald-500 transition-all duration-200 cursor-pointer"
              >
                <option value="daily">Daily Performance</option>{" "}
                {/* TODO: Customize options if you want different timeframes */}
                <option value="weekly">Weekly Performance</option>
                <option value="monthly">Monthly Performance</option>
              </select>
            </div>
            {/* Preview Image */}
            {previewUrl ? (
              <div className="mb-6">
                <label className="block text-sm text-zinc-400 mb-3 font-medium">
                  Preview
                </label>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <Image
                    src={previewUrl}
                    alt="Trading Card Preview"
                    width={1363}
                    height={763}
                    unoptimized
                    className="w-full h-auto rounded-lg shadow-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="mb-6 bg-zinc-800/50 rounded-xl p-8 border border-zinc-700 flex items-center justify-center">
                <div className="text-center text-zinc-500">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-3"></div>
                  <p className="text-sm">Generating preview...</p>
                </div>
              </div>
            )}
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
                disabled={!previewUrl}
              >
                <Download className="w-4 h-4" />
                Download Image
              </button>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingJournal;
