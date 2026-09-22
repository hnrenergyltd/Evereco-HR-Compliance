import { evaluatePassword } from '../utils/passwordPolicy';
import './PasswordStrength.css';

/*
 * Strength meter plus an explicit checklist. The checklist matters more than
 * the bar: it tells the user exactly which rule is still unmet instead of
 * making them guess why a password is "weak".
 */
function PasswordStrength({ password }) {
  const { results, met, total, level, label } = evaluatePassword(password);

  if (!password) return null;

  return (
    <div className="password-strength">
      <div className="strength-header">
        <div className="strength-bar" role="presentation">
          <div className={`strength-fill strength-${level}`} style={{ width: `${(met / total) * 100}%` }} />
        </div>
        <span className={`strength-label strength-text-${level}`}>{label}</span>
      </div>

      <ul className="strength-rules">
        {results.map((rule) => (
          <li key={rule.id} className={rule.passed ? 'rule-met' : 'rule-unmet'}>
            <span aria-hidden="true">{rule.passed ? '✓' : '○'}</span> {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordStrength;
