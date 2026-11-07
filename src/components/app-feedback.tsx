'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AdminToasts } from '@/components/admin-toasts';

type Confirmation = { title: string; description: string; action?: string; destructive?: boolean };
type LeaveGuard = { check: () => Promise<boolean>; reset: () => void };
type Feedback = {
  confirmAction: (options: Confirmation) => Promise<boolean>;
  requestLeave: () => Promise<boolean>;
  cancelLeave: () => void;
  registerLeaveGuard: (guard: LeaveGuard) => () => void;
};
const FeedbackContext = createContext<Feedback | null>(null);

export function useFeedback() {
  const feedback = useContext(FeedbackContext);
  if (!feedback) throw new Error('AppFeedback is required');
  return feedback;
}

export function AppFeedback({ children }: { children: React.ReactNode }) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const resolve = useRef<((value: boolean) => void) | null>(null);
  const guard = useRef<LeaveGuard | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const settle = useCallback((value: boolean) => {
    resolve.current?.(value);
    resolve.current = null;
    setConfirmation(null);
  }, []);
  const confirmAction = useCallback(
    (options: Confirmation) =>
      new Promise<boolean>((done) => {
        resolve.current?.(false);
        resolve.current = done;
        setConfirmation(options);
      }),
    [],
  );
  const feedback = useMemo<Feedback>(
    () => ({
      confirmAction,
      requestLeave: () => guard.current?.check() ?? Promise.resolve(true),
      cancelLeave: () => guard.current?.reset(),
      registerLeaveGuard: (next) => {
        guard.current = next;
        return () => {
          if (guard.current === next) guard.current = null;
        };
      },
    }),
    [confirmAction],
  );
  useEffect(() => {
    if (confirmation && !dialog.current?.open) dialog.current?.showModal();
    else if (!confirmation && dialog.current?.open) dialog.current.close();
  }, [confirmation]);
  useEffect(
    () => () => {
      resolve.current?.(false);
    },
    [],
  );
  return (
    <FeedbackContext.Provider value={feedback}>
      {children}
      <AdminToasts />
      <dialog
        ref={dialog}
        className="app-confirm"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          event.preventDefault();
          settle(false);
        }}
      >
        <h2 id={titleId}>{confirmation?.title}</h2>
        <p id={descriptionId}>{confirmation?.description}</p>
        <div className="app-confirm-actions">
          <button type="button" className="btn btn-outline" autoFocus onClick={() => settle(false)}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${confirmation?.destructive ? 'btn-danger' : 'btn-gold'}`}
            onClick={() => settle(true)}
          >
            {confirmation?.action || 'Continue'}
          </button>
        </div>
      </dialog>
    </FeedbackContext.Provider>
  );
}
