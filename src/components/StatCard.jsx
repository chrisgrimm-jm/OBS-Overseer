import React from 'react';
import './StatCard.css';

/**
 * status: 'green' | 'yellow' | 'red' | 'blue' | 'neutral'
 */
export default function StatCard({
  title,
  value,
  unit,
  subtitle,
  status = 'neutral',
  large = false,
  mono = false,
}) {
  return (
    <div className={`stat-card stat-card--${status}${large ? ' stat-card--large' : ''}`}>
      <div className="stat-card__header">
        <span className="stat-card__title">{title}</span>
        <span className={`stat-card__dot stat-card__dot--${status}`} />
      </div>
      <div className="stat-card__body">
        <span className={`stat-card__value${mono ? ' stat-card__value--mono' : ''}`}>
          {value ?? '—'}
        </span>
        {unit && <span className="stat-card__unit">{unit}</span>}
      </div>
      {subtitle && (
        <div className="stat-card__subtitle">{subtitle}</div>
      )}
    </div>
  );
}
