export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="text-gray-700 text-sm font-medium">正在分析页面内容...</p>
      <p className="text-gray-500 text-xs mt-2">这可能需要几秒钟</p>
    </div>
  );
}
