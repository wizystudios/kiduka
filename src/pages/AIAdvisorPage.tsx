
import { AIChatAssistant } from '@/components/AIChatAssistant';

export const AIAdvisorPage = () => {
  return (
    <div className="p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mshauri wa AI</h2>
        <p className="text-gray-600">Uliza maswali yako kuhusu biashara yako</p>
      </div>
      <AIChatAssistant />
    </div>
  );
};
