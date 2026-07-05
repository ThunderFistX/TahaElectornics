const Loading = ({ label = 'Loading...' }) => (
  <div className="flex min-h-40 items-center justify-center py-10 text-slate-500">
    <div className="flex items-center gap-3">
      <span className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-indigo-600 animate-spin" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  </div>
);

export default Loading;
