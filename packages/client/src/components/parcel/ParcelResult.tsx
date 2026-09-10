import { CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import type { RoutingResult } from '../../api/client';

interface Props {
  result: RoutingResult;
}

export function ParcelResult({ result }: Props) {
  const departmentColors: Record<string, string> = {
    Mail: 'bg-blue-100 text-blue-800 border-blue-200',
    Regular: 'bg-green-100 text-green-800 border-green-200',
    Heavy: 'bg-orange-100 text-orange-800 border-orange-200',
  };

  const deptClass = result.department
    ? departmentColors[result.department] || 'bg-gray-100 text-gray-800 border-gray-200'
    : 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {result.requiresApproval ? (
            <AlertTriangle className="text-amber-500" size={20} />
          ) : result.department ? (
            <CheckCircle className="text-green-500" size={20} />
          ) : (
            <XCircle className="text-red-500" size={20} />
          )}
          <h3 className="text-lg font-semibold">Routing Result</h3>
        </div>
        <span className="text-xs text-gray-400 font-mono">{result.parcelId}</span>
      </div>

      {/* Department Badge */}
      <div className="flex items-center gap-3">
        <ArrowRight size={16} className="text-gray-400" />
        {result.department ? (
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${deptClass}`}>
            {result.department} Department
          </span>
        ) : (
          <span className="text-gray-500 text-sm">No department assigned</span>
        )}
      </div>

      {/* Insurance Approval Warning */}
      {result.requiresApproval && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-sm font-medium text-amber-800">Insurance Approval Required</p>
            <p className="text-sm text-amber-700 mt-0.5">
              This parcel requires {result.approvalType} approval before it can be shipped.
            </p>
          </div>
        </div>
      )}

      {/* Matched Rules */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Matched Rules</h4>
        <div className="space-y-2">
          {result.matchedRules.map((rule) => (
            <div key={rule.ruleId} className="bg-gray-50 rounded-md p-3">
              <p className="text-sm font-medium text-gray-800">{rule.ruleName}</p>
              <p className="text-sm text-gray-600 mt-0.5">{rule.action.message}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Processed at {new Date(result.timestamp).toLocaleString()}
      </p>
    </div>
  );
}
