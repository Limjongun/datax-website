import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import GenerateReportButton from '@/components/dashboard/GenerateReportButton';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  // Fetch real data from database
  const datasets = await prisma.dataset.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' }
  });

  const reports = await prisma.report.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  const totalDatasets = datasets.length;
  const totalRows = datasets.reduce((acc, curr) => acc + curr.rowCount, 0);

  // Formatting large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Welcome back, {session.user.name?.split(' ')[0] || 'User'}! <span role="img" aria-label="wave">👋</span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Here's what's happening with your data today.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard 
          title="Total Datasets" 
          value={totalDatasets.toString()} 
          change="" 
          changeType="positive"
          icon="icon-database"
          chart="line-up"
        />
        <KpiCard 
          title="Total Rows" 
          value={formatNumber(totalRows)} 
          change="" 
          changeType="positive"
          icon="icon-bar-chart"
          chart="line-up"
        />
        <KpiCard 
          title="Total Columns" 
          value={datasets.reduce((acc, curr) => acc + curr.columnCount, 0).toString()} 
          change="" 
          changeType="positive"
          icon="icon-pie-chart"
          chart="line-up"
        />
        <KpiCard 
          title="AI Insights" 
          value="Ready" 
          change="" 
          changeType="positive"
          icon="icon-sparkles"
          chart="line-up"
        />
      </div>

      {/* Visualizations & Reports Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">List Datasets & Visualisasi</h2>
            <Link href="/visualization">
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Lihat Semua</button>
            </Link>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
            {datasets.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-64 overflow-y-auto">
                {datasets.slice(0, 4).map(dataset => (
                  <div key={dataset.id} className="p-4 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">{dataset.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Status: {dataset.rowCount > 0 ? 'Ready' : 'Pending'}</p>
                    </div>
                    <Link href={`/visualization?dataset=${dataset.id}`}>
                      <button className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                        Buat Visualisasi
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">Belum ada dataset.</div>
            )}
          </div>
        </div>
        
        <div className="col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Report List</h2>
            <Link href="/reports">
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Semua</button>
            </Link>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 p-4 space-y-3 max-h-64 overflow-y-auto">
            {reports.length > 0 ? reports.map(report => (
              <div key={report.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md hover:shadow-sm transition-shadow cursor-pointer">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{report.title}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                  <Link href={`/report-builder?id=${report.id}`}>
                    <span className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Lihat &rarr;</span>
                  </Link>
                </div>
              </div>
            )) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">Belum ada laporan tersimpan.</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Recent Datasets</h2>
            <Link href="/datasets">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                + Upload Dataset
              </button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
              <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 font-medium">Dataset Name</th>
                  <th className="px-4 py-3 font-medium">Rows</th>
                  <th className="px-4 py-3 font-medium">Columns</th>
                  <th className="px-4 py-3 font-medium">Uploaded Date</th>
                </tr>
              </thead>
              <tbody>
                {datasets.length > 0 ? datasets.slice(0, 5).map((dataset) => (
                  <tr key={dataset.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 line-clamp-1">{dataset.name}</td>
                    <td className="px-4 py-3">{dataset.rowCount.toLocaleString()}</td>
                    <td className="px-4 py-3">{dataset.columnCount}</td>
                    <td className="px-4 py-3">{new Date(dataset.createdAt).toLocaleDateString()}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      No datasets found. Upload one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="col-span-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-900/50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
            <span role="img" aria-label="sparkles">✨</span> AI Analyst Insights
          </h2>
          <div className="space-y-4">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-lg border border-blue-100/50 dark:border-blue-800/30">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">System Ready</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                You have uploaded {totalDatasets} datasets containing {formatNumber(totalRows)} total rows. Head to the profiling tab to let AI analyze them.
              </p>
            </div>
            <GenerateReportButton datasets={datasets.map(d => ({ id: d.id, name: d.name, filePath: d.filePath }))} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Simple KPI Card Component for the scaffold
function KpiCard({ title, value, change, changeType, icon, chart }: { title: string, value: string, change: string, changeType: 'positive' | 'negative', icon: string, chart: string }) {
  const isPositive = changeType === 'positive';
  
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <div className="w-4 h-4 bg-blue-400 dark:bg-blue-500 rounded-sm"></div>
        </div>
      </div>
      <div className="mb-2">
        <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</span>
      </div>
      {change && (
        <div className="flex items-center text-sm">
          <span className={`font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {change}
          </span>
          <span className="text-slate-400 dark:text-slate-500 ml-2">vs last month</span>
        </div>
      )}
    </div>
  );
}
