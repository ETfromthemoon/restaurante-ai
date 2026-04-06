import { useState, useCallback, useEffect } from 'react';

type Role = 'waiter' | 'cook' | 'manager';

function storageKey(role: Role) {
  return `onboarding_done_${role}`;
}

export function useOnboarding(role: Role | undefined) {
  const [isActive, setIsActive]   = useState(false);
  const [step, setStep]           = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [ready, setReady]         = useState(false);

  // Mark ready after first render so DOM has onboarding targets
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(t);
  }, []);

  const isCompleted = role
    ? localStorage.getItem(storageKey(role)) === 'true'
    : true;

  // Auto-start tour on first login
  useEffect(() => {
    if (ready && role && !isCompleted) {
      setStep(0);
      setIsActive(true);
    }
  }, [ready, role]);

  const startTour = useCallback(() => {
    setStep(0);
    setIsActive(true);
    setGuideOpen(false);
  }, []);

  const next = useCallback((total: number) => {
    setStep(prev => {
      if (prev >= total - 1) {
        setIsActive(false);
        if (role) localStorage.setItem(storageKey(role), 'true');
        return 0;
      }
      return prev + 1;
    });
  }, [role]);

  const prev = useCallback(() => {
    setStep(p => Math.max(0, p - 1));
  }, []);

  const skip = useCallback(() => {
    setIsActive(false);
    if (role) localStorage.setItem(storageKey(role), 'true');
    setStep(0);
  }, [role]);

  const openGuide  = useCallback(() => setGuideOpen(true), []);
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  return { isActive, step, guideOpen, startTour, next, prev, skip, openGuide, closeGuide };
}
