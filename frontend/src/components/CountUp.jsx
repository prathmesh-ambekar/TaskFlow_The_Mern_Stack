import { useCountUp } from '../hooks.js';

export default function CountUp({ value, suffix = '' }) {
  return <>{useCountUp(value)}{suffix}</>;
}
