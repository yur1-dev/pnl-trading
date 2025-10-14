"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";

interface DayData {
  date: string;
  pnl: number;
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
  const [data, setData] = useState<DayData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
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

  useEffect(() => {
    const generateSampleData = () => {
      const sampleData: DayData[] = [];
      const today = new Date();
      for (let i = 0; i < 15; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        const pnl = (Math.random() - 0.4) * 2000;
        sampleData.push({
          date: date.toISOString().split("T")[0],
          pnl: Math.round(pnl * 100) / 100,
        });
      }
      setData(sampleData);
    };
    generateSampleData();
  }, []);

  const getPNL = (date: Date): number => {
    const dateStr = date.toISOString().split("T")[0];
    return data.find((d) => d.date === dateStr)?.pnl || 0;
  };

  const updatePNL = (value: number) => {
    if (!editingDate) return;
    setData((prev) => {
      const idx = prev.findIndex((d) => d.date === editingDate);
      if (idx > -1) {
        const newData = [...prev];
        newData[idx] = { date: editingDate, pnl: value };
        return newData;
      }
      return [...prev, { date: editingDate, pnl: value }];
    });
    setIsModalOpen(false);
    setInputValue("");
  };

  const handleCellClick = (date: Date, isCurrent: boolean) => {
    if (!isCurrent) return;
    const dateStr = date.toISOString().split("T")[0];
    const pnl = getPNL(date);
    setEditingDate(dateStr);
    setInputValue(pnl === 0 ? "" : pnl.toString());
    setIsModalOpen(true);
  };

  const calculateStats = () => {
    const monthData = data.filter((d) => {
      const dDate = new Date(d.date);
      return (
        dDate.getMonth() === currentMonth && dDate.getFullYear() === currentYear
      );
    });

    const total = monthData.reduce((sum, d) => sum + d.pnl, 0);
    const traded = monthData.filter((d) => d.pnl !== 0).length;
    const wins = monthData.filter((d) => d.pnl > 0).length;
    const losses = monthData.filter((d) => d.pnl < 0).length;
    const winRate = traded > 0 ? ((wins / traded) * 100).toFixed(1) : "0";

    return { total, traded, wins, losses, winRate };
  };

  const generateShareImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { total, traded, wins, losses, winRate } = calculateStats();
    const isPositive = total >= 0;

    canvas.width = 1080;
    canvas.height = 1440;

    const gradient = ctx.createLinearGradient(0, 0, 1080, 1440);
    gradient.addColorStop(0, "#0a0a0a");
    gradient.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1440);

    ctx.fillStyle = "rgba(34, 197, 94, 0.05)";
    ctx.beginPath();
    ctx.arc(150, 250, 300, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 72px -apple-system, BlinkMacSystemFont, Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText("Trading Journal", 80, 140);

    ctx.font = "38px -apple-system, BlinkMacSystemFont, Arial";
    ctx.fillStyle = "#71717a";
    ctx.fillText(`${monthNames[currentMonth]} ${currentYear}`, 80, 200);

    ctx.font = "bold 160px -apple-system, BlinkMacSystemFont, Arial";
    ctx.fillStyle = isPositive ? "#22c55e" : "#ef4444";
    ctx.textAlign = "center";
    ctx.fillText(formatPNL(total), 540, 420);

    const drawStatCard = (
      x: number,
      y: number,
      label: string,
      value: string,
      color: string
    ) => {
      ctx.fillStyle = "#18181b";
      ctx.fillRect(x, y, 220, 160);
      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 220, 160);

      ctx.font = "bold 64px -apple-system, BlinkMacSystemFont, Arial";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.fillText(value, x + 110, y + 90);

      ctx.font = "26px -apple-system, BlinkMacSystemFont, Arial";
      ctx.fillStyle = "#71717a";
      ctx.fillText(label, x + 110, y + 130);
    };

    drawStatCard(80, 560, "Days", traded.toString(), "#06b6d4");
    drawStatCard(340, 560, "Win Rate", `${winRate}%`, "#22c55e");
    drawStatCard(600, 560, "Wins", wins.toString(), "#22c55e");
    drawStatCard(780, 560, "Losses", losses.toString(), "#ef4444");

    ctx.fillStyle = "#52525b";
    ctx.font = "22px -apple-system, BlinkMacSystemFont, Arial";
    ctx.textAlign = "center";
    ctx.fillText("Track • Analyze • Improve", 540, 1360);

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `trading-${monthNames[currentMonth]}-${currentYear}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
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

  return (
    <div className="min-h-screen bg-black text-white">
      <canvas ref={canvasRef} className="hidden" />

      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                Trading Journal
              </h1>
              <p className="text-zinc-400 text-sm sm:text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Track your daily P&L performance
              </p>
            </div>
            <button
              onClick={generateShareImage}
              className="flex items-center gap-2 bg-white text-black hover:bg-zinc-100 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                className={`text-2xl sm:text-3xl font-bold ${
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
              <div className="text-2xl sm:text-3xl font-bold text-emerald-400">
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
              <div className="text-2xl sm:text-3xl font-bold text-white">
                {traded}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6 hover:border-zinc-700 transition-all duration-200">
              <div className="text-xs sm:text-sm text-zinc-400 font-medium mb-2">
                Win / Loss
              </div>
              <div className="text-2xl sm:text-3xl font-bold">
                <span className="text-emerald-400">{wins}</span>
                <span className="text-zinc-600 mx-2">/</span>
                <span className="text-red-400">{losses}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
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
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-center text-xs sm:text-sm font-semibold text-zinc-500 pb-2"
              >
                {day}
              </div>
            ))}

            {calendarDays.map((date, idx) => {
              const pnl = getPNL(date);
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = new Date().toDateString() === date.toDateString();

              if (!isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="h-20 sm:h-24 rounded-lg bg-zinc-800/20"
                  />
                );
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleCellClick(date, true)}
                  className={`h-20 sm:h-24 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer relative group overflow-hidden
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
                  <div className="flex flex-col items-center justify-center h-full pt-2">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-6">Enter P&L</h2>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && updatePNL(parseFloat(inputValue) || 0)
              }
              className="w-full p-4 bg-zinc-800 text-white text-3xl text-center rounded-xl border-2 border-zinc-700 focus:outline-none focus:border-emerald-500 mb-6 transition-all duration-200"
              step="0.01"
              placeholder="0.00"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => updatePNL(parseFloat(inputValue) || 0)}
                className="flex-1 bg-white text-black hover:bg-zinc-100 font-semibold py-3 rounded-xl transition-all duration-200 active:scale-95"
              >
                Save
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingJournal;
