import { useCallback, useEffect, useState } from 'react';
import { prefersReducedMotion } from '../hooks.js';
import Icon from './Icon.jsx';

// Dialog with open/close animations. children is a function that receives close(),
// so a form can close itself (with the animation) after saving.
export default function Modal({ title, onClose, children }) {
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    if (prefersReducedMotion()) return onClose();
    setClosing(true);
    setTimeout(onClose, 180);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <div className={`overlay ${closing ? 'closing' : ''}`} onMouseDown={close}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="Close"><Icon name="x" /></button>
        </div>
        {children(close)}
      </div>
    </div>
  );
}
