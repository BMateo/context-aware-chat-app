import React from 'react';
import { Activity, DollarSign, Zap, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTokenUsageContext } from '../../contexts/TokenUsageContext';
import styles from './TokenUsage.module.css';

export default function TokenUsage() {
  const { usage, loading, error } = useTokenUsageContext();

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const formatCost = (cost) => {
    if (cost < 0.01) {
      return '<$0.01';
    }
    return `$${cost.toFixed(4)}`;
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.floor(minutes)}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = Math.floor(minutes % 60);
      return `${hours}h ${mins}m`;
    }
  };

  if (loading && !usage) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Activity className={styles.icon} />
          <span className={styles.title}>API Usage</span>
        </div>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Activity className={styles.icon} />
          <span className={styles.title}>API Usage</span>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Activity className={styles.icon} />
          <span className={styles.title}>API Usage</span>
        </div>
        <div className={styles.loading}>No usage data</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Activity className={styles.icon} />
        <span className={styles.title}>API Usage</span>
      </div>
      
      <div className={styles.stats}>
        {/* Total Tokens */}
        <div className={styles.statItem}>
          <div className={styles.statIcon}>
            <Zap className={styles.statIconSvg} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{formatNumber(usage.total_tokens)}</div>
            <div className={styles.statLabel}>Total Tokens</div>
          </div>
        </div>

        {/* Estimated Cost */}
        <div className={styles.statItem}>
          <div className={styles.statIcon}>
            <DollarSign className={styles.statIconSvg} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{formatCost(usage.estimated_cost_usd)}</div>
            <div className={styles.statLabel}>Est. Cost</div>
          </div>
        </div>

        {/* Session Duration */}
        <div className={styles.statItem}>
          <div className={styles.statIcon}>
            <Clock className={styles.statIconSvg} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{formatDuration(usage.session_duration_minutes)}</div>
            <div className={styles.statLabel}>Session</div>
          </div>
        </div>
      </div>

      {/* API Call Breakdown */}
      <div className={styles.breakdown}>
        <div className={styles.breakdownItem}>
          <span className={styles.breakdownLabel}>Chat calls:</span>
          <span className={styles.breakdownValue}>{usage.chat_calls}</span>
        </div>
        <div className={styles.breakdownItem}>
          <span className={styles.breakdownLabel}>Embeddings:</span>
          <span className={styles.breakdownValue}>{usage.embedding_calls}</span>
        </div>
        <div className={styles.breakdownItem}>
          <span className={styles.breakdownLabel}>Input tokens:</span>
          <span className={styles.breakdownValue}>{formatNumber(usage.total_prompt_tokens)}</span>
        </div>
        <div className={styles.breakdownItem}>
          <span className={styles.breakdownLabel}>Output tokens:</span>
          <span className={styles.breakdownValue}>{formatNumber(usage.total_completion_tokens)}</span>
        </div>
      </div>
    </div>
  );
} 