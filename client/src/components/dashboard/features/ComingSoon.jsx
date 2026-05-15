export default function ComingSoon({ feature }) {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{feature}</h1>
      <div className="card px-8 py-20 text-center space-y-2">
        <p className="font-medium text-slate-700">Coming soon</p>
        <p className="text-sm text-slate-400">{feature} is on the roadmap and will be available shortly.</p>
      </div>
    </div>
  );
}
